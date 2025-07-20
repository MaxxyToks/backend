import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Moralis from 'moralis';

import { mainnetChainIdsHex } from '../modules/blockchain/constants';
import { EvmUtils } from '../modules/blockchain/evm.utils';
import { AccountRepository } from '../modules/database/repository/account.repository';
import { IncomingTransferNotificationDto } from '../modules/notifications/dto/notifications.dto';
import { SettingsService } from '../modules/settings/settings.service';
import { UserService } from '../modules/user/user.service';

@Injectable()
export class MoralisStreamsService {
  private readonly logger = new Logger(MoralisStreamsService.name);

  private stream;

  constructor(
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    private readonly settingsService: SettingsService,
    private readonly evmUtils: EvmUtils,
    private readonly accountRepository: AccountRepository,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  public getStreamId(): string {
    return this.stream.id;
  }

  public async createMoralisStream(): Promise<void> {
    const appUrl = this.settingsService.getSettings().app.appUrl;
    const webHookUrl = `${appUrl}/api/moralis-streams/moralis-webhook`;

    await Moralis.start({
      apiKey: this.settingsService.getSettings().moralis.apiKey,
    });

    const ERC20_transfer_ABI = [
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: 'from', type: 'address' },
          { indexed: true, name: 'to', type: 'address' },
          { indexed: false, name: 'value', type: 'uint256' },
        ],
        name: 'Transfer',
        type: 'event',
      },
    ];

    const chains = Object.entries(mainnetChainIdsHex)
      .filter(([key]) => key !== 'scroll' && key !== 'aurora' && key !== 'sonic' && key !== 'hyper')
      .map(([_, value]) => value);

    const options = {
      chains,
      description: 'monitor all ERC20 transfers',
      tag: 'ERC20_transfers',
      abi: ERC20_transfer_ABI,
      includeContractLogs: true,
      allAddresses: false,
      topic0: ['Transfer(address,address,uint256)'],
      advancedOptions: [
        {
          topic0: 'Transfer(address,address,uint256)',
        },
      ],
      webhookUrl: webHookUrl,
    };

    try {
      this.stream = ((await Moralis.Streams.add(options)) as any).jsonResponse;

      const addresses = await this.accountRepository.getAllAddresses();

      const evmAddresses = addresses.filter(this.evmUtils.isEvmWalletAddress);

      await Promise.all(
        evmAddresses.map((address) =>
          Moralis.Streams.addAddress({
            id: this.stream.id,
            address,
          }),
        ),
      );

      this.logger.log(`Moralis stream created successfully: ${JSON.stringify(this.stream.id)}`);
    } catch (error) {
      this.logger.error('Error creating Moralis stream:', error);
    }
  }

  public async handleMoralisWebhook(body: any): Promise<void> {
    this.logger.log('Moralis webhook data:', body);

    const { erc20Transfers, chainId, confirmed } = body;

    if (!confirmed) {
      if (!erc20Transfers || !Array.isArray(erc20Transfers)) {
        this.logger.warn('No erc20Transfers found in webhook body');
        return;
      }

      for (const transfer of erc20Transfers) {
        const { from, to, valueWithDecimals, tokenSymbol, transactionHash } = transfer;

        const users = await this.userService.getUsersByAddress(to.toLowerCase());
        if (!users.length) {
          this.logger.warn(`Users not found for address ${to}`);
          continue;
        }

        for (const user of users) {
          const incomingNotification: IncomingTransferNotificationDto = {
            userId: user.id,
            telegramId: user.telegramID,
            chainId,
            from,
            to,
            valueWithDecimals,
            tokenSymbol,
            transactionHash,
            transferData: JSON.stringify(erc20Transfers),
          };

          this.eventEmitter.emit('notification.created.incoming-transfer', incomingNotification);
        }
      }
    }
  }
}
