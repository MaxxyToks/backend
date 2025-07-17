import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Alchemy, Network, WebhookType } from "alchemy-sdk";
import { ethers } from 'ethers';
import { ChainNames, ContractType, getChainIdByName, getContractAbi } from 'modules/blockchain/constants';
import { ERC20Abi } from 'modules/blockchain/contract-types';
import { EvmUtils } from 'modules/blockchain/evm.utils';
import { AccountRepository } from 'modules/database/repository/account.repository';
import { ObservationRepository } from 'modules/database/repository/observation.repository';
import { SettingsService } from 'modules/settings/settings.service';
import { UserService } from 'modules/user/user.service';

export type AlchemyWebhookType =
    | "MINED_TRANSACTION"
    | "DROPPED_TRANSACTION"
    | "ADDRESS_ACTIVITY";

export interface AlchemyWebhookEvent {
    webhookId: string;
    id: string;
    createdAt: Date;
    type: AlchemyWebhookType;
    event: Record<any, any>;
}

@Injectable()
export class AlchemyNotifyService {
    private readonly logger = new Logger(AlchemyNotifyService.name);
    private alchemyConfig = {};
    private hooks = {};

    private readonly chainNetworkMapping = {
        [ChainNames.ETHEREUM]: Network.ETH_MAINNET,
        [ChainNames.ARBITRUM]: Network.ARB_MAINNET,
        [ChainNames.BASE]: Network.BASE_MAINNET,
        [ChainNames.OPTIMISM]: Network.OPT_MAINNET,
        [ChainNames.ZKSYNC]: Network.ZKSYNC_MAINNET,
        [ChainNames.POLYGON]: Network.POLYNOMIAL_MAINNET,
        [ChainNames.SCROLL]: Network.SCROLL_MAINNET,
        [ChainNames.BSC]: Network.BNB_MAINNET,
        [ChainNames.GNOSIS]: Network.GNOSIS_MAINNET,
        [ChainNames.AVALANCHE]: Network.AVAX_MAINNET,
        [ChainNames.FANTOM]: Network.FANTOM_MAINNET,
        [ChainNames.SONIC]: Network.SONIC_MAINNET,
    };

    constructor(
        private readonly userService: UserService,
        private readonly settingsService: SettingsService,
        private readonly evmUtils: EvmUtils,
        private readonly accountRepository: AccountRepository,
        private readonly eventEmitter: EventEmitter2,
        private readonly observationRepository: ObservationRepository
    ) {
        for (const [chainName, network] of Object.entries(this.chainNetworkMapping)) {
            this.alchemyConfig[chainName] = network;
            this.alchemyConfig[network] = chainName;
        }
    }

    public async createAlchemyHook(): Promise<void> {
        const appUrl = this.settingsService.getSettings().app.appUrl;
        const webHookUrl = `${appUrl}/api/alchemy-notify/alchemy-webhook`;
        this.logger.log(`Webhook URL: ${webHookUrl}`);

        const settings = {
            authToken: this.settingsService.getSettings().alchemy.apiKey,
            network: Network.ETH_MAINNET,
        };

        const alchemy = new Alchemy(settings);
        try {
            const addresses = await this.accountRepository.getAllAddresses();
            const evmAddresses = addresses.filter(this.evmUtils.isEvmWalletAddress);

            const existingHooks = await alchemy.notify.getAllWebhooks();

            for (const [chainName, network] of Object.entries(this.chainNetworkMapping)) {
                let hookExists = false;
                for (const hook of existingHooks.webhooks) {
                    if (hook.network === network) {
                        hookExists = true;
                        this.hooks[hook.id] = chainName;
                        await alchemy.notify.updateWebhook(hook.id, {
                            addAddresses: evmAddresses,
                        });
                        this.logger.log(`Webhook for network ${network} already exists and has been updated: ${JSON.stringify(hook)}`);
                        break;
                    }
                }
                if (!hookExists) {
                    const newHook = await alchemy.notify.createWebhook(
                        webHookUrl,
                        WebhookType.ADDRESS_ACTIVITY,
                        {
                            network,
                            addresses: evmAddresses,
                        }
                    );
                    this.hooks[newHook.id] = chainName;
                    this.logger.log(`Webhook for network ${network} was successfully created: ${JSON.stringify(newHook)}`);
                }
            }
        } catch (error) {
            this.logger.error('Error while creating Alchemy webhook:', error);
        }
    }

    public async addAddressesToAlchemyHook(addresses: string[]): Promise<void> {
        const settings = {
            authToken: this.settingsService.getSettings().alchemy.apiKey,
            network: Network.ETH_MAINNET,
        };
        const alchemy = new Alchemy(settings);
        try {
            const existingHooks = await alchemy.notify.getAllWebhooks();
            for (const hook of existingHooks.webhooks) {
                if (hook.id in this.hooks) {
                    const chainName = this.hooks[hook.id];
                    await alchemy.notify.updateWebhook(hook.id, {
                        addAddresses: addresses,
                    });
                    this.logger.log(`Addresses ${addresses} added to webhook for network ${chainName}`);
                }
            }
        } catch (error) {
            this.logger.error('Error while adding addresses to Alchemy webhook:', error);
        }
    }

    public async removeAddressesFromAlchemyHook(addresses: string[]): Promise<void> {
        const settings = {
            authToken: this.settingsService.getSettings().alchemy.apiKey,
            network: Network.ETH_MAINNET,
        };
        const alchemy = new Alchemy(settings);
        try {
            const existingHooks = await alchemy.notify.getAllWebhooks();
            for (const hook of existingHooks.webhooks) {
                if (hook.id in this.hooks) {
                    const chainName = this.hooks[hook.id];
                    await alchemy.notify.updateWebhook(hook.id, {
                        removeAddresses: addresses,
                    });
                    this.logger.log(`Addresses ${addresses} removed from webhook for network ${chainName}`);
                }
            }
        } catch (error) {
            this.logger.error('Error while removing addresses from Alchemy webhook:', error);
        }
    }

    public async handleAlchemyWebhook(body: AlchemyWebhookEvent): Promise<void> {

        if (body.type !== 'ADDRESS_ACTIVITY') {
            this.logger.warn(`Skipping webhook of type: ${body.type}`);
            return;
        }

        const activityArray = body.event?.activity;
        if (!activityArray || !Array.isArray(activityArray) || !activityArray.length) {
            this.logger.warn('No activity found in Alchemy webhook payload.');
            return;
        }

        for (const activity of activityArray) {

            const from = activity.fromAddress?.toLowerCase();
            const to = activity.toAddress?.toLowerCase();
            const transactionHash = activity.hash || activity.transactionHash;

            let { tokenSymbol, value } = await (async (): Promise<{ tokenSymbol: string, value: string }> => {
                switch (activity.category) {
                    case 'external':
                        return { tokenSymbol: 'ETH', value: activity.value };
                    case 'token':
                        const tokenAddress = activity.rawContract.address;
                        const contract = this.evmUtils.getContract<ERC20Abi>(this.alchemyConfig[Network[body.event.network]], tokenAddress, getContractAbi(ContractType.ERC20));
                        return { tokenSymbol: await contract.symbol(), value: this.evmUtils.toEth(ethers.utils.defaultAbiCoder.decode(['uint256'], activity.rawContract.rawValue).toString(), await contract.decimals()) }
                    default:
                        throw Error("Unsupported type");
                }
            })()

            if (to) {

                const observations = await this.observationRepository.getObservationsByObservedAddress(to);

                if (!observations.length) {
                    this.logger.warn(`No observations found for address: ${to}`);
                } else {
                    for (let observation of observations) {
                        const user = await this.userService.getUserById(observation.userId);
                        if (observation.tokenSymbol !== 'all' && observation.tokenSymbol !== tokenSymbol) {
                            this.logger.warn(`Skipping observation for token: ${observation.tokenSymbol}`);
                            continue;
                        }
                        if (observation.chainName !== 'all' && observation.chainName !== this.alchemyConfig[Network[body.event.network]]) {
                            this.logger.warn(`Skipping observation for chain: ${observation.chainName}`);
                            continue;
                        }
                        const incomingTransfer = {
                            userId: observation.userId,
                            telegramId: user?.telegramID,
                            chainId: getChainIdByName(this.alchemyConfig[Network[body.event.network]]),
                            from,
                            to,
                            valueWithDecimals: value,
                            tokenSymbol,
                            transactionHash,
                            transferData: JSON.stringify(activity),
                        };

                        this.eventEmitter.emit(
                            'notification.created.incoming-transfer',
                            incomingTransfer
                        );
                    }
                }

                const users = await this.userService.getUsersByAddress(to);

                if (!users.length) {
                    this.logger.warn(`No users found for address: ${to}`);
                    continue;
                }

                const senders = await this.userService.getUsersByAddress(from);
                if (senders.length) {
                    if (senders[0].id === users[0].id) {
                        this.logger.warn(`Skipping self-transfer from ${from} to ${to}`);
                        continue;
                    }
                }

                for (const user of users) {
                    const recipient = await this.userService.getUserAccount(user.id, to);
                    if (recipient.notificationsEnabled) {
                        this.logger.warn(`Notifications are disabled for user: ${user.id}`);
                        continue;
                    }
                    const incomingTransfer = {
                        userId: user.id,
                        telegramId: user.telegramID,
                        chainId: getChainIdByName(this.alchemyConfig[Network[body.event.network]]),
                        from,
                        to,
                        valueWithDecimals: value,
                        tokenSymbol,
                        transactionHash,
                        transferData: JSON.stringify(activity),
                    };
                    this.eventEmitter.emit(
                        'notification.created.incoming-transfer',
                        incomingTransfer
                    );
                }
            }
        }
    }
}

