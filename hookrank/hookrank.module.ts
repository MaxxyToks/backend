import { Module } from '@nestjs/common';

import { HooksService } from './hookrank.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  providers: [HooksService],
  exports: [HooksService],
})
export class HookRankModule {}
