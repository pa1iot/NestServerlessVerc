import { APIGatewayProxyHandler } from 'aws-lambda'
import { prisma } from '../shared/prisma-client'
import {
  successResponse,
  errorResponse,
  getUserFromContext,
  Logger,
  isWarmupRequest,
  handleWarmup
} from '../shared/utils'

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Handle warmup requests
    if (isWarmupRequest(event)) {
      return handleWarmup()
    }

    Logger.info('Get tracking history request received')

    // Get user from context (JWT authorizer)
    const user = getUserFromContext(event)
    
    const { code } = event.pathParameters || {}
    const { date, limit = '100', offset = '0' } = event.queryStringParameters || {}
    
    if (!code) {
      return errorResponse('Device code is required', 400)
    }

    Logger.info('Processing tracking history request', {
      deviceCode: code,
      userId: user.id,
      date,
      limit,
      offset
    })

    // Verify user has access to this device
    const device = await prisma.device.findUnique({
      where: { code },
      include: {
        sharedDevices: {
          where: { userId: user.id },
          select: { userId: true }
        }
      }
    })

    if (!device) {
      return errorResponse('Device not found', 404)
    }

    // Check if user has access to this device
    const hasAccess = 
      device.assignedTo === user.id || // User owns the device
      device.sharedDevices.length > 0 || // Device is shared with user
      ['SUPER_ADMIN', 'ADMIN'].includes(user.role) // User is admin

    if (!hasAccess) {
      return errorResponse('Access denied to this device', 403)
    }

    // Build date filter
    let dateFilter: any = {}
    if (date) {
      const targetDate = new Date(date)
      if (isNaN(targetDate.getTime())) {
        return errorResponse('Invalid date format. Use YYYY-MM-DD', 400)
      }
      
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      dateFilter = {
        trackedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    }

    // Parse pagination parameters
    const limitNum = Math.min(parseInt(limit) || 100, 1000) // Max 1000 records
    const offsetNum = Math.max(parseInt(offset) || 0, 0)

    // Get tracking history
    const [trackingHistory, totalCount] = await Promise.all([
      prisma.tracking.findMany({
        where: {
          deviceCode: code,
          ...dateFilter
        },
        orderBy: {
          trackedAt: 'desc'
        },
        take: limitNum,
        skip: offsetNum,
        select: {
          id: true,
          lat: true,
          long: true,
          level: true,
          altitude: true,
          speed: true,
          compress: true,
          weight: true,
          noOfSatellites: true,
          trackedAt: true,
          iotSimNumber: true
        }
      }),
      prisma.tracking.count({
        where: {
          deviceCode: code,
          ...dateFilter
        }
      })
    ])

    Logger.info('Tracking history retrieved', {
      deviceCode: code,
      userId: user.id,
      recordsCount: trackingHistory.length,
      totalCount,
      date
    })

    return successResponse(
      {
        deviceCode: code,
        deviceName: device.deviceName,
        history: trackingHistory,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount
        },
        filter: {
          date: date || null
        }
      },
      'Tracking history retrieved successfully'
    )
  } catch (error) {
    Logger.error('Get tracking history failed', error)
    
    if (error instanceof Error) {
      return errorResponse(error.message, 500)
    }
    
    return errorResponse('Failed to get tracking history', 500)
  }
}