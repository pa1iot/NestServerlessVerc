import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Temporarily disabled for demo
    // await this.$connect();
  }

  // Removed onModuleDestroy and enableShutdownHooks for serverless compatibility
}
