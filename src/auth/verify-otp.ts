import { APIGatewayProxyHandler } from 'aws-lambda'
import * as jwt from 'jsonwebtoken'
import { prisma } from '../shared/prisma-client'
import {
  successResponse,
  errorResponse,
  parseBody,
  validateRequiredFields,
  isOtpExpired,
  Logger,
  isWarmupRequest,
  handleWarmup
} from '../shared/utils'
import { SmsService } from '../shared/sms.service'

interface VerifyOtpRequest {
  phoneNumber: string
  otp: string
}

interface AuthResponse {
  user: {
    id: number
    phoneNumber: string
    name: string | null
    role: string
    isPhoneVerified: boolean
    isActive: boolean
  }
  token: string
  isNewUser: boolean
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Handle warmup requests
    if (isWarmupRequest(event)) {
      return handleWarmup()
    }

    Logger.info('Verify OTP request received')

    const body = parseBody(event.body) as VerifyOtpRequest
    
    // Validate required fields
    const validationError = validateRequiredFields(body, ['phoneNumber', 'otp'])
    if (validationError) {
      return errorResponse(validationError, 400)
    }

    const { phoneNumber, otp } = body
    const smsService = new SmsService()

    // Format phone number
    const formattedPhone = smsService.formatPhoneNumber(phoneNumber)
    
    Logger.info('Processing OTP verification', {
      phoneNumber: formattedPhone,
      otp: otp.substring(0, 2) + '****' // Log partial OTP for debugging
    })

    // Find the OTP record
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phoneNumber: formattedPhone,
        otp,
        isUsed: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!otpRecord) {
      Logger.warn('Invalid OTP provided', { phoneNumber: formattedPhone })
      return errorResponse('Invalid OTP', 400)
    }

    // Check if OTP is expired
    if (isOtpExpired(otpRecord.expiresAt)) {
      Logger.warn('Expired OTP used', {
        phoneNumber: formattedPhone,
        expiresAt: otpRecord.expiresAt
      })
      
      // Mark OTP as used
      await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { isUsed: true }
      })
      
      return errorResponse('OTP has expired', 400)
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    })

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { phoneNumber: formattedPhone }
    })

    let isNewUser = false

    if (!user) {
      // Create new user
      const userName = otpRecord.name || null
      
      user = await prisma.user.create({
        data: {
          phoneNumber: formattedPhone,
          name: userName,
          role: 'USER',
          isPhoneVerified: true,
          isActive: true
        }
      })
      
      isNewUser = true
      Logger.info('New user created', {
        userId: user.id,
        phoneNumber: formattedPhone,
        name: userName
      })
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          isPhoneVerified: true,
          // Update name if provided during registration and user doesn't have one
          ...(otpRecord.name && !user.name && { name: otpRecord.name })
        }
      })
      
      Logger.info('Existing user verified', {
        userId: user.id,
        phoneNumber: formattedPhone
      })
    }

    // Check if user is active
    if (!user.isActive) {
      Logger.warn('Inactive user attempted login', {
        userId: user.id,
        phoneNumber: formattedPhone
      })
      return errorResponse('Account is deactivated. Contact administrator.', 403)
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      Logger.error('JWT_SECRET environment variable not set')
      return errorResponse('Internal server error', 500)
    }

    const tokenPayload = {
      id: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role
    }

    const token = jwt.sign(
      tokenPayload,
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    )

    // Clean up old OTPs for this phone number
    await prisma.oTP.deleteMany({
      where: {
        phoneNumber: formattedPhone,
        isUsed: true
      }
    })

    const response: AuthResponse = {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        isActive: user.isActive
      },
      token,
      isNewUser
    }

    Logger.info('OTP verification successful', {
      userId: user.id,
      phoneNumber: formattedPhone,
      isNewUser
    })

    return successResponse(
      response,
      isNewUser ? 'Registration successful' : 'Login successful'
    )
  } catch (error) {
    Logger.error('Verify OTP failed', error)
    
    if (error instanceof Error) {
      return errorResponse(error.message, 500)
    }
    
    return errorResponse('Failed to verify OTP', 500)
  }
}