import { APIGatewayProxyHandler } from 'aws-lambda'
import { ApiGatewayManagementApi, DynamoDB } from 'aws-sdk'
import { prisma } from '../shared/prisma-client'
import {
  successResponse,
  errorResponse,
  parseBody,
  validateRequiredFields,
  Logger,
  isWarmupRequest,
  handleWarmup
} from '../shared/utils'

interface TrackDeviceRequest {
  lat: string
  long: string
  level?: string
  altitude?: string
  speed?: string
  compress?: string
  weight?: string
  noOfSatellites?: string
}

interface LocationUpdate {
  type: string
  deviceCode: string
  iotSimNumber: string
  data: {
    lat: string
    long: string
    level?: string
    altitude?: string
    speed?: string
    compress?: string
    weight?: string
    noOfSatellites?: string
    trackedAt: string
  }
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Handle warmup requests
    if (isWarmupRequest(event)) {
      return handleWarmup()
    }

    Logger.info('Track device request received', {
      pathParameters: event.pathParameters
    })

    const { code, iotSimNumber } = event.pathParameters || {}
    
    if (!code || !iotSimNumber) {
      return errorResponse('Device code and IoT SIM number are required', 400)
    }

    const body = parseBody(event.body) as TrackDeviceRequest
    
    // Validate required fields
    const validationError = validateRequiredFields(body, ['lat', 'long'])
    if (validationError) {
      return errorResponse(validationError, 400)
    }

    const {
      lat,
      long,
      level,
      altitude,
      speed,
      compress,
      weight,
      noOfSatellites
    } = body

    Logger.info('Processing tracking data', {
      deviceCode: code,
      iotSimNumber,
      lat: lat.substring(0, 8) + '...', // Partial coordinates for privacy
      long: long.substring(0, 8) + '...'
    })

    // Verify device exists and get assigned user
    const device = await prisma.device.findUnique({
      where: { code },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!device) {
      Logger.warn('Device not found', { deviceCode: code })
      return errorResponse('Device not found', 404)
    }

    // Update device IoT SIM number if different
    if (device.iotSimNumber !== iotSimNumber) {
      await prisma.device.update({
        where: { code },
        data: { iotSimNumber }
      })
      Logger.info('Updated device IoT SIM number', {
        deviceCode: code,
        newIotSimNumber: iotSimNumber
      })
    }

    const trackedAt = new Date()

    // Save tracking data to database
    const trackingRecord = await prisma.tracking.create({
      data: {
        deviceCode: code,
        iotSimNumber,
        lat,
        long,
        level,
        altitude,
        speed,
        compress,
        weight,
        noOfSatellites,
        trackedAt,
        userId: device.assignedTo
      }
    })

    Logger.info('Tracking data saved', {
      trackingId: trackingRecord.id,
      deviceCode: code,
      userId: device.assignedTo
    })

    // Broadcast to WebSocket connections if endpoint is configured
    const websocketEndpoint = process.env.WEBSOCKET_ENDPOINT
    if (websocketEndpoint) {
      await broadcastLocationUpdate(code, iotSimNumber, {
        lat,
        long,
        level,
        altitude,
        speed,
        compress,
        weight,
        noOfSatellites,
        trackedAt: trackedAt.toISOString()
      })
    }

    return successResponse(
      {
        trackingId: trackingRecord.id,
        deviceCode: code,
        trackedAt: trackedAt.toISOString()
      },
      'Location tracked successfully'
    )
  } catch (error) {
    Logger.error('Track device failed', error)
    
    if (error instanceof Error) {
      return errorResponse(error.message, 500)
    }
    
    return errorResponse('Failed to track device', 500)
  }
}

/**
 * Broadcast location update to WebSocket connections
 */
async function broadcastLocationUpdate(
  deviceCode: string,
  iotSimNumber: string,
  locationData: any
): Promise<void> {
  try {
    const websocketEndpoint = process.env.WEBSOCKET_ENDPOINT
    if (!websocketEndpoint) {
      Logger.warn('WebSocket endpoint not configured')
      return
    }

    const apiGateway = new ApiGatewayManagementApi({
      endpoint: websocketEndpoint
    })

    const dynamodb = new DynamoDB.DocumentClient()
    const tableName = `WebSocketConnections-${process.env.STAGE || 'dev'}`

    // Find connections for this device
    const connections = await dynamodb.query({
      TableName: tableName,
      IndexName: 'DeviceCodeIndex',
      KeyConditionExpression: 'deviceCode = :deviceCode',
      ExpressionAttributeValues: {
        ':deviceCode': deviceCode
      }
    }).promise()

    if (!connections.Items || connections.Items.length === 0) {
      Logger.info('No WebSocket connections found for device', { deviceCode })
      return
    }

    const locationUpdate: LocationUpdate = {
      type: 'location-update',
      deviceCode,
      iotSimNumber,
      data: locationData
    }

    const message = JSON.stringify(locationUpdate)

    // Broadcast to all connected clients for this device
    const broadcastPromises = connections.Items.map(async (connection) => {
      try {
        await apiGateway.postToConnection({
          ConnectionId: connection.connectionId,
          Data: message
        }).promise()
        
        Logger.debug('Location update sent to connection', {
          connectionId: connection.connectionId,
          deviceCode
        })
      } catch (error: any) {
        Logger.warn('Failed to send to connection', {
          connectionId: connection.connectionId,
          error: error.message
        })
        
        // Connection is stale (410 Gone), remove it
        if (error.statusCode === 410) {
          try {
            await dynamodb.delete({
              TableName: tableName,
              Key: { connectionId: connection.connectionId }
            }).promise()
            
            Logger.info('Removed stale WebSocket connection', {
              connectionId: connection.connectionId
            })
          } catch (deleteError) {
            Logger.error('Failed to remove stale connection', deleteError)
          }
        }
      }
    })

    await Promise.all(broadcastPromises)
    
    Logger.info('Location update broadcasted', {
      deviceCode,
      connectionsCount: connections.Items.length
    })
  } catch (error) {
    Logger.error('Failed to broadcast location update', {
      deviceCode,
      error
    })
  }
}