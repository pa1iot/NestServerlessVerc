# Authentication API Documentation

## Overview

This NestJS application provides a comprehensive authentication system with **SMS OTP (One-Time Password) Authentication** as the primary authentication method. The system includes role-based access control with four user levels and administrative user management capabilities.

The system uses JWT (JSON Web Tokens) for session management and includes phone number verification capabilities with DLT-compliant SMS templates.

## Base URL
```
http://localhost:5000
```

## User Roles & Permissions

The system supports a hierarchical role-based access control:

```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',  // Highest privileges
  ADMIN = 'ADMIN',              // Can manage employees and users
  EMPLOYEE = 'EMPLOYEE',        // Standard employee access
  USER = 'USER'                 // Basic user access
}
```

### Role Hierarchy & Permissions:
- **SUPER_ADMIN**: Can create admins, manage all users, delete users
- **ADMIN**: Can create employees, manage users (except other admins)
- **EMPLOYEE**: Standard access to protected routes
- **USER**: Basic authenticated access

## Authentication Endpoints

### 1. SMS OTP Authentication

#### 1.1 Send OTP
**Endpoint:** `POST /auth/send-otp`

**Description:** Send a 6-digit OTP to the user's phone number via SMS

**Request Body:**
```json
{
  "phoneNumber": "8297808410",
  "name": "Optional Name"
}
```

**Validation Rules:**
- `phoneNumber`: Must be a valid 10-digit Indian mobile number (starting with 6-9)
- `name`: Optional string for user's name

**Success Response (200):**
```json
{
  "message": "OTP sent successfully to your phone",
  "phoneNumber": "8297808410"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid phone number or failed to send SMS
- `400 Bad Request`: Phone number validation failed

**Features:**
- Creates new user if phone number doesn't exist
- OTP expires in 10 minutes
- Invalidates previous OTPs for the same phone number
- Sends DLT-compliant transactional SMS with OTP
- Uses registered SMS templates for compliance

**cURL Example:**
```bash
curl -X POST http://localhost:5000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "8297808410",
    "name": "Test User"
  }'
```

---

#### 1.2 Verify OTP
**Endpoint:** `POST /auth/verify-otp`

**Description:** Verify the OTP and authenticate the user

**Request Body:**
```json
{
  "phoneNumber": "8297808410",
  "otp": "123456"
}
```

**Validation Rules:**
- `phoneNumber`: Must be a valid 10-digit Indian mobile number
- `otp`: Must be a 6-digit string

**Success Response (200):**
```json
{
  "message": "OTP verified successfully",
  "userId": "user_id_here",
  "phoneNumber": "8297808410",
  "access_token": "jwt_token_here"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid or expired OTP
- `400 Bad Request`: User not found
- `400 Bad Request`: Missing phone number or OTP

**Features:**
- Marks user phone number as verified
- OTP can only be used once
- Returns JWT token for authenticated sessions
- No welcome SMS sent (DLT compliance - only transactional OTPs allowed)

**cURL Example:**
```bash
curl -X POST http://localhost:5000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "8297808410",
    "otp": "123456"
  }'
```

---

#### 1.3 User Registration
**Endpoint:** `POST /auth/register`

**Description:** Register a new user (alternative to send-otp for voluntary registration)

**Request Body:**
```json
{
  "phoneNumber": "8297808410",
  "name": "Optional Name"
}
```

**Validation Rules:**
- `phoneNumber`: Must be a valid 10-digit Indian mobile number
- `name`: Optional string for user's name

**Success Response (200):**
```json
{
  "message": "User registered successfully",
  "phoneNumber": "8297808410"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "8297808410",
    "name": "New User"
  }'
```

---

### 2. Session Management

#### 2.1 Sign Out
**Endpoint:** `GET /auth/signout`

**Description:** Sign out the current user (client-side token removal)

**Success Response (200):**
```json
{
  "message": "signOut was sucessfull"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/auth/signout
```

---

#### 2.2 Get Profile (Protected)
**Endpoint:** `GET /auth/profile`

**Description:** Get current user profile information

**Authentication:** Requires JWT token in Authorization header

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "message": "Profile accessed successfully",
  "user": {
    "userId": "user_id_here",
    "phoneNumber": "8297808410",
    "role": "USER",
    "iat": 1640995200,
    "exp": 1672531200
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token

**cURL Example:**
```bash
curl -X GET http://localhost:5000/auth/profile \
  -H "Authorization: Bearer your_jwt_token_here"
```

---

### 3. Administrative Endpoints (Role-Based Access)

#### 3.1 Create Admin (SUPER_ADMIN only)
**Endpoint:** `POST /auth/admin/create-admin`

**Description:** Create a new admin user (SUPER_ADMIN role required)

**Authentication:** Requires JWT token with SUPER_ADMIN role

**Request Body:**
```json
{
  "phoneNumber": "8297808410",
  "name": "Admin Name",
  "role": "ADMIN"
}
```

**Success Response (200):**
```json
{
  "message": "Admin created successfully",
  "userId": "admin_user_id",
  "phoneNumber": "8297808410"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Insufficient permissions (not SUPER_ADMIN)

**cURL Example:**
```bash
curl -X POST http://localhost:5000/auth/admin/create-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer super_admin_jwt_token" \
  -d '{
    "phoneNumber": "8297808410",
    "name": "New Admin",
    "role": "ADMIN"
  }'
```

---

#### 3.2 Create Employee (SUPER_ADMIN & ADMIN)
**Endpoint:** `POST /auth/admin/create-employee`

**Description:** Create a new employee user (SUPER_ADMIN or ADMIN role required)

**Authentication:** Requires JWT token with SUPER_ADMIN or ADMIN role

**Request Body:**
```json
{
  "phoneNumber": "8297808410",
  "name": "Employee Name",
  "role": "EMPLOYEE"
}
```

**Success Response (200):**
```json
{
  "message": "Employee created successfully",
  "userId": "employee_user_id",
  "phoneNumber": "8297808410"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Insufficient permissions (not ADMIN or SUPER_ADMIN)

**cURL Example:**
```bash
curl -X POST http://localhost:5000/auth/admin/create-employee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_jwt_token" \
  -d '{
    "phoneNumber": "8297808410",
    "name": "New Employee",
    "role": "EMPLOYEE"
  }'
```

---

### 4. User Management Endpoints

#### 4.1 Get All Users (SUPER_ADMIN & ADMIN)
**Endpoint:** `GET /auth/users`

**Description:** Retrieve all users (SUPER_ADMIN or ADMIN role required)

**Authentication:** Requires JWT token with SUPER_ADMIN or ADMIN role

**Success Response (200):**
```json
{
  "message": "Users retrieved successfully",
  "users": [
    {
      "id": "user_id_1",
      "phoneNumber": "8297808410",
      "name": "User One",
      "role": "USER",
      "isActive": true,
      "isPhoneVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:5000/auth/users \
  -H "Authorization: Bearer admin_jwt_token"
```

---

#### 4.2 Toggle User Status (SUPER_ADMIN & ADMIN)
**Endpoint:** `PUT /auth/users/:id/status`

**Description:** Activate or deactivate a user (SUPER_ADMIN or ADMIN role required)

**Authentication:** Requires JWT token with SUPER_ADMIN or ADMIN role

**Success Response (200):**
```json
{
  "message": "User status updated successfully",
  "userId": "user_id",
  "isActive": false
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/auth/users/USER_ID/status \
  -H "Authorization: Bearer admin_jwt_token"
```

---

#### 4.3 Delete User (SUPER_ADMIN only)
**Endpoint:** `DELETE /auth/users/:id`

**Description:** Permanently delete a user (SUPER_ADMIN role required)

**Authentication:** Requires JWT token with SUPER_ADMIN role

**Success Response (200):**
```json
{
  "message": "User deleted successfully",
  "userId": "user_id"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Insufficient permissions (not SUPER_ADMIN)
- `404 Not Found`: User not found

**cURL Example:**
```bash
curl -X DELETE http://localhost:5000/auth/users/USER_ID \
  -H "Authorization: Bearer super_admin_jwt_token"
```

---

## JWT Token Information

### Token Structure
The JWT token contains the following payload:
```json
{
  "sub": "user_id",
  "phoneNumber": "8297808410",
  "iat": 1640995200,
  "exp": 1672531200
}
```

### Token Usage
Include the token in the Authorization header for protected routes:
```
Authorization: Bearer <your_jwt_token>
```

### Token Expiration
- Default expiration: 365 days
- Configurable via `JWT_EXPIRES_IN` environment variable

---

## Testing Scenarios

### Scenario 1: Complete SMS OTP-Based Authentication Flow
```bash
# 1. Request OTP
curl -X POST http://localhost:5000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "8297808410", "name": "Test User"}'

# 2. Check SMS for OTP and verify (replace 123456 with actual OTP)
curl -X POST http://localhost:5000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "8297808410", "otp": "123456"}'

# 3. Access protected profile (use token from step 2)
curl -X GET http://localhost:5000/auth/profile \
  -H "Authorization: Bearer <token_from_verify_otp>"

# 4. Sign out
curl -X GET http://localhost:5000/auth/signout
```

### Scenario 2: Admin User Management Flow
```bash
# 1. Super Admin creates an Admin
curl -X POST http://localhost:5000/auth/admin/create-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <super_admin_token>" \
  -d '{"phoneNumber": "8297808410", "name": "Admin User", "role": "ADMIN"}'

# 2. Admin creates an Employee
curl -X POST http://localhost:5000/auth/admin/create-employee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"phoneNumber": "8297808411", "name": "Employee User", "role": "EMPLOYEE"}'

# 3. Admin views all users
curl -X GET http://localhost:5000/auth/users \
  -H "Authorization: Bearer <admin_token>"

# 4. Admin toggles user status
curl -X PUT http://localhost:5000/auth/users/USER_ID/status \
  -H "Authorization: Bearer <admin_token>"
```

### Scenario 3: Error Testing
```bash
# Test invalid phone number format
curl -X POST http://localhost:5000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "123"}'

# Test invalid OTP
curl -X POST http://localhost:5000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "8297808410", "otp": "000000"}'

# Test accessing protected route without token
curl -X GET http://localhost:5000/auth/profile

# Test accessing admin route with insufficient permissions
curl -X POST http://localhost:5000/auth/admin/create-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -d '{"phoneNumber": "8297808410", "name": "Admin", "role": "ADMIN"}'
```

---

## Default Super Admin

The system comes with a pre-configured Super Admin user:

**Phone Number:** `8297808410`
**Role:** `SUPER_ADMIN`
**Authentication:** SMS OTP-based (no password)

### How to Login as Super Admin:
1. Send OTP to `8297808410`
2. Check SMS for the 6-digit OTP
3. Verify OTP to get JWT token
4. Use the token to access all administrative functions

```bash
# Login as Super Admin
curl -X POST http://localhost:5000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "8297808410"}'

# Verify OTP (replace with actual OTP from SMS)
curl -X POST http://localhost:5000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "8297808410", "otp": "123456"}'
```

---

## Database Schema

### User Model
```prisma
model User {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  phoneNumber      String   @unique
  name             String?
  role             UserRole @default(USER)
  isPhoneVerified  Boolean  @default(false)
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt()
  createdBy        String?  @db.ObjectId // Reference to admin who created this user
}
```

### User Roles Enum
```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  EMPLOYEE
  USER
}
```

### OTP Model
```prisma
model OTP {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  phoneNumber String
  otp         String
  expiresAt   DateTime
  isUsed      Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

---

## Environment Variables

```env
# Database
DATABASE_URL="mongodb+srv://..."

# JWT Configuration
JWT_SECRET="your_jwt_secret_here"
JWT_EXPIRES_IN="365d"

# SMS Configuration (DLT Compliant)
SMS_API_URL="https://api.authkey.io/request"
SMS_AUTH_KEY="your_authkey_here"
SMS_SENDER_ID="NGTECH"
SMS_TEMPLATE_ID="your_dlt_template_id"
```

---

## Security Features

1. **Passwordless Authentication**: No password storage, SMS OTP-based authentication
2. **JWT Security**: Tokens are signed and include expiration
3. **Phone Number Verification**: OTP-based SMS verification with DLT compliance
4. **Input Validation**: Comprehensive validation using class-validator with phone number format validation
5. **Error Handling**: Secure error messages without sensitive information
6. **Rate Limiting**: Ready for implementation (recommended for production)
7. **DLT Compliance**: Uses registered SMS templates for transactional messages only

---

## SMS Features

### OTP SMS Template
- DLT-compliant transactional SMS template
- Clear OTP display with expiration information
- Registered template ID for compliance
- Professional sender ID (NGTECH)

### SMS Compliance
- Only transactional OTPs are sent (no promotional messages)
- Uses registered DLT templates
- Compliant with TRAI regulations
- No welcome SMS (removed due to DLT restrictions)

---

## Production Considerations

1. **Rate Limiting**: Implement rate limiting for OTP endpoints to prevent SMS abuse
2. **SMS Monitoring**: Monitor SMS delivery success rates and configure backup SMS providers
3. **DLT Compliance**: Ensure all SMS templates are registered and approved
4. **Token Refresh**: Consider implementing refresh tokens for long-term sessions
5. **Audit Logging**: Log authentication attempts and admin actions for security monitoring
6. **CORS Configuration**: Configure CORS for frontend integration
7. **HTTPS**: Ensure all authentication endpoints use HTTPS in production
8. **Environment Variables**: Secure all sensitive environment variables (SMS API keys)
9. **Database Security**: Implement proper MongoDB security and access controls
10. **Role Validation**: Ensure role-based access control is properly enforced
11. **SMS Cost Management**: Monitor SMS usage and implement cost controls
12. **Phone Number Validation**: Implement robust phone number validation for Indian numbers

---

## Quick Start Guide

### For Developers:
1. **Clone and Setup**: Clone the repository and install dependencies
2. **Environment**: Configure `.env` file with database and SMS API settings
3. **Database**: Run `npx prisma generate` and `npm run prisma:seed`
4. **Start Server**: Run `npm run start:dev` (server runs on port 5000)
5. **Test API**: Use the provided cURL examples or import into Postman

### For Frontend Integration:
1. **Base URL**: `http://localhost:5000` (development)
2. **Authentication Flow**: Use SMS OTP-based authentication
3. **JWT Handling**: Store JWT tokens securely and include in Authorization headers
4. **Role Management**: Implement role-based UI components
5. **Error Handling**: Handle 401/403 responses appropriately
6. **Phone Input**: Implement phone number input with Indian number validation

---

## API Features Summary

✅ **OTP-based Authentication** (passwordless)
✅ **Role-based Access Control** (4 user levels)
✅ **JWT Token Management** (365-day expiration)
✅ **Email Verification** with professional templates
✅ **User Management** (create, activate/deactivate, delete)
✅ **Admin Panel Ready** (all endpoints for user management)
✅ **MongoDB Integration** with Prisma ORM
✅ **Input Validation** and comprehensive error handling
✅ **Professional Email Templates** with company branding
✅ **Scalable Architecture** ready for production deployment

---

## Support

For technical support or questions about this API, please contact:
- **Email**: info@nighatechglobal.com
- **Company**: NighaTech Global
- **Super Admin**: nighatechglobal@gmail.com

---

*Last Updated: December 2024*
*API Version: 2.0.0*
*Server Port: 5000*