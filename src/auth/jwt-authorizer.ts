import { APIGatewayTokenAuthorizerHandler, APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda'
import * as jwt from 'jsonwebtoken'
import { Logger } from '../shared/utils'

interface JwtPayload {
  id: number
  phoneNumber: string
  role: string
  iat: number
  exp: number
}

// Generate IAM policy for API Gateway
const generatePolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, any>
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context: context || {},
  }
}

export const handler: APIGatewayTokenAuthorizerHandler = async (event: APIGatewayTokenAuthorizerEvent) => {
  try {
    Logger.info('JWT Authorizer invoked', {
      methodArn: event.methodArn,
      authorizationToken: event.authorizationToken ? 'Present' : 'Missing'
    })

    // Extract token from Authorization header
    const token = event.authorizationToken?.replace('Bearer ', '')
    
    if (!token) {
      Logger.warn('No authorization token provided')
      throw new Error('Unauthorized')
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      Logger.error('JWT_SECRET environment variable not set')
      throw new Error('Internal server error')
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload
    
    Logger.info('Token verified successfully', {
      userId: decoded.id,
      role: decoded.role,
      phoneNumber: decoded.phoneNumber
    })

    // Generate allow policy with user context
    return generatePolicy(
      decoded.id.toString(),
      'Allow',
      event.methodArn,
      {
        userId: decoded.id.toString(),
        phoneNumber: decoded.phoneNumber,
        role: decoded.role,
      }
    )
  } catch (error) {
    Logger.error('JWT Authorization failed', error)
    
    // For JWT verification errors, return deny policy
    if (error instanceof jwt.JsonWebTokenError) {
      Logger.warn('Invalid JWT token', { error: error.message })
    } else if (error instanceof jwt.TokenExpiredError) {
      Logger.warn('JWT token expired', { error: error.message })
    } else if (error instanceof jwt.NotBeforeError) {
      Logger.warn('JWT token not active', { error: error.message })
    }
    
    // Return deny policy
    throw new Error('Unauthorized')
  }
}