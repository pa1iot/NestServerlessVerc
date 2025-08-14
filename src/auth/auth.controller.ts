import { Controller, Post, Body, Get, UseGuards, Request, Put, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto, RegisterDto, VerifyOtpDto, CreateUserDto, UpdateProfileDto, UserRole } from './dto/otp-auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UpdateUserNameDto } from './dto/update-user-name.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  
  constructor(private readonly authService: AuthService) {}


  // OTP-Only Authentication
  @ApiOperation({ 
    summary: 'Send OTP to phone number', 
    description: 'Sends a 6-digit OTP to the provided Indian mobile number via SMS. Works for both new and existing users.' 
  })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP sent successfully',
    example: {
      message: 'OTP sent successfully to your phone number',
      success: true,
      phoneNumber: '9876543210'
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid phone number format',
    example: {
      message: 'Phone number must be a valid 10-digit Indian mobile number starting with 6-9',
      error: 'Bad Request',
      statusCode: 400
    }
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many OTP requests',
    example: {
      message: 'Please wait before requesting another OTP',
      error: 'Too Many Requests',
      statusCode: 429
    }
  })
  @Post('send-otp')
  sendOTP(@Body() dto: SendOtpDto) {
    return this.authService.sendOTP(dto);
  }

  @ApiOperation({ 
    summary: 'Verify OTP and authenticate user', 
    description: 'Verifies the OTP sent to the phone number and returns JWT token for authentication.' 
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP verified successfully and user authenticated',
    example: {
      message: 'OTP verified successfully',
      success: true,
      user: {
        id: '507f1f77bcf86cd799439011',
        phoneNumber: '9876543210',
        name: 'John Doe',
        role: 'USER',
        isPhoneVerified: true,
        isActive: true
      },
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid or expired OTP',
    example: {
      message: 'Invalid or expired OTP',
      error: 'Bad Request',
      statusCode: 400
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Phone number not found',
    example: {
      message: 'Phone number not found. Please send OTP first.',
      error: 'Not Found',
      statusCode: 404
    }
  })
  @Post('verify-otp')
  verifyOTP(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOTP(dto);
  }

  @ApiOperation({ 
    summary: 'Sign out user', 
    description: 'Signs out the current user session.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User signed out successfully',
    example: {
      message: 'Signed out successfully'
    }
  })
  @Get('signout')
  signout() {
    return this.authService.signout();
  }

  // Protected Routes
  @ApiTags('Profile')
  @ApiOperation({ 
    summary: 'Get user profile', 
    description: 'Retrieves the authenticated user\'s profile information.' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ 
    status: 200, 
    description: 'Profile retrieved successfully',
    example: {
      message: 'Profile accessed successfully',
      user: {
        id: '507f1f77bcf86cd799439011',
        phoneNumber: '9876543210',
        name: 'John Doe',
        role: 'USER',
        isPhoneVerified: true,
        isActive: true,
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token',
    example: {
      message: 'Unauthorized',
      statusCode: 401
    }
  })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return {
      message: 'Profile accessed successfully',
      user: req.user
    };
  }

  @ApiTags('Profile')
  @ApiOperation({ 
    summary: 'Update user profile', 
    description: 'Updates the authenticated user\'s profile name. Phone number cannot be changed as it is verified.' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile updated successfully',
    example: {
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: '507f1f77bcf86cd799439011',
        phoneNumber: '9876543210',
        name: 'John Doe Updated',
        role: 'USER',
        isPhoneVerified: true,
        isActive: true
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid input data',
    example: {
      message: 'Failed to update profile',
      statusCode: 400
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token',
    example: {
      message: 'Unauthorized',
      statusCode: 401
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found',
    example: {
      message: 'User not found',
      statusCode: 404
    }
  })
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.sub, updateProfileDto);
  }

  // User Registration (Open for voluntary registration)
  @ApiOperation({ 
    summary: 'Register new user', 
    description: 'Creates a new user account with phone number. User must verify phone via OTP after registration.' 
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    example: {
      message: 'User registered successfully. Please verify your phone number.',
      success: true,
      user: {
        id: '507f1f77bcf86cd799439011',
        phoneNumber: '9876543210',
        name: 'John Doe',
        role: 'USER',
        isPhoneVerified: false,
        isActive: true
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid phone number format',
    example: {
      message: 'Phone number must be a valid 10-digit Indian mobile number starting with 6-9',
      error: 'Bad Request',
      statusCode: 400
    }
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Phone number already exists',
    example: {
      message: 'Phone number already exists. Please use SMS OTP login.',
      error: 'Conflict',
      statusCode: 409
    }
  })
  @Post('register')
  registerUser(@Body() dto: RegisterDto) {
    return this.authService.registerUser(dto);
  }

  // Admin Routes - Create Users
  @ApiTags('User Management')
  @ApiOperation({ 
    summary: 'Create admin user', 
    description: 'Creates a new admin user. Only accessible by SUPER_ADMIN role.' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Admin user created successfully',
    example: {
      message: 'Admin user created successfully',
      success: true,
      user: {
        id: '507f1f77bcf86cd799439011',
        phoneNumber: '9876543210',
        name: 'Admin User',
        role: 'ADMIN',
        isPhoneVerified: true,
        isActive: true,
        createdBy: '507f1f77bcf86cd799439012'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Insufficient permissions'
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Phone number already exists'
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/create-admin')
  createAdmin(@Body() dto: CreateUserDto, @Request() req) {
    return this.authService.createUserByAdmin(dto, req.user.id, UserRole.ADMIN);
  }

  @ApiTags('User Management')
  @ApiOperation({ 
    summary: 'Create employee user', 
    description: 'Creates a new employee user. Accessible by SUPER_ADMIN and ADMIN roles.' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Employee user created successfully',
    example: {
      message: 'Employee user created successfully',
      success: true,
      user: {
        id: '507f1f77bcf86cd799439011',
        phoneNumber: '9876543210',
        name: 'Employee User',
        role: 'EMPLOYEE',
        isPhoneVerified: true,
        isActive: true,
        createdBy: '507f1f77bcf86cd799439012'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Insufficient permissions'
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Phone number already exists'
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/create-employee')
  createEmployee(@Body() dto: CreateUserDto, @Request() req) {
    return this.authService.createUserByAdmin(dto, req.user.id, UserRole.EMPLOYEE);
  }

  // User Management Routes
  @ApiTags('User Management')
  @ApiOperation({ 
    summary: 'Get all users', 
    description: 'Retrieves all users based on the requesting user\'s role permissions.' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ 
    status: 200, 
    description: 'Users retrieved successfully',
    example: {
      message: 'Users retrieved successfully',
      users: [
        {
          id: '507f1f77bcf86cd799439011',
          phoneNumber: '9876543210',
          name: 'John Doe',
          role: 'USER',
          isPhoneVerified: true,
          isActive: true,
          createdAt: '2024-01-15T10:30:00.000Z'
        }
      ],
      total: 1
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Insufficient permissions'
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('users')
  getAllUsers(@Request() req) {
    return this.authService.getAllUsers(req.user.role);
  }

  @ApiTags('User Management')
  @ApiOperation({ 
    summary: 'Toggle user status', 
    description: 'Activates or deactivates a user account.' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'User ID to toggle status' })
  @ApiResponse({ 
    status: 200, 
    description: 'User status updated successfully',
    example: {
      message: 'User status updated successfully',
      user: {
        id: '507f1f77bcf86cd799439011',
        phoneNumber: '9876543210',
        name: 'John Doe',
        isActive: false
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Insufficient permissions'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found'
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Put('users/:id/status')
  toggleUserStatus(@Param('id') id: string, @Request() req) {
    return this.authService.toggleUserStatus(id, req.user.role);
  }

  @ApiTags('User Management')
  @ApiOperation({ 
    summary: 'Delete user', 
    description: 'Permanently deletes a user account. Only accessible by SUPER_ADMIN role.' 
  })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'User ID to delete' })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted successfully',
    example: {
      message: 'User deleted successfully'
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Insufficient permissions'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found'
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(id);
  }

  @Post('update-name')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update the user name by ID' })
  @ApiBody({ type: UpdateUserNameDto })
  async updateUserName(@Body() dto: UpdateUserNameDto) {
    const { id, name } = dto;
    return this.authService.updateUserName(id, name);
  }
}
