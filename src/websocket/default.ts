import { APIGatewayProxyHandler } from 'aws-lambda'
import { Logger } from '../shared/utils'

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId!
    const routeKey = event.requestContext.routeKey
    
    Logger.info('WebSocket default handler', {
      connectionId,
      routeKey,
      body: event.body
    })

    // Handle unknown routes or messages
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Message received',
        routeKey
      })
    }
  } catch (error) {
    Logger.error('WebSocket default handler failed', {
      connectionId: event.requestContext.connectionId,
      error
    })

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error'
      })
    }
  }
}