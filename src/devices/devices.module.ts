import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TrackingGateway } from './tracking.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [DevicesController],
  providers: [DevicesService, TrackingGateway],
})
export class DevicesModule {}
