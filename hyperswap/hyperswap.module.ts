import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { EvmUtils } from '../modules/blockchain/evm.utils';
import { KmsModule } from '../modules/kms/kms.module';

import { FeeModule } from '../modules/fee/fee.module';
import { TokensModule } from '../modules/tokens/tokens.module';
import { HyperSwapService } from './hyperswap.service';
import { HyperswapUtils } from './hyperswap.utils';

@Module({
  imports: [HttpModule, KmsModule, TokensModule, FeeModule],
  providers: [HyperSwapService, EvmUtils, HyperswapUtils],
  exports: [HyperSwapService],
})
export class HyperSwapModule { }
