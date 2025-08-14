import { Injectable, BadRequestException, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { SendOtpDto, RegisterDto, VerifyOtpDto, CreateUserDto, UpdateProfileDto, UserRole } from './dto/otp-auth.dto';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private smsService: SmsService
  ) {}

  // OTP-Only Authentication Methods
  async sendOTP(dto: SendOtpDto) {
    const { phoneNumber, name } = dto;

    try {
      // Format phone number
      const formattedPhone = this.smsService.formatPhoneNumber(phoneNumber);
      
      // Validate phone number
      if (!this.smsService.validatePhoneNumber(formattedPhone)) {
        throw new BadRequestException('Invalid phone number format');
      }

      // Check if user exists
      let user = await this.prisma.user.findUnique({
        where: { phoneNumber: formattedPhone }
      });

      // If user doesn't exist, this is for registration
      if (!user) {
        // Generate and send OTP for registration
        const otp = this.otpService.generateOTP();
        
        // Store OTP with name for registration
        await this.otpService.storeOTP(formattedPhone, otp, name);
        
        // Send OTP SMS
        await this.smsService.sendOTP(formattedPhone, otp);
        
        return {
          success: true,
          message: 'OTP sent successfully for registration',
          phoneNumber: formattedPhone
        };
      }

      // If user exists but not verified, send OTP for verification
      if (!user.isPhoneVerified) {
        const otp = this.otpService.generateOTP();
        await this.otpService.storeOTP(formattedPhone, otp);
        await this.smsService.sendOTP(formattedPhone, otp);
        
        return {
          success: true,
          message: 'OTP sent successfully for phone verification',
          phoneNumber: formattedPhone
        };
      }

      // If user exists and is verified, send OTP for login
      if (!user.isActive) {
        throw new ForbiddenException('Account is deactivated. Contact administrator.');
      }

      const otp = this.otpService.generateOTP();
      await this.otpService.storeOTP(formattedPhone, otp);
      await this.smsService.sendOTP(formattedPhone, otp);
      
      return {
        success: true,
        message: 'OTP sent successfully for login',
        phoneNumber: formattedPhone
      };

    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to send OTP');
    }
  }


async verifyOTP(dto: VerifyOtpDto) {
    const { phoneNumber, otp } = dto;

    try {
      // Format phone number
      const formattedPhone = this.smsService.formatPhoneNumber(phoneNumber);
      // console.log("STEP 1: formatted phone", formattedPhone);
      // Verify OTP and get stored name
      const otpResult = await this.otpService.verifyOTP(formattedPhone, otp);
      // console.log("STEP 2: otpResult", otpResult);
      if (!otpResult.isValid) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      // Use stored name from OTP if available, otherwise use name from request
      const nameToUse = otpResult.storedName || dto.name;
      // console.log("STEP 3: nameToUse", nameToUse);
      // Check if user exists
      let user = await this.prisma.user.findUnique({
        where: { phoneNumber: formattedPhone }
      });
      // console.log("STEP 4: user from DB", user);

      // If user doesn't exist, create new user (registration)
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            phoneNumber: formattedPhone,
            name: nameToUse || null,
            role: UserRole.USER,
            isPhoneVerified: true,
            isActive: true
          }
        });

        // Note: Welcome SMS not sent due to DLT template restrictions
        console.log(`User registered successfully with phone: ${formattedPhone}`);
      } else {
        // Update user verification status and name if provided
        user = await this.prisma.user.update({
          where: { phoneNumber: formattedPhone },
          data: { 
            isPhoneVerified: true,
            ...(nameToUse && { name: nameToUse })
          }
        });
        // console.log(`STEP 5: user updated successfully`);
      }

      // Generate JWT token
      const payload = {
        sub: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role
      };
      // console.log("STEP 6: payload", payload);
      const token = this.jwtService.sign(payload);
      // console.log("STEP 7: token generated", token);
      const result = {
        success: true,
        message: user.isPhoneVerified ? 'Login successful' : 'Registration successful',
        access_token: token,
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          role: user.role,
          isPhoneVerified: user.isPhoneVerified,
          isActive: user.isActive
        }
      };

      // log what you are returning
      // console.log('STEP 8: verifyOTP returning', JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      // console.error("❌ Caught error in verifyOTP:", error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('OTP verification failed');
    }
  }

async signout(){
  return { message:'signOut was sucessfull'}
}

  // Update user profile (name only)
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: Number(userId) }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: Number(userId) },
        data: {
          name: updateProfileDto.name
        }
      });

      return {
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          name: updatedUser.name,
          role: updatedUser.role,
          isPhoneVerified: updatedUser.isPhoneVerified,
          isActive: updatedUser.isActive
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update profile');
    }
  }

  // User Registration (Public)
  async registerUser(dto: RegisterDto) {
    // console.log("DTO received from client", dto);
    const { phoneNumber, name } = dto;

    try {
      // Format phone number
      const formattedPhone = this.smsService.formatPhoneNumber(phoneNumber);
      
      // Validate phone number
      if (!this.smsService.validatePhoneNumber(formattedPhone)) {
        throw new BadRequestException('Invalid phone number format');
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { phoneNumber: formattedPhone }
      });

      if (existingUser) {
        throw new ConflictException('User with this phone number already exists');
      }

      // Generate and send OTP with name for registration
      const otp = this.otpService.generateOTP();
      await this.otpService.storeOTP(formattedPhone, otp, name);
      await this.smsService.sendOTP(formattedPhone, otp);

      return {
        success: true,
        message: 'OTP sent for registration. Please verify to complete registration.',
        phoneNumber: formattedPhone
      };

    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  // Admin User Creation
  async createUserByAdmin(dto: CreateUserDto, adminId: string, targetRole: UserRole) {
    const { phoneNumber, name, role } = dto;

    try {
      // Format phone number
      const formattedPhone = this.smsService.formatPhoneNumber(phoneNumber);
      
      // Validate phone number
      if (!this.smsService.validatePhoneNumber(formattedPhone)) {
        throw new BadRequestException('Invalid phone number format');
      }

      // Validate role hierarchy
      if (role !== targetRole) {
        throw new BadRequestException(`Role mismatch. Expected ${targetRole}`);
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { phoneNumber: formattedPhone }
      });

      if (existingUser) {
        throw new ConflictException('User with this phone number already exists');
      }

      // Create user
      const newUser = await this.prisma.user.create({
        data: {
          phoneNumber: formattedPhone,
          name,
          role: targetRole,
          isPhoneVerified: false,
          isActive: true,
          createdBy: Number(adminId)
        }
      });

      // Generate and send OTP for initial setup
      const otp = this.otpService.generateOTP();
      await this.otpService.storeOTP(formattedPhone, otp);
      await this.smsService.sendOTP(formattedPhone, otp);

      return {
        success: true,
        message: `${targetRole} created successfully. OTP sent for phone verification.`,
        user: {
          id: newUser.id,
          phoneNumber: newUser.phoneNumber,
          name: newUser.name,
          role: newUser.role,
          isActive: newUser.isActive
        }
      };

    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  // User Management Methods
  async getAllUsers(requestorRole: UserRole) {
    try {
      let whereClause = {};
      
      // Super admin can see all users
      if (requestorRole === UserRole.SUPER_ADMIN) {
        whereClause = {};
      } 
      // Admin can see employees and users only
      else if (requestorRole === UserRole.ADMIN) {
        whereClause = {
          role: {
            in: [UserRole.EMPLOYEE, UserRole.USER]
          }
        };
      }
      else {
        throw new ForbiddenException('Insufficient permissions');
      }

      const users = await this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          phoneNumber: true,
          name: true,
          role: true,
          isPhoneVerified: true,
          isActive: true,
          createdAt: true,
          createdBy: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return {
        success: true,
        users,
        total: users.length
      };

    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async toggleUserStatus(userId: string, requestorRole: UserRole) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: Number(userId) }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Role-based access control
      if (requestorRole === UserRole.ADMIN && 
          (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN)) {
        throw new ForbiddenException('Cannot modify admin or super admin accounts');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: Number(userId) },
        data: { isActive: !user.isActive }
      });

      return {
        success: true,
        message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          isActive: updatedUser.isActive
        }
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to update user status');
    }
  }

  async deleteUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: Number(userId) }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Prevent deletion of super admin
      if (user.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Cannot delete super admin account');
      }

      await this.prisma.user.delete({
        where: { id: Number(userId) }
      });

      return {
        success: true,
        message: 'User deleted successfully'
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete user');
    }
  }

  async updateUserName(id: number, name: string) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { name },
    });
    return updated;
  }



















}
