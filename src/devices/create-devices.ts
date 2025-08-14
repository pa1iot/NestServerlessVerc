import { APIGatewayProxyHandler } from 'aws-lambda'
import { prisma } from '../shared/prisma-client'
import {
  successResponse,
  errorResponse,
  parseBody,
  validateRequiredFields,
  generateRandomCode,
  generateQrCodeUrl,
  getUserFromContext,
  Logger,
  isWarmupRequest,
  handleWarmup
} from '../shared/utils'

interface CreateDevicesRequest {
  count: number
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Handle warmup requests
    if (isWarmupRequest(event)) {
      return handleWarmup()
    }

    Logger.info('Create devices request received')

    // Get user from context (JWT authorizer)
    const user = getUserFromContext(event)
    
    // Check if user has permission to create devices (admin roles)
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return errorResponse('Insufficient permissions to create devices', 403)
    }

    const body = parseBody(event.body) as CreateDevicesRequest
    
    // Validate required fields
    const validationError = validateRequiredFields(body, ['count'])
    if (validationError) {
      return errorResponse(validationError, 400)
    }

    const { count } = body

    // Validate count
    if (!Number.isInteger(count) || count <= 0 || count > 1000) {
      return errorResponse('Count must be a positive integer between 1 and 1000', 400)
    }

    Logger.info('Creating devices', {
      count,
      requestedBy: user.id
    })

    const devices: {
      code: string
      qrCodeUrl: string
      status: 'ACTIVE' | 'INACTIVE'
    }[] = []

    // Generate devices
    for (let i = 0; i < count; i++) {
      let code: string
      let isUnique = false
      let attempts = 0
      const maxAttempts = 10

      // Ensure unique device code
      while (!isUnique && attempts < maxAttempts) {
        code = generateRandomCode(16)
        
        // Check if code already exists
        const existingDevice = await prisma.device.findUnique({
          where: { code }
        })
        
        if (!existingDevice) {
          isUnique = true
        }
        attempts++
      }

      if (!isUnique) {
        Logger.error('Failed to generate unique device code', {
          attempts: maxAttempts,
          deviceIndex: i
        })
        return errorResponse('Failed to generate unique device codes', 500)
      }

      const qrCodeUrl = generateQrCodeUrl(code!)
      
      devices.push({
        code: code!,
        qrCodeUrl,
        status: 'INACTIVE'
      })

      Logger.debug('Device generated', {
        index: i + 1,
        code: code!,
        qrCodeUrl
      })
    }

    // Bulk insert devices
    const result = await prisma.device.createMany({
      data: devices
    })

    Logger.info('Devices created successfully', {
      count: result.count,
      requestedBy: user.id
    })

    return successResponse(
      {
        created: result.count,
        devices: devices.map(device => ({
          code: device.code,
          qrCodeUrl: device.qrCodeUrl,
          status: device.status
        }))
      },
      `Successfully created ${result.count} devices`
    )
  } catch (error) {
    Logger.error('Create devices failed', error)
    
    if (error instanceof Error) {
      return errorResponse(error.message, 500)
    }
    
    return errorResponse('Failed to create devices', 500)
  }
}