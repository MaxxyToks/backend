// events.module.ts
import { forwardRef, Module } from '@nestjs/common';

import { EvmUtils } from '../modules/blockchain/evm.utils';
import { UserModule } from '../modules/user/user.module';

import { AuthModule } from './../auth/auth.module';
import { WebSocketGatewayService } from './websocket-gateway.service';

@Module({
  imports: [AuthModule, forwardRef(() => UserModule)], // Wrap in forwardRef() if there's a circular dependency
  providers: [WebSocketGatewayService, EvmUtils],
  exports: [WebSocketGatewayService],
})
export class WebSocketGatewayModule {}
