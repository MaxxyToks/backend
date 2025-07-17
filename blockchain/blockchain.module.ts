import { forwardRef, Module } from '@nestjs/common';

import { DexToolsModule } from 'modules/dextools/dextools.module';
import { KmsModule } from 'modules/kms/kms.module';
import { TokensModule } from 'modules/tokens/tokens.module';

import { DcaModule } from 'modules/dca/dca.module';
import { FeeModule } from 'modules/fee/fee.module';
import { HyperSwapModule } from 'modules/hyperswap/hyperswap.module';
import { JupiterModule } from 'modules/jupiter/jupiter.module';
import { OneinchModule } from 'modules/oneinch/oneinch.module';
import { SonicModule } from 'modules/sonic/sonic.module';
import { SwapOrdersModule } from 'modules/swap-orders/swap-orders.module';
import { BlockchainService } from './blockchain.service';
import { EvmUtils } from './evm.utils';
import { SolanaUtils } from './solana.utils';




@Module({
  imports: [
    OneinchModule,
    KmsModule,
    TokensModule,
    DexToolsModule,
    HyperSwapModule,
    JupiterModule,
    SonicModule,
    DcaModule,
    SwapOrdersModule,
    forwardRef(() => FeeModule)
  ],
  providers: [BlockchainService, EvmUtils, SolanaUtils],
  exports: [BlockchainService, EvmUtils, SolanaUtils],
})
export class BlockchainModule { }
