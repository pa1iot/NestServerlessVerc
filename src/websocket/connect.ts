import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { Logger } from '../shared/utils'

const dynamodb = new DynamoDB.DocumentClient()
const tableName = `WebSocketConnections-${process.env.STAGE || 'dev'}`

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!
    const timestamp = Date.now()
    
    // TTL for 24 hours (86400 seconds)
    const ttl = Math.floor(timestamp / 1000) + 86400

    Logger.info('WebSocket connection request', {
      connectionId,
      sourceIp: event.requestContext.identity?.sourceIp,
      userAgent: event.requestContext.identity?.userAgent
    })

    // Store connection in DynamoDB
    await dynamodb.put({
      TableName: tableName,
      Item: {
        connectionId,
        timestamp,
        ttl,
        status: 'connected'
      }
    }).promise()

    Logger.info('WebSocket connection stored', {
      connectionId,
      tableName
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Connected successfully',
        connectionId
      })
    }
  } catch (error) {
    Logger.error('WebSocket connection failed', {
      connectionId: event.requestContext.connectionId,
      error
    })

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to connect'
      })
    }
  }
}