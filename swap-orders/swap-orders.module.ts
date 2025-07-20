import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvmUtils } from '../modules/blockchain/evm.utils';
import { HyperSwapModule } from '../modules/hyperswap/hyperswap.module';
import { SonicModule } from '../modules/sonic/sonic.module';
import { SwapOrder } from '../database/entities/swap-order.entity';
import { SwapOrdersService } from './swap-orders.service';

@Module({
    imports: [
        HttpModule,
        HyperSwapModule,
        TypeOrmModule.forFeature([SwapOrder]), // Register the entity here
        SonicModule,
    ],
    providers: [SwapOrdersService, EvmUtils],
    exports: [SwapOrdersService],
})
export class SwapOrdersModule { }
