import { APIGatewayProxyResult } from 'aws-lambda'

// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Create standardized API Gateway response
export const createResponse = (
  statusCode: number,
  body: ApiResponse,
  headers: Record<string, string> = {}
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(body),
  }
}

// Success response helper
export const successResponse = <T>(
  data: T,
  message?: string,
  statusCode: number = 200
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    success: true,
    data,
    message,
  })
}

// Error response helper
export const errorResponse = (
  error: string,
  statusCode: number = 400,
  message?: string
): APIGatewayProxyResult => {
  return createResponse(statusCode, {
    success: false,
    error,
    message,
  })
}

// Validation helper
export const validateRequiredFields = (
  body: any,
  requiredFields: string[]
): string | null => {
  for (const field of requiredFields) {
    if (!body[field]) {
      return `Missing required field: ${field}`
    }
  }
  return null
}

// Parse JSON body safely
export const parseBody = (body: string | null): any => {
  if (!body) return {}
  
  try {
    return JSON.parse(body)
  } catch (error) {
    throw new Error('Invalid JSON body')
  }
}

// Extract user from authorizer context
export const getUserFromContext = (event: any): { id: number; role: string } => {
  const userId = event.requestContext?.authorizer?.userId
  const role = event.requestContext?.authorizer?.role
  
  if (!userId) {
    throw new Error('User not found in context')
  }
  
  return {
    id: parseInt(userId),
    role: role || 'USER'
  }
}

// Generate random code for devices
export const generateRandomCode = (length: number = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Generate QR code URL
export const generateQrCodeUrl = (code: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${code}`
}

// Format phone number
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Add country code if not present (assuming India +91)
  if (cleaned.startsWith('0')) {
    return '+91' + cleaned.substring(1)
  } else if (!cleaned.startsWith('91') && cleaned.length === 10) {
    return '+91' + cleaned
  } else if (cleaned.startsWith('91')) {
    return '+' + cleaned
  }
  
  return '+' + cleaned
}

// Validate phone number format
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/
  return phoneRegex.test(phoneNumber)
}

// Generate OTP
export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789'
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += digits.charAt(Math.floor(Math.random() * digits.length))
  }
  return otp
}

// Calculate OTP expiry time (5 minutes from now)
export const getOtpExpiryTime = (): Date => {
  const now = new Date()
  return new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes
}

// Check if OTP is expired
export const isOtpExpired = (expiryTime: Date): boolean => {
  return new Date() > expiryTime
}

// Logger utility
export class Logger {
  static info(message: string, data?: any) {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }
  
  static error(message: string, error?: any) {
    console.error(`[ERROR] ${message}`, error)
  }
  
  static warn(message: string, data?: any) {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }
  
  static debug(message: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '')
    }
  }
}

// Warmup check
export const isWarmupRequest = (event: any): boolean => {
  return event.source === 'serverless-plugin-warmup'
}

// Handle warmup
export const handleWarmup = (): APIGatewayProxyResult => {
  return successResponse({ message: 'Lambda is warm!' })
}