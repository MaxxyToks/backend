import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvmUtils } from '../modules/blockchain/evm.utils';
import { SolanaUtils } from '../modules/blockchain/solana.utils';
import { Erc20 } from '../modules/database/entities/erc20.entity';
import { HyperswapUtils } from '../modules/hyperswap/hyperswap.utils';
import { OneInchUtils } from '../modules/oneinch/oneinch.utils';
import { SonicUtils } from '../modules/sonic/sonic.utils';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Erc20]),
  ],
  providers: [TokensService, SonicUtils, SolanaUtils, HyperswapUtils, OneInchUtils, EvmUtils],
  exports: [TokensService],
})
export class TokensModule { }
