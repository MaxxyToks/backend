import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SettingsModule } from '../modules/settings/settings.module';

import { EvmUtils } from '../modules/blockchain/evm.utils';
import { SolanaUtils } from '../modules/blockchain/solana.utils';
import { SonicUtils } from '../modules/sonic/sonic.utils';

import { TokensModule } from '../modules/tokens/tokens.module';
import { DcaService } from './dca.service';

@Module({
    imports: [SettingsModule, HttpModule, TokensModule],
    providers: [SonicUtils, EvmUtils, SolanaUtils, DcaService],
    exports: [DcaService],
})


export class DcaModule { }
