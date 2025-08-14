import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackDeviceDto } from './dto/track-device.dto';
import { TrackingGateway } from './tracking.gateway';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trackingGateway: TrackingGateway
  ) {}

  async createMultiple(count: number) {
    console.log(`⚙️  Creating ${count} devices`);

    const devices: {
      code: string;
      qrCodeUrl: string;
      status: 'ACTIVE' | 'INACTIVE';
    }[] = [];

    for (let i = 0; i < count; i++) {
      const code = this.generateRandomCode();
      console.log(`👉 Generated code: ${code}`);

      try {
        const qrCodeUrl = await this.generateQrCode(code);
        console.log(`✅ QR code generated for ${code}: ${qrCodeUrl}`);

        devices.push({
          code,
          qrCodeUrl,
          status: 'INACTIVE',
        });
      } catch (error) {
        console.error(`❌ Failed to generate QR for code ${code}`, error);
      }
    }

    try {
      const result = await this.prisma.device.createMany({
        data: devices,
      });
      console.log(`🎉 Devices inserted into DB:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to insert devices into DB`, error);
      throw error;
    }
  }

  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log(`🔢 generateRandomCode: ${code}`);
    return code;
  }

  private async generateQrCode(code: string): Promise<string> {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${code}`;
    console.log(`🖨️  generateQrCode URL: ${url}`);
    return url;
  }

async findAll() {
  // console.log(`📥 Fetching all devices with user details`);
  return this.prisma.device.findMany({
  include: {
    user: {
      select: {
        id: true,
        name: true,
      },
    },
  },
});
}


  // async findAssignedToUser(userId: number) {
  //   console.log(`📥 Fetching devices assigned to user ${userId}`);
  //   return this.prisma.device.findMany({
  //     where: { assignedTo: userId },
  //     include: {
  //     user: {
  //       select: {
  //         id: true,
  //         name: true,
  //       },
  //     },
  //   },
  //   });
  // }

  async findAssignedToUser(userId: number) {
  console.log(`📥 Fetching devices assigned or shared to user ${userId}`);

  const assignedDevices = await this.prisma.device.findMany({
    where: { assignedTo: userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const sharedDevices = await this.prisma.sharedDevice.findMany({
    where: { userId },
    include: {
      device: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Mark assigned devices
  const assignedWithFlag = assignedDevices.map((device) => ({
    ...device,
    isShared: false,
  }));

  // Mark shared devices
  const sharedWithFlag = sharedDevices.map((shared) => ({
    ...shared.device,
    isShared: true,
  }));

  return [...assignedWithFlag, ...sharedWithFlag];
}


  async assignDevice(code: string, userId: number) {
    console.log(`🔗 Assigning device ${code} to user ${userId}`);
    return this.prisma.device.updateMany({
    where: { code, assignedTo: null },
    data: { assignedTo: userId, assignedAt: new Date(), status: 'ACTIVE', }
  });
  }

  async trackDevice(code: string, iotSimNumber: string, dto: TrackDeviceDto) {
    const device = await this.prisma.device.findUnique({
      where: { code, iotSimNumber },
      select: {
        assignedTo: true,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (!device.assignedTo) {
      throw new BadRequestException('This device is not assigned, cannot track.');
    }

    const tracked = await this.prisma.tracking.create({
    data: {
      deviceCode: code,
      iotSimNumber: iotSimNumber,
      userId: device.assignedTo,
      lat: dto.lat,
      long: dto.long,
      level: dto.level,
      altitude: dto.altitude,
      speed: dto.speed,
      compress: dto.compress,
      weight: dto.weight,
      noOfSatellites: dto.noOfSatellites,
    },
  });
   this.trackingGateway.sendLocationUpdate(code, tracked);
    return tracked;
}

async getTrackingHistory(code: string, userId: number, date?: string) {
  const device = await this.prisma.device.findUnique({
    where: { code },
    select: {
      id: true,
      assignedTo: true,
    },
  });

  if (!device) {
    throw new NotFoundException('Device not found');
  }

  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new ForbiddenException('User not found');
  }

  // if (user.role !== 'SUPER_ADMIN' && device.assignedTo !== userId) {
  //   throw new ForbiddenException('You are not allowed to view this device\'s data');
  // }

  if (user.role !== 'SUPER_ADMIN' && device.assignedTo !== userId) {
    const isShared = await this.prisma.sharedDevice.findFirst({
      where: {
        deviceId: device.id,
        userId,
      },
    });

if (!isShared) {
      throw new ForbiddenException('You are not allowed to view this device\'s data');
    }
}


  const whereCondition: any = {
    deviceCode: code,
  };

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    whereCondition.trackedAt = {
      gte: start,
      lte: end,
    };
  }

  return this.prisma.tracking.findMany({
    where: whereCondition,
    orderBy: { trackedAt: 'asc' },
  });
}



async updateIotSimNumberByCode(code: string, iotSimNumber: string) {
  const existing = await this.prisma.device.findUnique({
    where: { code },
  });

  if (!existing) {
    throw new Error('Device not found');
  }

  return this.prisma.device.update({
    where: { id: existing.id },
    data: {
      iotSimNumber,
    },
  });
}

async getDeviceByCode(code: string) {
  const device = await this.prisma.device.findUnique({
    where: { code },
    select: {
      code: true,
      deviceName: true,
      iotSimNumber: true,
      assignedTo: true,
      assignedAt: true,
      status: true,
      createdAt: true,
    },
  });

  if (!device) {
    throw new NotFoundException('Device not found');
  }

  return device;
}

async updateDeviceName(code: string, deviceName: string) {
  const updated = await this.prisma.device.update({
    where: { code },
    data: { deviceName },
  });
  return updated;
}

  // Share a device
  async shareDevice(deviceId: number, phoneNumber: string) {

    const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) throw new NotFoundException('User with this mobile number not found');

    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Device not found');

    const alreadyShared = await this.prisma.sharedDevice.findFirst({
      where: { deviceId, userId: user.id },
    });
    if (alreadyShared) throw new ConflictException('Device already shared with this user');

    return this.prisma.sharedDevice.create({
      data: {
        deviceId,
        userId: user.id,
      },
    });
  }

  async unshareDevice(deviceId: number, userId: number) {
  const existing = await this.prisma.sharedDevice.findUnique({
    where: {
      deviceId_userId: {
        deviceId,
        userId,
      },
    },
  });

  if (!existing) {
    throw new NotFoundException('No sharing found to revoke');
  }

  await this.prisma.sharedDevice.delete({
    where: {
      deviceId_userId: {
        deviceId,
        userId,
      },
    },
  });

  return { message: 'Access revoked' };
}

  // Get all shared devices for a user
  async getSharedDevices(userId: number) {
    return this.prisma.sharedDevice.findMany({
      where: { userId },
      include: {
        device: true,
      },
    });
  }

  async getUsersSharedWithDevice(deviceId: number) {
  const shares = await this.prisma.sharedDevice.findMany({
    where: { deviceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phoneNumber: true,
        },
      },
    },
  });

  return shares.map((share) => share.user);
}



}
