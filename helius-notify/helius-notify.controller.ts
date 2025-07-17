import { Body, Controller, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { HeliusNotifyService } from './helius-notify.service';


@ApiTags('HeliusNotify')
@Controller('helius-notify')
export class HeliusNotifyController {
  private readonly logger = new Logger(HeliusNotifyController.name);

  constructor(
    private readonly heliusService: HeliusNotifyService,
  ) { }

  @Post('helius-webhook')
  @ApiResponse({ status: 200, description: 'Webhook processed successfully.' })
  async heliusWebhook(@Body() body: any, @Res() res: Response): Promise<Response> {
    try {
      await this.heliusService.handleHeliusWebhook(body);

      return res.status(HttpStatus.OK).json({ status: 'ok' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
    }
  }
}
