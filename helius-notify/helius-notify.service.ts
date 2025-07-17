import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Helius, TransactionType } from 'helius-sdk';
import { ChainNames, getChainIdByName } from 'modules/blockchain/constants';

import { AccountRepository } from 'modules/database/repository/account.repository';
import { SettingsService } from 'modules/settings/settings.service';
import { UserService } from 'modules/user/user.service';

export interface HeliusWebhookEvent {
    webhookId: string;
    id: string;
    createdAt: Date;
    type: string;
    event: any;
}

@Injectable()
export class HeliusNotifyService {
    private readonly logger = new Logger(HeliusNotifyService.name);
    private helius: Helius;
    private hooks = {};

    constructor(
        private readonly userService: UserService,
        private readonly settingsService: SettingsService,
        private readonly accountRepository: AccountRepository,
        private readonly eventEmitter: EventEmitter2,
    ) {
        const heliusApiKey = this.settingsService.getSettings().helius.apiKey;
        this.helius = new Helius(heliusApiKey);
    }

    public isSolanaWalletAddress(address: string): boolean {
        return !address.startsWith('0x');
    }

    public async createHeliusHook(): Promise<void> {
        const appUrl = this.settingsService.getSettings().app.appUrl;
        const webhookUrl = `${appUrl}/api/helius-notify/helius-webhook`;
        this.logger.log(`Webhook URL: ${webhookUrl}`);

        const addresses = await this.accountRepository.getAllAddresses();
        const solanaAddresses = addresses.filter(this.isSolanaWalletAddress);

        try {
            const existingHooks = await this.helius.getAllWebhooks();
            let hookExists = false;

            for (const hook of existingHooks) {
                if (hook.webhookURL === webhookUrl) {
                    hookExists = true;
                    this.hooks[hook.webhookID] = true;
                    await this.helius.appendAddressesToWebhook(hook.webhookID, solanaAddresses);
                    this.logger.log(`Helius webhook already exists and has been updated: ${JSON.stringify(hook)}`);
                    break;
                }
            }

            if (!hookExists) {
                const newHook = await this.helius.createWebhook({
                    accountAddresses: solanaAddresses,
                    transactionTypes: [TransactionType.ANY],
                    webhookURL: webhookUrl,
                });
                this.hooks[newHook.webhookID] = true;
                this.logger.log(`Helius webhook created successfully: ${JSON.stringify(newHook)}`);
            }
        } catch (error) {
            this.logger.error('Error creating Helius webhook:', error);
        }
    }


    public async handleHeliusWebhook(body: any): Promise<void> {
        const events = Array.isArray(body) ? body : [body];

        for (const activity of events) {
            if (activity.type !== 'TRANSFER') {
                this.logger.warn(`Unsupported activity type: ${activity.type}`);
                continue;
            }

            let tokenSymbol = '';
            let value: number | string = '';

            if (activity.nativeTransfers && activity.nativeTransfers.length > 0) {
                tokenSymbol = 'SOL';
                value = activity.nativeTransfers[0].amount;
                value = activity.nativeTransfers[0].amount / 1e9;
            }

            else if (activity.tokenTransfers && activity.tokenTransfers.length > 0) {
                tokenSymbol = activity.tokenSymbol || 'unknown token';
                value = activity.tokenTransfers[0].amount;
            }
            else {
                this.logger.warn(`No transfer data found in activity: ${JSON.stringify(activity)}`);
                continue;
            }

            const from = activity.nativeTransfers && activity.nativeTransfers.length > 0
                ? activity.nativeTransfers[0].fromUserAccount
                : undefined;
            const to = activity.nativeTransfers && activity.nativeTransfers.length > 0
                ? activity.nativeTransfers[0].toUserAccount
                : undefined;

            if (!to) {
                this.logger.warn(`No destination address in activity: ${JSON.stringify(activity)}`);
                continue;
            }
            const users = await this.userService.getUsersBySolanaAddress(to);
            if (!users || users.length === 0) {
                this.logger.warn(`No users found for address: ${to}`);
                continue;
            }

            const senders = await this.userService.getUsersBySolanaAddress(from);
            if (senders && senders.length > 0 && senders[0].id === users[0].id) {
                this.logger.warn(`Skipping self-transfer from ${from} to ${to}`);
                continue;
            }

            for (const user of users) {
                const incomingTransfer = {
                    userId: user.id,
                    telegramId: user.telegramID,
                    chainId: getChainIdByName(ChainNames.SOLANA),
                    from,
                    to,
                    valueWithDecimals: value,
                    tokenSymbol,
                    transactionSignature: activity.signature,
                    transferData: JSON.stringify(activity),
                };
                this.eventEmitter.emit('notification.created.incoming-transfer', incomingTransfer);
            }
        }
    }
}
