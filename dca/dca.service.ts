// src/orders/orders.service.ts
import { Injectable, Logger } from '@nestjs/common';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ethers } from 'ethers';
import { ChainNames } from '../modules/blockchain/constants';
import { EvmUtils } from '../modules/blockchain/evm.utils';
import { DcaSubscription } from '../modules/database/entities/dca-subscription.entity';
import { TokenMetadata } from '../modules/database/entities/swap-order.entity';
import { DcaSubscriptionRepository } from '../modules/database/repository/dca-subscription.repository';
import { UserRepository } from '../modules/database/repository/user.repository';
import { CloseDcaDto, GetDcaDto, SubscribeToDcaDto } from '../modules/dca/dto/dca.dto';
import { TokensService } from '../modules/tokens/tokens.service';
import { MoreThan } from 'typeorm';

@Injectable()
export class DcaService {
    logger = new Logger(DcaService.name);

    constructor(
        private readonly dcaRepository: DcaSubscriptionRepository,
        private readonly eventEmitter: EventEmitter2,
        private readonly evmUtils: EvmUtils,
        private readonly userRepository: UserRepository,
        private readonly tokensService: TokensService
    ) { }

    public async createDca(subscriptionParams: SubscribeToDcaDto): Promise<DcaSubscription> {
        const timestamp = await this.evmUtils.getTimestamp(subscriptionParams.chainName);
        const user = await this.userRepository.getUserAccount(subscriptionParams.userId, subscriptionParams.userAddress);
        if (subscriptionParams.cycleInterval === '0') {
            throw new Error('Cycle interval cannot be 0');
        }
        if (subscriptionParams.amountPerCycle === '0') {
            throw new Error('Amount per cycle cannot be 0');
        }
        if (subscriptionParams.amount === '0') {
            throw new Error('Amount cannot be 0');
        }
        if (subscriptionParams.tokenFrom === subscriptionParams.tokenTo) {
            throw new Error('Token from and token to cannot be the same');
        }
        if (subscriptionParams.amountPerCycle > subscriptionParams.amount) {
            throw new Error('Amount per cycle cannot be greater than total amount');
        }

        const cycles = Math.floor(parseFloat(subscriptionParams.amount) / parseFloat(subscriptionParams.amountPerCycle));

        const tokenInInfo = await this.tokensService.fetchTokenAddressByTicker({
            chainName: subscriptionParams.chainName,
            symbol: subscriptionParams.tokenFrom,
        })

        const tokenIn = tokenInInfo.isNative ? { address: tokenInInfo.address, name: subscriptionParams.tokenFrom, symbol: subscriptionParams.tokenFrom } as TokenMetadata : await this.evmUtils.getTokenMetadata(
            subscriptionParams.chainName,
            (tokenInInfo).address!
        );

        const tokenOutInfo = await this.tokensService.fetchTokenAddressByTicker({
            chainName: subscriptionParams.chainName,
            symbol: subscriptionParams.tokenTo,
        })

        const tokenOut = tokenOutInfo.isNative ? { address: tokenOutInfo.address, name: subscriptionParams.tokenFrom, symbol: subscriptionParams.tokenFrom } as TokenMetadata : await this.evmUtils.getTokenMetadata(
            subscriptionParams.chainName,
            (tokenOutInfo).address!
        );
        const formatTimestamp = (ts: string) => new Date(parseInt(ts, 10) * 1000).toISOString();
        const subscription: any = {
            ...subscriptionParams,
            dcaKey: ethers.utils.id(String(timestamp + subscriptionParams.userId)),
            creationTimestamp: String(timestamp),
            cyclesLeft: cycles.toString(),
            dex: 'none',
            tokenIn,
            tokenOut,
            amountLeft: subscriptionParams.amount,
            cycles: cycles.toString(),
            lastTriggerTimestamp: '',
            createdAt: formatTimestamp(String(timestamp)),
            updatedAt: formatTimestamp(String(timestamp)),
        };

        const order = await this.dcaRepository.create(subscription);
        const savedOrder = await this.dcaRepository.save(order);
        return savedOrder;
    }

    public async closeDca(closeParams: CloseDcaDto): Promise<void> {

        const dca = await this.dcaRepository.findOne({
            where: {
                chainName: closeParams.chainName,
                userId: closeParams.userId,
                userAddress: closeParams.userAddress,
                dcaKey: closeParams.dcaKey,
            }
        });

        if (!dca) {
            throw new Error('DCA subscription not found');
        }
        await this.dcaRepository.delete(dca);
    }

    async getUserOpenSubscriptions(data: GetDcaDto): Promise<DcaSubscription[]> {
        return this.dcaRepository.find({
            where: {
                userId: data.userId,
                userAddress: data.userAddress,
                cyclesLeft: MoreThan('0')
            }
        });
    }

    async getAllOpenSubscriptions(): Promise<DcaSubscription[]> {
        return this.dcaRepository.find({
            where: {
                cyclesLeft: MoreThan('0')
            }
        });
    }



    @Cron(CronExpression.EVERY_MINUTE)
    async checkOrdersCron() {
        this.logger.log('Checking subscriptions for DCA');

        const subscriptions = await this.getAllOpenSubscriptions();


        for (const subscription of subscriptions) {
            if (subscription.updatedAt.getTime() + parseInt(subscription.cycleInterval) * 1000 < Date.now() && parseInt(subscription.cyclesLeft) > 0) {

                const personalizedNetworks = [
                    ChainNames.SONIC,
                    ChainNames.HYPER
                ]

                const endpoint = personalizedNetworks.includes(subscription.chainName) ? subscription.chainName : 'oneinch';
                this.eventEmitter.emit(`dca.buy.${endpoint}`, subscription);

                subscription.lastTriggerTimestamp = String(Date.now());
                subscription.cyclesLeft = String(parseInt(subscription.cyclesLeft) - 1);
                subscription.amountLeft = String(parseFloat(subscription.amountLeft) - parseFloat(subscription.amountPerCycle));
                subscription.updatedAt = new Date();

                if (parseInt(subscription.cyclesLeft) === 0) {
                    setTimeout(async () => {
                        const closeParams: CloseDcaDto = {
                            chainName: subscription.chainName,
                            userId: subscription.userId,
                            userAddress: subscription.userAddress,
                            dcaKey: subscription.dcaKey,
                        };
                        await this.closeDca(closeParams);
                        await this.eventEmitter.emit(`notification.created.dca-close`, closeParams);
                    }, 10000);
                }


                await this.dcaRepository.save(subscription);
            }
        }
    }
}
