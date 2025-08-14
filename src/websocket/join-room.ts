import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { Logger, parseBody } from '../shared/utils'

const dynamodb = new DynamoDB.DocumentClient()
const tableName = `WebSocketConnections-${process.env.STAGE || 'dev'}`

interface JoinRoomRequest {
  deviceCode: string
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!
    
    Logger.info('WebSocket join room request', {
      connectionId,
      body: event.body
    })

    const body = parseBody(event.body) as JoinRoomRequest
    
    if (!body.deviceCode) {
      Logger.warn('Missing deviceCode in join room request', {
        connectionId
      })
      
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Device code is required'
        })
      }
    }

    const { deviceCode } = body
    const timestamp = Date.now()
    
    // TTL for 24 hours (86400 seconds)
    const ttl = Math.floor(timestamp / 1000) + 86400

    // Update connection with device room information
    await dynamodb.update({
      TableName: tableName,
      Key: {
        connectionId
      },
      UpdateExpression: 'SET deviceCode = :deviceCode, joinedAt = :timestamp, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#ttl': 'ttl'
      },
      ExpressionAttributeValues: {
        ':deviceCode': deviceCode,
        ':timestamp': timestamp,
        ':ttl': ttl
      }
    }).promise()

    Logger.info('WebSocket connection joined device room', {
      connectionId,
      deviceCode,
      tableName
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Joined room for device: ${deviceCode}`,
        deviceCode
      })
    }
  } catch (error) {
    Logger.error('WebSocket join room failed', {
      connectionId: event.requestContext.connectionId,
      error
    })

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to join room'
      })
    }
  }
}