import { Injectable, Logger } from '@nestjs/common';
import { Bot } from 'grammy';

import { SettingsService } from '../modules/settings/settings.service';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  public bot: Bot;

  constructor(protected readonly settingsService: SettingsService) {
    this.bot = new Bot(this.settingsService.getSettings().keys.telegramBotToken);
  }

  public async sendMessage(userId: string, message: string): Promise<void> {
    await this.bot.api.sendMessage(userId, message);
  }

  public async sendChatAction(userId: string, action: any): Promise<void> {
    await this.bot.api.sendChatAction(userId, action);
  }
}
