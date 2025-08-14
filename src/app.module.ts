import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [AuthModule, PrismaModule, DevicesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
