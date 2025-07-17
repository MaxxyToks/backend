import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { DexScreenerService } from './dexscreener.service';

@Module({
  imports: [HttpModule],
  providers: [DexScreenerService],
  exports: [DexScreenerService],
})
export class DexScreenerModule { }
