# GPS Tracking IoT - Serverless Migration Plan

## Executive Summary

This document outlines a comprehensive migration strategy for the GPS Tracking IoT application from a traditional NestJS monolith to a modern serverless architecture. The migration will leverage AWS services to achieve better scalability, cost-efficiency, and maintainability.

## Current Architecture Analysis

### Application Components
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with SMS OTP
- **Real-time**: WebSocket Gateway for live tracking
- **API**: REST endpoints for device management
- **External Services**: SMS service, QR code generation

### Key Features
- User management with role-based access
- Device generation and assignment
- Real-time GPS tracking with WebSocket
- Device sharing between users
- Historical tracking data
- SMS OTP authentication

## Target Serverless Architecture

### 1. API Layer Migration

#### AWS Lambda Functions
Replace NestJS controllers with individual Lambda functions:

```
├── auth/
│   ├── send-otp.ts          # POST /api/auth/send-otp
│   ├── verify-otp.ts        # POST /api/auth/verify-otp
│   ├── register.ts          # POST /api/auth/register
│   └── profile.ts           # GET/PUT /api/auth/profile
├── devices/
│   ├── create-devices.ts    # POST /api/devices/generate
│   ├── assign-device.ts     # POST /api/devices/assign
│   ├── track-device.ts      # POST /api/devices/tracking/:code/:sim
│   ├── get-devices.ts       # GET /api/devices
│   ├── device-history.ts    # GET /api/devices/tracking/:code/history
│   └── share-device.ts      # POST /api/devices/share
└── shared/
    ├── prisma-client.ts     # Shared Prisma client
    ├── auth-middleware.ts   # JWT validation
    └── utils.ts             # Common utilities
```

#### API Gateway Configuration
```yaml
# serverless.yml
service: gps-tracking-api

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    DATABASE_URL: ${env:DATABASE_URL}
    JWT_SECRET: ${env:JWT_SECRET}
    SMS_API_KEY: ${env:SMS_API_KEY}

functions:
  # Auth Functions
  sendOtp:
    handler: src/auth/send-otp.handler
    events:
      - http:
          path: auth/send-otp
          method: post
          cors: true
  
  verifyOtp:
    handler: src/auth/verify-otp.handler
    events:
      - http:
          path: auth/verify-otp
          method: post
          cors: true
  
  # Device Functions
  createDevices:
    handler: src/devices/create-devices.handler
    events:
      - http:
          path: devices/generate
          method: post
          cors: true
          authorizer:
            name: jwtAuthorizer
            type: request
  
  trackDevice:
    handler: src/devices/track-device.handler
    events:
      - http:
          path: devices/tracking/{code}/{iotSimNumber}
          method: post
          cors: true
```

### 2. Database Migration Strategy

#### Option A: Amazon RDS Serverless v2 (Recommended)
```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-1.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Connection pooling for Lambda
// DATABASE_URL="postgresql://user:pass@cluster.region.rds.amazonaws.com:5432/gpsdb?connection_limit=1&pool_timeout=0"
```

#### Database Connection Management
```typescript
// src/shared/prisma-client.ts
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

declare global {
  var __prisma: PrismaClient | undefined
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient()
  }
  prisma = global.__prisma
}

export { prisma }
```

#### Option B: Amazon Aurora Serverless v2 with Data API
```typescript
// Alternative for true serverless database
import { RDSDataService } from 'aws-sdk'

const rdsData = new RDSDataService()

const executeStatement = async (sql: string, parameters: any[] = []) => {
  const params = {
    resourceArn: process.env.CLUSTER_ARN!,
    secretArn: process.env.SECRET_ARN!,
    database: process.env.DATABASE_NAME!,
    sql,
    parameters
  }
  
  return await rdsData.executeStatement(params).promise()
}
```

### 3. Real-time Communication Migration

#### WebSocket API Gateway
```typescript
// src/websocket/connection-handler.ts
import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'

const dynamodb = new DynamoDB.DocumentClient()

export const connectHandler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!
  
  // Store connection in DynamoDB
  await dynamodb.put({
    TableName: 'WebSocketConnections',
    Item: {
      connectionId,
      timestamp: Date.now()
    }
  }).promise()
  
  return { statusCode: 200, body: 'Connected' }
}

export const disconnectHandler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!
  
  // Remove connection from DynamoDB
  await dynamodb.delete({
    TableName: 'WebSocketConnections',
    Key: { connectionId }
  }).promise()
  
  return { statusCode: 200, body: 'Disconnected' }
}

export const joinRoomHandler: APIGatewayProxyHandler = async (event) => {
  const connectionId = event.requestContext.connectionId!
  const { deviceCode } = JSON.parse(event.body || '{}')
  
  // Update connection with device room
  await dynamodb.update({
    TableName: 'WebSocketConnections',
    Key: { connectionId },
    UpdateExpression: 'SET deviceCode = :deviceCode',
    ExpressionAttributeValues: {
      ':deviceCode': deviceCode
    }
  }).promise()
  
  return { statusCode: 200, body: 'Joined room' }
}
```

#### Real-time Location Broadcasting
```typescript
// src/devices/track-device.ts
import { APIGatewayManagementApi, DynamoDB } from 'aws-sdk'

const apiGateway = new APIGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ENDPOINT
})
const dynamodb = new DynamoDB.DocumentClient()

export const handler = async (event: any) => {
  const { code, iotSimNumber } = event.pathParameters
  const trackingData = JSON.parse(event.body)
  
  // Save to database
  await prisma.tracking.create({
    data: {
      deviceCode: code,
      iotSimNumber,
      ...trackingData
    }
  })
  
  // Broadcast to connected clients
  const connections = await dynamodb.scan({
    TableName: 'WebSocketConnections',
    FilterExpression: 'deviceCode = :deviceCode',
    ExpressionAttributeValues: {
      ':deviceCode': code
    }
  }).promise()
  
  const broadcastPromises = connections.Items?.map(async (connection) => {
    try {
      await apiGateway.postToConnection({
        ConnectionId: connection.connectionId,
        Data: JSON.stringify({
          type: 'location-update',
          deviceCode: code,
          data: trackingData
        })
      }).promise()
    } catch (error) {
      // Connection is stale, remove it
      if (error.statusCode === 410) {
        await dynamodb.delete({
          TableName: 'WebSocketConnections',
          Key: { connectionId: connection.connectionId }
        }).promise()
      }
    }
  })
  
  await Promise.all(broadcastPromises || [])
  
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  }
}
```

### 4. Authentication & Authorization

#### JWT Authorizer Lambda
```typescript
// src/auth/jwt-authorizer.ts
import { APIGatewayAuthorizerHandler } from 'aws-lambda'
import * as jwt from 'jsonwebtoken'

export const handler: APIGatewayAuthorizerHandler = async (event) => {
  try {
    const token = event.authorizationToken?.replace('Bearer ', '')
    
    if (!token) {
      throw new Error('No token provided')
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    return {
      principalId: decoded.id,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        userId: decoded.id,
        role: decoded.role
      }
    }
  } catch (error) {
    throw new Error('Unauthorized')
  }
}
```

### 5. External Services Integration

#### SMS Service Migration
```typescript
// src/services/sms.service.ts
import axios from 'axios'

export class SmsService {
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    const message = `Your GPS Tracker verification code is: ${otp}. Valid for 5 minutes.`
    
    // Preserve existing HTTP SMS API integration
    await axios.post(process.env.SMS_API_ENDPOINT!, {
      phone: phoneNumber,
      message: message,
      apiKey: process.env.SMS_API_KEY
    })
  }
  
  formatPhoneNumber(phone: string): string {
    // Maintain third-party SMS service configuration
    return phone.replace(/\D/g, '').replace(/^0/, '+91')
  }
  
  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    return phoneRegex.test(phone)
  }
}
```

### 6. Infrastructure as Code

#### Serverless Framework Configuration
```yaml
# serverless.yml
service: gps-tracking-serverless

provider:
  name: aws
  runtime: nodejs18.x
  region: ${opt:region, 'us-east-1'}
  stage: ${opt:stage, 'dev'}
  environment:
    DATABASE_URL: ${env:DATABASE_URL}
    JWT_SECRET: ${env:JWT_SECRET}
    WEBSOCKET_ENDPOINT: ${env:WEBSOCKET_ENDPOINT}
  
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:PutItem
            - dynamodb:GetItem
            - dynamodb:UpdateItem
            - dynamodb:DeleteItem
            - dynamodb:Scan
            - dynamodb:Query
          Resource:
            - arn:aws:dynamodb:${self:provider.region}:*:table/WebSocketConnections
        - Effect: Allow
          Action:
            - sns:Publish
          Resource: "*"
        - Effect: Allow
          Action:
            - execute-api:ManageConnections
          Resource: "*"

resources:
  Resources:
    WebSocketConnectionsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: WebSocketConnections
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: connectionId
            AttributeType: S
        KeySchema:
          - AttributeName: connectionId
            KeyType: HASH
        TimeToLiveSpecification:
          AttributeName: ttl
          Enabled: true
    
    WebSocketApi:
      Type: AWS::ApiGatewayV2::Api
      Properties:
        Name: gps-tracking-websocket
        ProtocolType: WEBSOCKET
        RouteSelectionExpression: "$request.body.action"

plugins:
  - serverless-webpack
  - serverless-offline
  - serverless-dotenv-plugin

custom:
  webpack:
    webpackConfig: webpack.config.js
    includeModules: true
```

#### Terraform Alternative
```hcl
# infrastructure/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# RDS Serverless Cluster
resource "aws_rds_cluster" "gps_tracking" {
  cluster_identifier      = "gps-tracking-${var.environment}"
  engine                 = "aurora-postgresql"
  engine_mode           = "serverless"
  database_name         = "gpsdb"
  master_username       = var.db_username
  master_password       = var.db_password
  backup_retention_period = 7
  preferred_backup_window = "07:00-09:00"
  
  scaling_configuration {
    auto_pause               = true
    max_capacity            = 2
    min_capacity            = 2
    seconds_until_auto_pause = 300
  }
  
  skip_final_snapshot = true
}

# DynamoDB for WebSocket connections
resource "aws_dynamodb_table" "websocket_connections" {
  name           = "WebSocketConnections-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "connectionId"
  
  attribute {
    name = "connectionId"
    type = "S"
  }
  
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
```

## Migration Strategy

### Phase 1: Infrastructure Setup (Week 1-2)
1. Set up AWS RDS Serverless cluster
2. Configure DynamoDB tables
3. Set up API Gateway and WebSocket API
4. Configure IAM roles and policies
5. Set up CI/CD pipeline

### Phase 2: Core API Migration (Week 3-4)
1. Migrate authentication endpoints
2. Migrate device management endpoints
3. Set up JWT authorizer
4. Configure environment variables
5. Test API endpoints

### Phase 3: Real-time Features (Week 5-6)
1. Implement WebSocket handlers
2. Migrate tracking functionality
3. Set up real-time broadcasting
4. Test WebSocket connections

### Phase 4: Testing & Optimization (Week 7-8)
1. Load testing
2. Performance optimization
3. Security audit
4. Documentation update
5. Production deployment

## Cost Optimization

### Lambda Pricing
- **Requests**: $0.20 per 1M requests
- **Duration**: $0.0000166667 per GB-second
- **Estimated monthly cost**: $50-200 for moderate traffic

### Database Costs
- **RDS Serverless**: $0.06 per ACU-hour
- **DynamoDB**: $0.25 per million read/write requests
- **Estimated monthly cost**: $100-300

### API Gateway
- **REST API**: $3.50 per million requests
- **WebSocket**: $1.00 per million messages
- **Estimated monthly cost**: $20-100

## Security Considerations

1. **API Security**
   - JWT token validation
   - Rate limiting with API Gateway
   - Input validation and sanitization
   - CORS configuration

2. **Database Security**
   - VPC isolation
   - Encryption at rest and in transit
   - IAM database authentication
   - Connection pooling

3. **WebSocket Security**
   - Connection authentication
   - Message validation
   - Rate limiting
   - Connection cleanup

## Monitoring & Observability

### CloudWatch Integration
```typescript
// src/shared/logger.ts
import { CloudWatchLogs } from 'aws-sdk'

const cloudWatchLogs = new CloudWatchLogs()

export class Logger {
  static async logError(error: Error, context: any) {
    console.error('Error:', error.message, context)
    
    // Send to CloudWatch for alerting
    await cloudWatchLogs.putLogEvents({
      logGroupName: '/aws/lambda/gps-tracking',
      logStreamName: new Date().toISOString().split('T')[0],
      logEvents: [{
        timestamp: Date.now(),
        message: JSON.stringify({
          level: 'ERROR',
          message: error.message,
          stack: error.stack,
          context
        })
      }]
    }).promise()
  }
}
```

### X-Ray Tracing
```typescript
// src/shared/tracing.ts
import AWSXRay from 'aws-xray-sdk-core'
import AWS from 'aws-sdk'

const awsWrapped = AWSXRay.captureAWS(AWS)

export { awsWrapped as AWS }
```

## Performance Optimization

### Connection Pooling
```typescript
// src/shared/db-pool.ts
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1, // Lambda limitation
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export { pool }
```

### Lambda Optimization
```typescript
// Warm-up function
export const warmup = async () => {
  if (event.source === 'serverless-plugin-warmup') {
    return 'Lambda is warm!'
  }
  // Regular function logic
}
```

## Rollback Strategy

1. **Blue-Green Deployment**
   - Maintain current infrastructure during migration
   - Use Route 53 for traffic switching
   - Quick rollback capability

2. **Database Migration**
   - Use read replicas for testing
   - Implement data synchronization
   - Gradual traffic migration

3. **Feature Flags**
   - Implement feature toggles
   - Gradual feature rollout
   - Quick disable capability

## Conclusion

This serverless migration will provide:
- **99.9% availability** with multi-AZ deployment
- **Auto-scaling** based on demand
- **Cost reduction** of 40-60% for variable workloads
- **Improved performance** with global edge locations
- **Enhanced security** with AWS managed services
- **Simplified operations** with managed infrastructure

The migration timeline is 8 weeks with minimal downtime during the final cutover phase.