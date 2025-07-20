import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { EvmUtils } from '../modules/blockchain/evm.utils';
import { KmsModule } from '../modules/kms/kms.module';
import { TokensModule } from '../modules/tokens/tokens.module';

import { SolanaUtils } from '../modules/blockchain/solana.utils';
import { FeeService } from './fee.service';

@Module({
  imports: [HttpModule, KmsModule, TokensModule],
  providers: [FeeService, EvmUtils, SolanaUtils],
  exports: [FeeService],
})
export class FeeModule { }
