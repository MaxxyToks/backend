import { Module } from '@nestjs/common';
import { KmsService } from './kms.service';
import { DatabaseModule } from '../../database/database.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [DatabaseModule, SettingsModule],
  providers: [KmsService],
  exports: [KmsService],
})
export class KmsModule {} 