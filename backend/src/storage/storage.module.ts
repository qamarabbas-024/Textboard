import { Module } from '@nestjs/common';
import { StorageMaintenanceService } from './storage-maintenance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [StorageMaintenanceService],
  exports: [StorageMaintenanceService],
})
export class StorageModule {}
