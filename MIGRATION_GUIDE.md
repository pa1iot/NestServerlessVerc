# GPS Tracking IoT - Migration Guide

This guide provides step-by-step instructions for migrating from the NestJS monolithic architecture to AWS serverless architecture.

## 📋 Pre-Migration Checklist

### 1. Environment Preparation

- [ ] AWS Account with appropriate permissions
- [ ] AWS CLI installed and configured
- [ ] Node.js 18+ installed
- [ ] Serverless Framework installed globally
- [ ] Database backup created
- [ ] Current application documented

### 2. Dependencies Assessment

- [ ] Review current NestJS dependencies
- [ ] Identify serverless-compatible alternatives
- [ ] Plan for database connection pooling
- [ ] Assess third-party service integrations

### 3. Infrastructure Planning

- [ ] Choose AWS regions for deployment
- [ ] Plan VPC configuration (if needed)
- [ ] Design DynamoDB tables for WebSocket management
- [ ] Plan SNS configuration for SMS
- [ ] Design API Gateway structure

## 🔄 Migration Steps

### Step 1: Project Setup

1. **Install Serverless Dependencies**
   ```bash
   npm install --save-dev serverless serverless-webpack serverless-offline serverless-dotenv-plugin
   npm install --save-dev @types/aws-lambda webpack ts-loader
   ```

2. **Create Serverless Configuration**
   - Copy `serverless.yml` from the migration files
   - Update service name, region, and stage as needed
   - Configure environment variables

3. **Setup Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your specific configuration
   ```

### Step 2: Database Migration

1. **Prepare Database Schema**
   ```bash
   # Generate Prisma client for serverless
   npx prisma generate
   
   # Run migrations if needed
   npx prisma migrate deploy
   ```

2. **Update Prisma Configuration**
   - Ensure connection pooling is configured
   - Update database URL for production environment
   - Test database connectivity

3. **Create DynamoDB Tables**
   ```bash
   # Deploy serverless configuration to create DynamoDB tables
   sls deploy --stage dev
   ```

### Step 3: Function Migration

#### Authentication Functions

1. **Migrate OTP Functionality**
   - [ ] `send-otp.ts` - Port from NestJS auth service
   - [ ] `verify-otp.ts` - Port OTP verification logic
   - [ ] `jwt-authorizer.ts` - Create Lambda authorizer

2. **Test Authentication**
   ```bash
   # Test OTP sending
   sls invoke -f sendOtp -d '{"phone":"+1234567890"}' --stage dev
   
   # Test OTP verification
   sls invoke -f verifyOtp -d '{"phone":"+1234567890","otp":"123456"}' --stage dev
   ```

#### Device Management Functions

1. **Migrate Device Operations**
   - [ ] `create-devices.ts` - Port bulk device creation
   - [ ] `track-device.ts` - Port GPS tracking logic
   - [ ] `get-tracking-history.ts` - Port history retrieval

2. **Test Device Functions**
   ```bash
   # Test device creation
   sls invoke -f createDevices -d '{"count":10}' --stage dev
   
   # Test tracking
   sls invoke -f trackDevice -d '{"deviceCode":"ABC123","latitude":40.7128,"longitude":-74.0060}' --stage dev
   ```

#### WebSocket Functions

1. **Migrate Real-time Features**
   - [ ] `connect.ts` - WebSocket connection handler
   - [ ] `disconnect.ts` - WebSocket disconnection handler
   - [ ] `join-room.ts` - Room joining logic
   - [ ] `default.ts` - Default message handler

2. **Test WebSocket Functionality**
   ```bash
   # Test WebSocket connection (use WebSocket client)
   wscat -c wss://your-websocket-url.execute-api.region.amazonaws.com/stage
   ```

### Step 4: Service Integration

1. **SMS Service Migration**
   - [ ] Preserve existing HTTP SMS API integration
   - [ ] Ensure SMS service configuration is consistent
   - [ ] Test SMS delivery with existing provider

2. **External API Integration**
   - [ ] Review third-party API calls
   - [ ] Ensure compatibility with Lambda environment
   - [ ] Update timeout configurations

### Step 5: Frontend Updates

1. **API Endpoint Updates**
   ```javascript
   // Update API base URL
   const API_BASE_URL = 'https://your-api-id.execute-api.region.amazonaws.com/stage';
   
   // Update WebSocket URL
   const WS_URL = 'wss://your-ws-id.execute-api.region.amazonaws.com/stage';
   ```

2. **Authentication Flow Updates**
   - Update JWT token handling
   - Modify API request headers
   - Test authentication flow

3. **WebSocket Connection Updates**
   - Update WebSocket connection logic
   - Modify message handling
   - Test real-time features

### Step 6: Testing and Validation

1. **Unit Testing**
   ```bash
   npm test
   ```

2. **Integration Testing**
   ```bash
   npm run test:e2e
   ```

3. **Load Testing**
   - Test Lambda concurrency limits
   - Validate database connection pooling
   - Monitor CloudWatch metrics

4. **End-to-End Testing**
   - Test complete user flows
   - Validate real-time tracking
   - Test SMS delivery
   - Verify data consistency

## 🔧 Configuration Updates

### Environment Variables

**Before (NestJS):**
```env
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=secret
SMS_API_KEY=key
```

**After (Serverless):**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=secret
SMS_API_KEY=key
AWS_REGION=us-east-1
STAGE=dev
WEBSOCKET_ENDPOINT=wss://...
```

### Database Configuration

**Before (NestJS):**
```typescript
// app.module.ts
PrismaModule.forRoot({
  isGlobal: true,
})
```

**After (Serverless):**
```typescript
// prisma-client.ts
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
});
```

### API Structure

**Before (NestJS):**
```
POST /auth/send-otp
POST /auth/verify-otp
POST /devices/create
GET /devices/:code/history
POST /devices/track
```

**After (Serverless):**
```
POST /auth/send-otp
POST /auth/verify-otp
POST /devices/create
GET /devices/{deviceCode}/history
POST /devices/track
```

## 🚨 Common Migration Issues

### 1. Database Connection Issues

**Problem:** Lambda functions timing out on database connections

**Solution:**
- Implement connection pooling
- Increase Lambda timeout
- Use RDS Proxy for connection management

```typescript
// Use connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=1&pool_timeout=20'
    }
  }
});
```

### 2. Cold Start Performance

**Problem:** Slow response times due to Lambda cold starts

**Solution:**
- Implement warmup functions
- Use provisioned concurrency for critical functions
- Optimize package size

```typescript
// Warmup detection
if (event.source === 'serverless-plugin-warmup') {
  return { statusCode: 200, body: 'Warmed up' };
}
```

### 3. WebSocket Connection Management

**Problem:** WebSocket connections not properly managed

**Solution:**
- Use DynamoDB for connection tracking
- Implement proper cleanup on disconnect
- Handle connection timeouts

### 4. File Upload Handling

**Problem:** Large file uploads not supported in Lambda

**Solution:**
- Use S3 pre-signed URLs for direct uploads
- Implement multipart upload for large files
- Use API Gateway binary media types

### 5. Environment Variable Limits

**Problem:** Lambda environment variable size limits

**Solution:**
- Use AWS Systems Manager Parameter Store
- Implement configuration service
- Use AWS Secrets Manager for sensitive data

## 📊 Performance Monitoring

### CloudWatch Metrics to Monitor

1. **Function Metrics**
   - Invocations
   - Duration
   - Errors
   - Throttles

2. **API Gateway Metrics**
   - Request count
   - Latency
   - Error rate
   - Cache hit rate

3. **Database Metrics**
   - Connection count
   - Query duration
   - Error rate

### Setting Up Alarms

```yaml
# serverless.yml
resources:
  Resources:
    HighErrorRateAlarm:
      Type: AWS::CloudWatch::Alarm
      Properties:
        AlarmName: ${self:service}-${self:provider.stage}-high-error-rate
        MetricName: Errors
        Namespace: AWS/Lambda
        Statistic: Sum
        Period: 300
        EvaluationPeriods: 2
        Threshold: 10
        ComparisonOperator: GreaterThanThreshold
```

## 🔄 Rollback Plan

### Preparation

1. **Backup Current State**
   - Database backup
   - Configuration backup
   - Code repository tag

2. **Rollback Triggers**
   - High error rates
   - Performance degradation
   - Data inconsistency
   - Critical functionality failure

### Rollback Steps

1. **Immediate Actions**
   ```bash
   # Remove serverless deployment
   sls remove --stage production
   
   # Restore previous NestJS deployment
   # (depends on your deployment strategy)
   ```

2. **Database Rollback**
   ```bash
   # Restore database from backup
   pg_restore -d database_name backup_file.sql
   ```

3. **Frontend Rollback**
   - Revert API endpoint changes
   - Restore previous WebSocket URLs
   - Deploy previous frontend version

## ✅ Post-Migration Checklist

### Functionality Verification

- [ ] User authentication works
- [ ] Device creation functions properly
- [ ] GPS tracking data is received
- [ ] Real-time updates work via WebSocket
- [ ] SMS notifications are delivered
- [ ] Historical data retrieval works
- [ ] All API endpoints respond correctly

### Performance Verification

- [ ] Response times are acceptable
- [ ] Database connections are stable
- [ ] WebSocket connections are reliable
- [ ] Error rates are within acceptable limits
- [ ] Monitoring and alerting are configured

### Security Verification

- [ ] JWT authentication works correctly
- [ ] API endpoints are properly secured
- [ ] Environment variables are secure
- [ ] Database access is restricted
- [ ] AWS IAM roles follow least privilege

### Documentation Updates

- [ ] API documentation updated
- [ ] Deployment procedures documented
- [ ] Monitoring procedures documented
- [ ] Troubleshooting guide updated
- [ ] Team training completed

## 📞 Support and Resources

### Documentation

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Prisma Documentation](https://www.prisma.io/docs/)

### Troubleshooting

1. **Check CloudWatch Logs**
   ```bash
   sls logs -f functionName --stage dev --tail
   ```

2. **Monitor Metrics**
   - Use CloudWatch dashboards
   - Set up custom metrics
   - Monitor business metrics

3. **Debug Locally**
   ```bash
   sls offline --stage dev
   ```

### Getting Help

- AWS Support (if you have a support plan)
- Serverless Framework Community
- Stack Overflow
- AWS Forums
- Internal development team

This migration guide should be updated as you encounter specific issues or develop better practices during the migration process.