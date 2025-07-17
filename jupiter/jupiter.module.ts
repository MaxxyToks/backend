import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SolanaUtils } from 'modules/blockchain/solana.utils';
import { DexToolsModule } from 'modules/dextools/dextools.module';
import { FeeModule } from 'modules/fee/fee.module';
import { KmsModule } from 'modules/kms/kms.module';
import { JupiterService } from './jupiter.service';

@Module({
  imports: [HttpModule, KmsModule, DexToolsModule, FeeModule],
  providers: [JupiterService, SolanaUtils],
  exports: [JupiterService],
})
export class JupiterModule { }
