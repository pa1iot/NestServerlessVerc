import { APIGatewayProxyHandler } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'
import { Logger } from '../shared/utils'

const dynamodb = new DynamoDB.DocumentClient()
const tableName = `WebSocketConnections-${process.env.STAGE || 'dev'}`

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!

    Logger.info('WebSocket disconnection request', {
      connectionId
    })

    // Remove connection from DynamoDB
    await dynamodb.delete({
      TableName: tableName,
      Key: {
        connectionId
      }
    }).promise()

    Logger.info('WebSocket connection removed', {
      connectionId,
      tableName
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Disconnected successfully'
      })
    }
  } catch (error) {
    Logger.error('WebSocket disconnection failed', {
      connectionId: event.requestContext.connectionId,
      error
    })

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to disconnect'
      })
    }
  }
}