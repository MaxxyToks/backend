import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SettingsModule } from '../modules/settings/settings.module';

import { TopTokensService } from './top-tokens.service';

@Module({
  imports: [SettingsModule, HttpModule],
  providers: [TopTokensService],
  exports: [TopTokensService],
})
export class TopTokensModule {}
