import { Body, Controller, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { AlchemyNotifyService } from './alchemy-notify.service';


@ApiTags('AlchemyNotify')
@Controller('alchemy-notify')
export class AlchemyNotifyController {
  private readonly logger = new Logger(AlchemyNotifyController.name);

  constructor(
    private readonly alchemyService: AlchemyNotifyService,
  ) { }

  @Post('alchemy-webhook')
  @ApiResponse({ status: 200, description: 'Webhook processed successfully.' })
  async alchemyWebhook(@Body() body: any, @Res() res: Response): Promise<Response> {
    try {
      await this.alchemyService.handleAlchemyWebhook(body);

      return res.status(HttpStatus.OK).json({ status: 'ok' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
    }
  }
}
