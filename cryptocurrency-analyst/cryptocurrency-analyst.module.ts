import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SettingsModule } from 'modules/settings/settings.module';

import { CryptocurrencyAnalystService } from './cryptocurrency-analyst.service';

@Module({
  imports: [SettingsModule, HttpModule],
  providers: [CryptocurrencyAnalystService],
  exports: [CryptocurrencyAnalystService],
})
export class CryptocurrencyAnalystModule {}
