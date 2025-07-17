import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { EvmUtils } from 'modules/blockchain/evm.utils';
import { KmsModule } from 'modules/kms/kms.module';
import { TokensModule } from 'modules/tokens/tokens.module';

import { FeeModule } from 'modules/fee/fee.module';
import { OneinchService } from './oneinch.service';
import { OneInchUtils } from './oneinch.utils';

@Module({
  imports: [HttpModule, KmsModule, TokensModule, FeeModule],
  providers: [OneinchService, EvmUtils, OneInchUtils],
  exports: [OneinchService],
})
export class OneinchModule { }
