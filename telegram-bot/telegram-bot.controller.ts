import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

import { TelegramBotService } from './telegram-bot.service';

@Controller('telegram')
export class TelegramBotController {
  constructor(private readonly botService: TelegramBotService) {}

  @Post()
  async handleWebhook(@Req() req: Request, @Res() res: Response): Promise<unknown> {
    const webhookCallback = await this.botService.getWebhookCallback();
    return webhookCallback(req, res); // Delegate to Grammy's webhook handler
  }
}
