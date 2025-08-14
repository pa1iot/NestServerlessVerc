import { APIGatewayProxyHandler } from 'aws-lambda'
import { prisma } from '../shared/prisma-client'
import { SmsService } from '../shared/sms.service'
import {
  successResponse,
  errorResponse,
  parseBody,
  validateRequiredFields,
  generateOTP,
  getOtpExpiryTime,
  Logger,
  isWarmupRequest,
  handleWarmup
} from '../shared/utils'

interface SendOtpRequest {
  phoneNumber: string
  name?: string
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Handle warmup requests
    if (isWarmupRequest(event)) {
      return handleWarmup()
    }

    Logger.info('Send OTP request received')

    const body = parseBody(event.body) as SendOtpRequest
    
    // Validate required fields
    const validationError = validateRequiredFields(body, ['phoneNumber'])
    if (validationError) {
      return errorResponse(validationError, 400)
    }

    const { phoneNumber, name } = body
    const smsService = new SmsService()

    // Format and validate phone number
    const formattedPhone = smsService.formatPhoneNumber(phoneNumber)
    
    if (!smsService.validatePhoneNumber(formattedPhone)) {
      return errorResponse('Invalid phone number format', 400)
    }

    Logger.info('Processing OTP request', {
      phoneNumber: formattedPhone,
      hasName: !!name
    })

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone }
    })

    let message: string
    let isRegistration = false

    if (!existingUser) {
      // New user registration
      message = 'OTP sent successfully for registration'
      isRegistration = true
      Logger.info('New user registration OTP', { phoneNumber: formattedPhone })
    } else if (!existingUser.isPhoneVerified) {
      // Existing user but phone not verified
      message = 'OTP sent successfully for phone verification'
      Logger.info('Phone verification OTP', { phoneNumber: formattedPhone })
    } else if (!existingUser.isActive) {
      // User account is deactivated
      return errorResponse('Account is deactivated. Contact administrator.', 403)
    } else {
      // Existing verified user login
      message = 'OTP sent successfully for login'
      Logger.info('Login OTP', { phoneNumber: formattedPhone })
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = getOtpExpiryTime()

    // Delete any existing OTPs for this phone number
    await prisma.oTP.deleteMany({
      where: { phoneNumber: formattedPhone }
    })

    // Store new OTP
    await prisma.oTP.create({
      data: {
        phoneNumber: formattedPhone,
        otp,
        name: isRegistration ? name : undefined,
        expiresAt,
        isUsed: false
      }
    })

    // Send OTP via SMS
    await smsService.sendOTP(formattedPhone, otp)

    Logger.info('OTP sent successfully', {
      phoneNumber: formattedPhone,
      isRegistration,
      expiresAt
    })

    return successResponse(
      {
        phoneNumber: formattedPhone,
        isRegistration
      },
      message
    )
  } catch (error) {
    Logger.error('Send OTP failed', error)
    
    if (error instanceof Error) {
      return errorResponse(error.message, 500)
    }
    
    return errorResponse('Failed to send OTP', 500)
  }
}