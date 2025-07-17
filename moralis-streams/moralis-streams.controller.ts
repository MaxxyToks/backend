import { Body, Controller, HttpStatus, Logger, Post, Res } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';


import { MoralisStreamsService } from './moralis-streams.service';

@ApiTags('MoralisStreams')
@Controller('moralis-streams')
export class MoralisStreamsController {
  private readonly logger = new Logger(MoralisStreamsController.name);

  constructor(
    private readonly moralisService: MoralisStreamsService,
  ) { }

  @Post('moralis-webhook')
  @ApiResponse({ status: 200, description: 'Webhook processed successfully.' })
  async moralisWebhook(@Body() body: any, @Res() res: Response): Promise<Response> {
    try {

      await this.moralisService.handleMoralisWebhook(body);

      return res.status(HttpStatus.OK).json({ status: 'ok' });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error });
    }
  }
}
