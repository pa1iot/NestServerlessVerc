import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly smsApiUrl = 'http://43.252.88.250/index.php/smsapi/httpapi/';
  private readonly smsConfig = {
    secret: 'xledocqmXkNPrTesuqWr',
    sender: 'NIGHAI',
    tempid: '1207174264191607433',
    route: 'TA',
    msgtype: '1'
  };

  constructor(private readonly httpService: HttpService) {}

  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    try {
      // Log OTP for testing purposes
      console.log(`🔐 Generated OTP for ${phoneNumber}: ${otp}`);
      
      // Format the SMS message with OTP
      const message = `Welcome to NighaTech Global Your OTP for authentication is ${otp} don't share with anybody Thank you`;
      
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Prepare SMS API parameters
      const params = new URLSearchParams({
        secret: this.smsConfig.secret,
        sender: this.smsConfig.sender,
        tempid: this.smsConfig.tempid,
        receiver: formattedPhone,
        route: this.smsConfig.route,
        msgtype: this.smsConfig.msgtype,
        sms: message
      });

      // Send SMS using the provided API
      const response = await firstValueFrom(
        this.httpService.get(`${this.smsApiUrl}?${params.toString()}`)
      );

      this.logger.log(`OTP SMS sent successfully to ${formattedPhone.substring(0, 6)}***`);
      this.logger.debug('SMS API Response:', response.data);
      
    } catch (error) {
      this.logger.error(`Failed to send OTP SMS to ${phoneNumber.substring(0, 6)}***:`, error);
      throw new BadRequestException('Failed to send OTP SMS');
    }
  }

  // Note: Welcome SMS functionality removed due to DLT template restrictions
  // Only OTP SMS is supported with approved DLT templates

  // Utility method to validate Indian phone number format
  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove any spaces, dashes, or plus signs
    const cleanNumber = phoneNumber.replace(/[\s\-\+]/g, '');
    
    // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
    const indianMobileRegex = /^[6-9]\d{9}$/;
    
    return indianMobileRegex.test(cleanNumber);
  }

  // Utility method to format phone number
  formatPhoneNumber(phoneNumber: string): string {
    // Remove any spaces, dashes, or plus signs
    const cleanNumber = phoneNumber.replace(/[\s\-\+]/g, '');
    
    // If it starts with +91, remove it
    if (cleanNumber.startsWith('91') && cleanNumber.length === 12) {
      return cleanNumber.substring(2);
    }
    
    return cleanNumber;
  }
}