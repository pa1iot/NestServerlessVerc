import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.createTransporter();
  }

  private createTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.nighatechglobal.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'info@nighatechglobal.com',
        pass: process.env.SMTP_PASS || '',
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP server is ready to take our messages');
      }
    });
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    try {
      const mailOptions = {
        from: `"NighaTech Global" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your OTP Code - NighaTech Global',
        text: `Your OTP code is: ${otp}. This code will expire in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
              <h2 style="color: #333; margin-bottom: 20px;">Your OTP Code</h2>
              <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #666; margin: 15px 0;">This code will expire in <strong>10 minutes</strong></p>
              <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">© 2025 NighaTech Global. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP email sent successfully to ${email}. Message ID: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}:`, error);
      throw new Error('Failed to send email');
    }
  }

  async sendWelcomeEmail(email: string, userName?: string): Promise<void> {
    try {
      const mailOptions = {
        from: `"NighaTech Global" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to NighaTech Global!',
        text: `Welcome ${userName || 'User'}! Your account has been successfully verified.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
              <h2 style="color: #28a745; text-align: center;">Welcome to NighaTech Global!</h2>
              <p style="color: #333; font-size: 16px;">Hello ${userName || 'User'},</p>
              <p style="color: #666;">Your email has been successfully verified and your account is now active.</p>
              <p style="color: #666;">You can now access all features of our platform.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
              </div>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; text-align: center;">© 2025 NighaTech Global. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent successfully to ${email}. Message ID: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      throw new Error('Failed to send welcome email');
    }
  }
}