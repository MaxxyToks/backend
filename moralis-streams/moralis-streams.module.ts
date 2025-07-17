import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';

import { EvmUtils } from 'modules/blockchain/evm.utils';
import { UserModule } from 'modules/user/user.module';

import { MoralisStreamsController } from './moralis-streams.controller';
import { MoralisStreamsService } from './moralis-streams.service';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => UserModule), // Wrap in forwardRef() if there's a circular dependency
  ],
  controllers: [MoralisStreamsController],
  providers: [MoralisStreamsService, EvmUtils],
  exports: [MoralisStreamsService],
})
export class MoralisStreamsModule { }
