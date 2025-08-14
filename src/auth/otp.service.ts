import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private smsService: SmsService
  ) {}

  // Generate a 6-digit OTP
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP in database
  async storeOTP(phoneNumber: string, otp: string, name?: string): Promise<void> {
    // Set expiration time to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate any existing OTPs for this phone number
    await this.prisma.oTP.updateMany({
      where: {
        phoneNumber,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    // Create new OTP
    await this.prisma.oTP.create({
      data: {
        phoneNumber,
        otp,
        name: name || null,
        expiresAt,
      },
    });
  }

  // Verify OTP and return stored name
  async verifyOTP(phoneNumber: string, otp: string): Promise<{ isValid: boolean; storedName?: string }> {
    // console.log('Verifying OTP for phoneNumber:', phoneNumber, 'otp:', otp);
    const otpRecord = await this.prisma.oTP.findFirst({
      where: {
        phoneNumber,
        otp,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    // console.log('Found OTP records:', otpRecord);
    if (!otpRecord) {
      return { isValid: false };
    }

    // Mark OTP as used
    await this.prisma.oTP.update({
      where: {
        id: otpRecord.id,
      },
      data: {
        isUsed: true,
      },
    });

    return { isValid: true, storedName: otpRecord.name || undefined };
  }

  // Send OTP via SMS using SMS API
  async sendOTPSMS(phoneNumber: string, otp: string): Promise<void> {
    try {
      // Log OTP for testing purposes
      console.log(`🔐 Generated OTP for ${phoneNumber}: ${otp}`);
      await this.smsService.sendOTP(phoneNumber, otp);
      console.log(`OTP SMS sent successfully to ${phoneNumber}`);
    } catch (error) {
      console.error(`Failed to send OTP SMS to ${phoneNumber}:`, error);
      throw new BadRequestException('Failed to send OTP SMS');
    }
  }

  // Clean up expired OTPs (optional cleanup method)
  async cleanupExpiredOTPs(): Promise<void> {
    await this.prisma.oTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}