import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';

import { EvmUtils } from '../modules/blockchain/evm.utils';
import { UserModule } from '../modules/user/user.module';

import { AlchemyNotifyController } from './alchemy-notify.controller';
import { AlchemyNotifyService } from './alchemy-notify.service';

@Module({
    imports: [
        HttpModule,
        forwardRef(() => UserModule),
    ],
    controllers: [AlchemyNotifyController],
    providers: [AlchemyNotifyService, EvmUtils],
    exports: [AlchemyNotifyService],
})
export class AlchemyNotifyModule { }
