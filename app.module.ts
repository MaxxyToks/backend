import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import all your modules
import { ChatModule } from './chat/chat.module';
import { DatabaseModule } from './database/database.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { HyperswapModule } from './hyperswap/hyperswap.module';
import { JupiterModule } from './jupiter/jupiter.module';
import { OneinchModule } from './oneinch/oneinch.module';
import { SonicModule } from './sonic/sonic.module';
import { DexscreenerModule } from './dexscreener/dexscreener.module';
import { DextoolsModule } from './dextools/dextools.module';
import { TopTokensModule } from './top-tokens/top-tokens.module';
import { TokensModule } from './tokens/tokens.module';
import { SwapOrdersModule } from './swap-orders/swap-orders.module';
import { DcaModule } from './dca/dca.module';
import { FeeModule } from './fee/fee.module';
import { JobModule } from './jobs/job.module';
import { KmsModule } from './kms/kms.module';
import { RedisModule } from './redis/redis.module';
import { ScriptsModule } from './scripts/scripts.module';
import { SettingsModule } from './settings/settings.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { WebsocketGatewayModule } from './websocket-gateway/websocket-gateway.module';
import { AlchemyNotifyModule } from './alchemy-notify/alchemy-notify.module';
import { HeliusNotifyModule } from './helius-notify/helius-notify.module';
import { MoralisStreamsModule } from './moralis-streams/moralis-streams.module';
import { AcrossModule } from './across/across.module';
import { CryptocurrencyAnalystModule } from './cryptocurrency-analyst/cryptocurrency-analyst.module';
import { HookrankModule } from './hookrank/hookrank.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ChatModule,
    BlockchainModule,
    HyperswapModule,
    JupiterModule,
    OneinchModule,
    SonicModule,
    DexscreenerModule,
    DextoolsModule,
    TopTokensModule,
    TokensModule,
    SwapOrdersModule,
    DcaModule,
    FeeModule,
    JobModule,
    KmsModule,
    RedisModule,
    ScriptsModule,
    SettingsModule,
    TelegramBotModule,
    WebsocketGatewayModule,
    AlchemyNotifyModule,
    HeliusNotifyModule,
    MoralisStreamsModule,
    AcrossModule,
    CryptocurrencyAnalystModule,
    HookrankModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {} 