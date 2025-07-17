import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';

import { EvmUtils } from 'modules/blockchain/evm.utils';
import { UserModule } from 'modules/user/user.module';

import { HeliusNotifyController } from './helius-notify.controller';
import { HeliusNotifyService } from './helius-notify.service';

@Module({
    imports: [
        HttpModule,
        forwardRef(() => UserModule),
    ],
    controllers: [HeliusNotifyController],
    providers: [HeliusNotifyService, EvmUtils],
    exports: [HeliusNotifyService],
})
export class HeliusNotifyModule { }
