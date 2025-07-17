import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SettingsModule } from 'modules/settings/settings.module';

import { EvmUtils } from 'modules/blockchain/evm.utils';
import { SolanaUtils } from 'modules/blockchain/solana.utils';
import { SonicUtils } from 'modules/sonic/sonic.utils';
import { DexToolsService } from './dextools.service';

@Module({
  imports: [SettingsModule, HttpModule],
  providers: [DexToolsService, SonicUtils, EvmUtils, SolanaUtils],
  exports: [DexToolsService],
})
export class DexToolsModule { }
