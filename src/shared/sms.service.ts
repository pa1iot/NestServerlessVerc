import axios from 'axios'
import { Logger, formatPhoneNumber, validatePhoneNumber } from './utils'

export class SmsService {
  private readonly smsApiUrl = 'http://43.252.88.250/index.php/smsapi/httpapi/'
  private readonly smsConfig = {
    secret: 'xledocqmXkNPrTesuqWr',
    sender: 'NIGHAI',
    tempid: '1207174264191607433',
    route: 'TA',
    msgtype: '1'
  }

  /**
   * Send OTP via SMS using HTTP API
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    try {
      // Log OTP for testing purposes
      console.log(`🔐 Generated OTP for ${phoneNumber}: ${otp}`)
      
      const formattedPhone = formatPhoneNumber(phoneNumber)
      
      if (!validatePhoneNumber(formattedPhone)) {
        throw new Error(`Invalid phone number format: ${formattedPhone}`)
      }

      // Format the SMS message with OTP
      const message = `Welcome to NighaTech Global Your OTP for authentication is ${otp} don't share with anybody Thank you`
      
      Logger.info('Sending SMS OTP', {
        phoneNumber: formattedPhone.substring(0, 6) + '***',
        otpLength: otp.length
      })

      // Prepare SMS API parameters
      const params = new URLSearchParams({
        secret: this.smsConfig.secret,
        sender: this.smsConfig.sender,
        tempid: this.smsConfig.tempid,
        receiver: formattedPhone,
        route: this.smsConfig.route,
        msgtype: this.smsConfig.msgtype,
        sms: message
      })

      // Send SMS using the provided API
      const response = await axios.get(`${this.smsApiUrl}?${params.toString()}`)
      
      Logger.info('SMS sent successfully', {
        phoneNumber: formattedPhone.substring(0, 6) + '***',
        response: response.data
      })
    } catch (error) {
      Logger.error('Failed to send SMS', {
        phoneNumber: phoneNumber.substring(0, 6) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to send SMS')
    }
  }

  /**
   * Format phone number to international format
   */
  formatPhoneNumber(phoneNumber: string): string {
    return formatPhoneNumber(phoneNumber)
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    return validatePhoneNumber(phoneNumber)
  }

  /**
   * Send custom SMS message
   */
  async sendCustomMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber)
      
      if (!validatePhoneNumber(formattedPhone)) {
        throw new Error(`Invalid phone number format: ${formattedPhone}`)
      }

      Logger.info('Sending custom SMS', {
        phoneNumber: formattedPhone.substring(0, 6) + '***',
        messageLength: message.length
      })

      // Prepare SMS API parameters
      const params = new URLSearchParams({
        secret: this.smsConfig.secret,
        sender: this.smsConfig.sender,
        tempid: this.smsConfig.tempid,
        receiver: formattedPhone,
        route: this.smsConfig.route,
        msgtype: this.smsConfig.msgtype,
        sms: message
      })

      // Send SMS using the provided API
      const response = await axios.get(`${this.smsApiUrl}?${params.toString()}`)
      
      Logger.info('Custom SMS sent successfully', {
        phoneNumber: formattedPhone.substring(0, 6) + '***',
        response: response.data
      })
    } catch (error) {
      Logger.error('Failed to send custom SMS', {
        phoneNumber: phoneNumber.substring(0, 6) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to send SMS')
    }
  }
}