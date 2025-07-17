import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { EvmUtils } from 'modules/blockchain/evm.utils';
import { DexToolsModule } from 'modules/dextools/dextools.module';
import { FeeModule } from 'modules/fee/fee.module';
import { KmsModule } from 'modules/kms/kms.module';
import { SettingsModule } from 'modules/settings/settings.module';
import { TokensModule } from 'modules/tokens/tokens.module';
import { SonicService } from './sonic.service';
import { SonicUtils } from './sonic.utils';

@Module({
  imports: [HttpModule, SettingsModule, KmsModule, DexToolsModule, TokensModule, FeeModule],
  providers: [SonicService, SonicUtils, EvmUtils],
  exports: [SonicService],
})
export class SonicModule { }
