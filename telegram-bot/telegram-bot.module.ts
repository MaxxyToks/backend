import { Module } from "@nestjs/common";

import { ChatModule } from '../modules/chat/chat.module';
import { SettingsModule } from '../modules/settings/settings.module';
import { UserModule } from '../modules/user/user.module';

import { BotService } from "./bot.service";
import { TelegramBotController } from "./telegram-bot.controller";
import { TelegramBotService } from "./telegram-bot.service";
import { WhisperService } from "./whisper.service";

@Module({
  imports: [SettingsModule, UserModule, ChatModule],
  controllers: [TelegramBotController],
  providers: [TelegramBotService, BotService, WhisperService],
  exports: [BotService],
})
export class TelegramBotModule {}
