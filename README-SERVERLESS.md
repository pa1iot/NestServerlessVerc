# GPS Tracking IoT - Serverless Migration

This document provides comprehensive guidance for the serverless migration of the GPS Tracking IoT application from NestJS to AWS Lambda using the Serverless Framework.

## 🏗️ Architecture Overview

The application has been migrated to a serverless architecture using:

- **AWS Lambda** - Function execution
- **API Gateway** - REST API endpoints
- **WebSocket API** - Real-time tracking
- **DynamoDB** - WebSocket connection management
- **HTTP SMS API** - SMS notifications via third-party service
- **RDS/PostgreSQL** - Main database (via Prisma)
- **Serverless Framework** - Infrastructure as Code

## 📁 Project Structure

```
├── serverless/
│   ├── functions/
│   │   ├── auth/
│   │   │   ├── send-otp.ts
│   │   │   ├── verify-otp.ts
│   │   │   └── jwt-authorizer.ts
│   │   ├── devices/
│   │   │   ├── create-devices.ts
│   │   │   ├── get-tracking-history.ts
│   │   │   └── track-device.ts
│   │   └── websocket/
│   │       ├── connect.ts
│   │       ├── disconnect.ts
│   │       ├── join-room.ts
│   │       └── default.ts
│   ├── shared/
│   │   ├── prisma-client.ts
│   │   ├── utils.ts
│   │   └── sms.service.ts
│   └── webpack.config.js
├── serverless.yml
├── .env.example
├── deploy.sh
└── README-SERVERLESS.md
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **AWS CLI** configured with appropriate credentials
3. **Serverless Framework** installed globally:
   ```bash
   npm install -g serverless
   ```
4. **PostgreSQL database** (RDS recommended for production)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd GPS-Tracking-IOT
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Deploy to AWS:**
   ```bash
   npm run deploy:dev
   # or use the deployment script
   ./deploy.sh --stage dev
   ```

## ⚙️ Configuration

### Environment Variables

Configure the following in your `.env` file:

```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/database"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# AWS
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="123456789012"

# SMS (SNS)
SMS_API_KEY="your-sms-api-key"

# Stage
STAGE="dev"
```

### AWS Permissions

Ensure your AWS credentials have the following permissions:

- Lambda (create, update, invoke functions)
- API Gateway (create, manage APIs)
- DynamoDB (create, read, write tables)
- SNS (publish messages)
- CloudFormation (create, update stacks)
- IAM (create, manage roles)
- CloudWatch (create, manage logs)

## 📡 API Endpoints

### Authentication
- `POST /auth/send-otp` - Send OTP to phone number
- `POST /auth/verify-otp` - Verify OTP and get JWT token

### Device Management
- `POST /devices/create` - Create bulk devices (Admin only)
- `POST /devices/track` - Submit GPS tracking data
- `GET /devices/{deviceCode}/history` - Get tracking history

### WebSocket Events
- `$connect` - WebSocket connection
- `$disconnect` - WebSocket disconnection
- `joinRoom` - Join device tracking room
- `$default` - Default message handler

## 🔄 Real-time Tracking

The application uses WebSocket API for real-time GPS tracking:

1. **Connect** to WebSocket endpoint
2. **Join room** by sending device code
3. **Receive** real-time location updates
4. **Disconnect** when done

### WebSocket URL Format
```
wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}
```

## 🛠️ Development

### Local Development

1. **Start serverless offline:**
   ```bash
   npm run start:serverless
   ```

2. **Test functions locally:**
   ```bash
   npm run invoke -- --function sendOtp --data '{"phone":"+1234567890"}'
   ```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## 🚀 Deployment

### Using Deployment Script

```bash
# Deploy to development
./deploy.sh --stage dev

# Deploy to staging
./deploy.sh --stage staging --region us-west-2

# Deploy to production
./deploy.sh --stage prod --region us-east-1

# Deploy with verbose output
./deploy.sh --stage dev --verbose

# Skip tests and build
./deploy.sh --stage dev --skip-tests --skip-build
```

### Using NPM Scripts

```bash
# Deploy to specific stages
npm run deploy:dev
npm run deploy:staging
npm run deploy:prod

# Get deployment info
npm run serverless:info

# View function logs
npm run logs -- sendOtp

# Remove deployment
npm run remove
```

### Manual Deployment

```bash
# Package functions
npm run build:serverless

# Deploy with custom options
sls deploy --stage production --region eu-west-1 --verbose

# Deploy single function
sls deploy function --function sendOtp --stage dev
```

## 📊 Monitoring

### CloudWatch Logs

```bash
# View function logs
sls logs --function sendOtp --stage dev --tail

# View logs for specific time range
sls logs --function trackDevice --stage prod --startTime 1h
```

### Metrics

Monitor the following metrics in CloudWatch:

- **Invocations** - Function execution count
- **Duration** - Function execution time
- **Errors** - Function error count
- **Throttles** - Function throttling events
- **Dead Letter Queue** - Failed message count

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Timeout**
   - Increase Lambda timeout in `serverless.yml`
   - Check VPC configuration if using RDS in VPC
   - Verify database connection string

2. **WebSocket Connection Issues**
   - Check API Gateway WebSocket configuration
   - Verify DynamoDB table permissions
   - Check connection management logic

3. **SMS Delivery Failures**
   - Verify SNS permissions
   - Check phone number format
   - Verify SMS sender ID configuration

4. **JWT Authorization Errors**
   - Check JWT secret configuration
   - Verify token expiration settings
   - Check authorizer function logs

### Debug Commands

```bash
# Check deployment status
sls info --stage dev

# Invoke function with test data
sls invoke --function sendOtp --data '{"phone":"+1234567890"}' --stage dev

# View function configuration
sls invoke --function sendOtp --stage dev --log

# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name gps-tracking-iot-dev
```

## 🔐 Security

### Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use AWS Systems Manager Parameter Store for sensitive data
   - Rotate secrets regularly

2. **IAM Permissions**
   - Follow principle of least privilege
   - Use separate roles for different functions
   - Regularly audit permissions

3. **API Security**
   - Enable API Gateway throttling
   - Use JWT authorization for protected endpoints
   - Implement rate limiting

4. **Database Security**
   - Use VPC for RDS instances
   - Enable encryption at rest and in transit
   - Regular security updates

## 📈 Performance Optimization

### Lambda Optimization

1. **Memory Configuration**
   - Monitor memory usage in CloudWatch
   - Adjust memory allocation based on usage patterns
   - Consider provisioned concurrency for critical functions

2. **Cold Start Reduction**
   - Implement warmup functions
   - Use connection pooling for database
   - Minimize package size

3. **Database Optimization**
   - Use connection pooling
   - Implement proper indexing
   - Consider read replicas for read-heavy workloads

## 🔄 Migration from NestJS

If migrating from the original NestJS application:

1. **Database Migration**
   ```bash
   npx prisma migrate deploy
   ```

2. **Data Migration**
   - Export data from existing database
   - Import to new database
   - Verify data integrity

3. **Frontend Updates**
   - Update API endpoints
   - Update WebSocket connection URLs
   - Test all functionality

## 📞 Support

For issues and questions:

1. Check the troubleshooting section
2. Review CloudWatch logs
3. Check AWS service status
4. Contact the development team

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.