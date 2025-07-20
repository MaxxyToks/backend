import { Module } from '@nestjs/common';

import { BlockchainModule } from '../blockchain/blockchain.module';
import { KmsModule } from '../modules/kms/kms.module';
import { RedisModule } from '../modules/redis/redis.module';
import { TokensModule } from '../modules/tokens/tokens.module';
import { UserModule } from '../modules/user/user.module';

import { FeeModule } from '../modules/fee/fee.module';
import { AcrossService } from './across.service';

@Module({
  imports: [BlockchainModule, KmsModule, UserModule, RedisModule, TokensModule, FeeModule],
  providers: [AcrossService],
  exports: [AcrossService],
})
export class AcrossModule { }
