import { Controller, Post, Body, Get, Param, Query, Req, UseGuards, NotFoundException, Delete } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CreateMultipleDevicesDto } from './dto/create-multiple-devices.dto';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AssignDeviceDto } from './dto/assign-device.dto';
import { TrackDeviceDto } from './dto/track-device.dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UpdateIotSimDto } from './dto/update-iot-sim.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateDeviceNameDto } from './dto/update-device-name.dto';
import { ShareDeviceDto } from './dto/share-device.dto';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('generate')
  @ApiOperation({ summary: 'Generate multiple devices with QR codes' })
  async generateDevices(@Body() dto: CreateMultipleDevicesDto) {
    return this.devicesService.createMultiple(dto.count);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get()
  async getAllDevices() {
    return this.devicesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('assigned/:userId')
  async getUserDevices(@Param('userId') userId: string) {
    return this.devicesService.findAssignedToUser(Number(userId));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('assign')
  @ApiOperation({ summary: 'Assign device to user' })
  async assignDevice(@Body() dto: AssignDeviceDto) {
    const result = await this.devicesService.assignDevice(dto.code, dto.userId);
    if (result.count > 0) {
      return { success: true, message: 'Device assigned successfully' };
    } else {
      return { success: false, message: 'Device not found or already assigned' };
    }
  }
  // @UseGuards(JwtAuthGuard)
  @Post('tracking/:code/:iotSimNumber')
    async trackDevice(
      @Param('code') code: string,
      @Param('iotSimNumber') iotSimNumber: string,
      @Body() dto: TrackDeviceDto
    ) {
      return this.devicesService.trackDevice(code, iotSimNumber, dto);
    }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('tracking/:code/history')
  getTrackingHistory(
    @Param('code') code: string,
    @Query('date') date: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id: number };
    return this.devicesService.getTrackingHistory(code, user.id, date);
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('iotnumber')
  @ApiOperation({ summary: 'Update IoT SIM number for a device using code' })
  async updateIotSimNumber(@Body() dto: UpdateIotSimDto) {
    return this.devicesService.updateIotSimNumberByCode(dto.code, dto.iotSimNumber);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get(':code')
  @ApiOperation({ summary: 'Get device details by code' })
  async getDeviceByCode(@Param('code') code: string) {
    return this.devicesService.getDeviceByCode(code);
  }

  @Post('editname')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Edit the device name by code' })
  @ApiBody({ type: UpdateDeviceNameDto })
  async updateDeviceName(@Body() dto: UpdateDeviceNameDto) {
    const { code, deviceName } = dto;
    return this.devicesService.updateDeviceName(code, deviceName);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('share')
  @ApiOperation({ summary: 'Share a device with another user' })
  async shareDevice(@Body() dto: ShareDeviceDto) {
    return this.devicesService.shareDevice(dto.deviceId, dto.mobile);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('share')
  @ApiOperation({ summary: 'Remove device sharing for a user' })
  async unshareDevice(@Body() dto: { deviceId: number; userId: number }) {
    return this.devicesService.unshareDevice(dto.deviceId, dto.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('shared/:userId')
  @ApiOperation({ summary: 'Get devices shared with a user' })
  async getSharedDevices(@Param('userId') userId: string) {
    return this.devicesService.getSharedDevices(Number(userId));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('shared-users/:deviceId')
  @ApiOperation({ summary: 'Get users who can access the shared device' })
  async getSharedUsers(@Param('deviceId') deviceId: string) {
    return this.devicesService.getUsersSharedWithDevice(Number(deviceId));
  }

}

