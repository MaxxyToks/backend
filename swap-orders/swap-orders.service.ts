// src/orders/orders.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ChainNames } from 'modules/blockchain/constants';
import { EvmUtils } from 'modules/blockchain/evm.utils';
import { SwapOrderRepository } from 'modules/database/repository/swap-order.repository';
import { UserRepository } from 'modules/database/repository/user.repository';
import { QuoteSwapDto } from 'modules/hyperswap/dto/hyperswap.dto';
import { HyperSwapService } from 'modules/hyperswap/hyperswap.service';
import { SonicService } from 'modules/sonic/sonic.service';
import { SwapOrder } from '../database/entities/swap-order.entity';
import { CreateOrderDto, OrderStatus, OrderStatusDto, PriceChangeDto, TokenMetadataDto } from './dto/order.dto';

@Injectable()
export class SwapOrdersService {
  logger = new Logger(SwapOrdersService.name);

  constructor(
    @InjectRepository(SwapOrder)
    private readonly ordersRepository: SwapOrderRepository,
    private readonly hyperSwapService: HyperSwapService,
    private readonly sonicService: SonicService,
    private readonly eventEmitterService: EventEmitter2,
    private readonly evmUtils: EvmUtils,
    private readonly userRepository: UserRepository,
  ) { }

  @OnEvent('limit-order.create')
  async createOrder(createOrderDto: CreateOrderDto): Promise<SwapOrder> {
    const order = await this.ordersRepository.create(createOrderDto);
    const savedOrder = await this.ordersRepository.save(order);
    return savedOrder;
  }


  @OnEvent('limit-order.close')
  async closeOrderCallback(data: { orderId: string; userId: string; walletAddress: string, telegramId: string, chainName: string, txHash: string, amountIn: string, amountOut: string, tokenIn: TokenMetadataDto, tokenOut: TokenMetadataDto, reason: string }): Promise<void> {
    const orderId = data.orderId;
    if (!orderId) {
      throw new Error('Missing orderId');
    }

    await this.closeOrder(orderId);

    await this.eventEmitterService.emit(`notification.created.close-order`, {
      orderId: data.orderId,
      chainId: data.chainName,
      userId: data.userId,
      txHash: data.txHash,
      tokenIn: data.tokenIn,
      tokenOut: data.tokenOut,
      amountIn: data.amountIn,
      amountOut: data.amountOut,
      reason: data.reason
    })
  }

  async getAllOpenOrders(): Promise<SwapOrder[]> {
    return await this.ordersRepository.find({ where: { isActive: true } });
  }

  async closeOrderExt(args: { orderId: string, userId: string, userAddress: string, chainName: ChainNames }): Promise<SwapOrder> {

    await this.userRepository.getUserAccount(args.userId, args.userAddress);

    const order = await this.ordersRepository.findOne({ where: { orderId: args.orderId } });
    if (!order) {
      throw new Error(`Order with id ${args.orderId} not found`);
    }
    if (order.walletAddress.toLowerCase() !== (args.userAddress).toLowerCase()) {
      throw new Error(`Order with id ${args.orderId} does not belong to user ${args.userId}`);
    }
    order.isActive = false;
    return await this.ordersRepository.save(order);
  }

  private async closeOrder(orderId: string): Promise<SwapOrder> {
    const order = await this.ordersRepository.findOne({ where: { orderId: orderId } });
    if (!order) {
      throw new Error(`Order with id ${orderId} not found`);
    }
    order.isActive = false;
    return await this.ordersRepository.save(order);
  }

  async getUserOrders(userId: string): Promise<SwapOrder[]> {
    const orders = await this.ordersRepository.find({ where: { userId, isActive: true } });
    return orders;
  }

  public async checkUserOrders(args: { chainName: ChainNames, userId: string }): Promise<OrderStatusDto[]> {
    const orders: SwapOrder[] = await this.getUserOrders(args.userId);
    const results: OrderStatusDto[] = [];

    for (const order of orders) {
      if (order.chainName !== args.chainName) {
        continue;
      }

      let currentPrice: number | null = null;
      if (order.dex === 'hyperswap') {
        currentPrice = await this.hyperSwapService.getRate(order.tokenOut.address, order.tokenIn.address);
      }
      if (order.dex === 'magpie' || order.dex === 'odos') {
        currentPrice = (await this.sonicService.getRate(order.walletAddress, order.tokenOut.address, order.tokenIn.address)).rate;
      }
      if (!currentPrice) {
        this.logger.error(`Failed to fetch current price for order: ${order.id}`);
        continue;
      }
      const orderPrice = parseFloat(order.buyPrice);
      const expectedPrice = parseFloat(order.sellPrice);
      const percentChange = ((orderPrice - currentPrice) / currentPrice) * 100;

      const status = currentPrice <= expectedPrice ? OrderStatus.BREAKS : OrderStatus.NORMAL;
      const result: OrderStatusDto = {
        orderId: order.orderId,
        amount: order.amount,
        change: percentChange,
        orderPrice,
        currentPrice,
        expectedPrice,
        tokenIn: order.tokenIn.symbol,
        tokenOut: order.tokenOut.symbol,
        status,
        timestamp: new Date(parseInt(order.creationTimestamp) * 1000).toISOString(),
        expirationTimestamp: new Date(parseInt(order.expirationTimestamp) * 1000).toISOString(),
      };

      results.push(result);

    }

    return results;
  }

  public async getUsersOrderPriceChangeByNameOrSymbol(args: { userId: string; symbolOrName: string }): Promise<PriceChangeDto[]> {
    const orders: SwapOrder[] = await this.ordersRepository.getUserOrdersBySymbolOrName(args.userId, args.symbolOrName);
    const results: PriceChangeDto[] = [];

    for (const order of orders) {
      if (order.dex === 'hyperswap') {
        const swapOrder: QuoteSwapDto = {
          tokenSymbolFrom: order.tokenIn.symbol,
          tokenSymbolTo: order.tokenOut.symbol,
          amountIn: order.amount,
        };
        const currentPrice = parseFloat(await this.hyperSwapService.quoteSwap(swapOrder));
        if (!currentPrice) {
          this.logger.error(`Failed to fetch current price for order: ${order.id}`);
          continue;
        }

        const orderPrice = parseFloat(order.buyPrice);
        const percentChange = ((currentPrice - orderPrice) / orderPrice) * 100;

        const result: PriceChangeDto = {
          tokenIn: order.tokenIn,
          currentPrice,
          orderPrice,
          change: percentChange,
          timestamp: new Date(parseInt(order.creationTimestamp) * 1000).toISOString(),
        };

        results.push(result);
      } else if (order.dex === 'magpie' || order.dex === 'odos') {
        const currentPrice = parseFloat((await this.sonicService.getRate(order.walletAddress, order.tokenOut.address, order.tokenIn.address)).rate.toString());
        if (!currentPrice) {
          this.logger.error(`Failed to fetch current price for order: ${order.id}`);
          continue;
        }

        const orderPrice = parseFloat(order.buyPrice);
        const percentChange = ((currentPrice - orderPrice) / orderPrice) * 100;

        const result: PriceChangeDto = {
          tokenIn: order.tokenIn,
          currentPrice,
          orderPrice,
          change: percentChange,
          timestamp: new Date(parseInt(order.creationTimestamp) * 1000).toISOString(),
        };

        results.push(result);
      }
    }
    return results;
  }


  @Cron(CronExpression.EVERY_MINUTE)
  async checkOrdersCron() {
    this.logger.log('Checking orders for price threshold breaches');

    const orders = await this.getAllOpenOrders();

    for (const order of orders) {
      let currentPrice: number | null = null;
      if (order.dex === 'hyperswap') {
        currentPrice = await this.hyperSwapService.getRate(order.tokenOut.address, order.tokenIn.address);
      }
      if (order.dex === 'magpie' || order.dex === 'odos') {
        currentPrice = (await this.sonicService.getRate(order.walletAddress, order.tokenOut.address, order.tokenIn.address)).rate;
      }
      if (!currentPrice) {
        this.logger.error(`Failed to fetch current price for order: ${order.id}`);
        continue;
      }

      const sellPrice = parseFloat(order.sellPrice);
      const timestamp = await this.evmUtils.getTimestamp(order.chainName);
      if (parseInt(order.expirationTimestamp) > 0 && parseInt(order.expirationTimestamp) < timestamp) {
        this.logger.log(`Order ${order.id}: expired`);
        await this.closeOrderCallback({
          orderId: order.orderId,
          userId: order.userId,
          walletAddress: order.walletAddress,
          telegramId: order.telegramId!,
          chainName: order.chainName,
          txHash: "",
          tokenIn: order.tokenIn,
          tokenOut: order.tokenOut,
          amountIn: order.amount,
          amountOut: "0",
          reason: `Order expired: Expiration timestamp ${new Date(parseInt(order.expirationTimestamp) * 1000).toISOString()} reached. Current timestamp: ${new Date(timestamp * 1000).toISOString()}`
        })
      }
      else if (currentPrice <= sellPrice) {
        this.logger.log(`Order ${order.id}: currentPrice (${currentPrice}) exceeded the threshold`);
        this.eventEmitterService.emit(`limit-order.buy.${order.chainName}`, order);
      }
    }
  }

  // public async getUserGroupedPnlByNameAndSymbol(args: {
  //   userId: string;
  //   symbolOrName: string;
  //   groupBy: 'yearly' | 'quarterly' | 'monthly' | 'weekly';
  // }): Promise<UserGroupedPnlDto> {

  //   const orders: SwapOrder[] = await this.getUserOrdersBySymbolOrName(args.userId, args.symbolOrName);
  //   if (!orders.length) {
  //     return { token: {} as TokenMetadata, groupedPnl: [] };
  //   }

  //   let tokenMetadata: TokenMetadata = orders[0].baseToken;

  //   const groupMap = new Map<string, {
  //     realizedUsd: number;
  //     realizedCost: number;
  //   }>();

  //   let totalTokensHeld = 0;
  //   let totalCostUsd = 0;

  //   let currentPrice: number | null = null;

  //   orders.sort((a, b) => {
  //     const aTime = a.isActive
  //       ? parseInt(a.creationTimestamp, 10)
  //       : parseInt(a.sellTimestamp, 10) || parseInt(a.creationTimestamp, 10);
  //     const bTime = b.isActive
  //       ? parseInt(b.creationTimestamp, 10)
  //       : parseInt(b.sellTimestamp, 10) || parseInt(b.creationTimestamp, 10);
  //     return aTime - bTime;
  //   });

  //   for (const order of orders) {
  //     const buyPrice = parseFloat(order.buyPrice);
  //     if (isNaN(buyPrice) || buyPrice <= 0) {
  //       this.logger.error(`Invalid buy price for order: ${order.id}`);
  //       continue;
  //     }

  //     const amountBought = parseFloat(order.amountBought) || 0;
  //     const amountSold = parseFloat(order.amountSold) || 0;

  //     if (amountBought > 0) {
  //       const costOfThisBuy = amountBought * buyPrice;
  //       totalCostUsd += costOfThisBuy;
  //       totalTokensHeld += amountBought;
  //     }

  //     if (!order.isActive && amountSold > 0) {
  //       let avgCost = 0;
  //       if (totalTokensHeld > 0) {
  //         avgCost = totalCostUsd / totalTokensHeld;
  //       }
  //       const sellPrice = parseFloat(order.sellPrice);
  //       if (!isNaN(sellPrice) && sellPrice > 0) {
  //         const realizedUsd = (sellPrice - avgCost) * amountSold;
  //         const realizedCost = avgCost * amountSold;
  //         totalCostUsd -= realizedCost;
  //         totalTokensHeld -= amountSold;

  //         const sellTimestamp = order.sellTimestamp || order.creationTimestamp;
  //         const sellDate = new Date(parseInt(sellTimestamp, 10) * 1000);
  //         const realizedGroupLabel = this.getGroupLabel(sellDate, args.groupBy);

  //         if (!groupMap.has(realizedGroupLabel)) {
  //           groupMap.set(realizedGroupLabel, {
  //             realizedUsd: 0,
  //             realizedCost: 0,
  //           });
  //         }
  //         const group = groupMap.get(realizedGroupLabel)!;
  //         group.realizedUsd += realizedUsd;
  //         group.realizedCost += realizedCost;
  //       }
  //     }
  //   }

  //   if (totalTokensHeld > 0) {
  //     if (!currentPrice) {
  //       const order = orders[0];
  //       const fromAddress = order.intermediateTokenAddress || order.quoteToken.address;
  //       const cacheKey = `${order.chainName}-${order.dex}-${fromAddress}-${order.baseToken.address}`;
  //       currentPrice = await this.dexScreenerService.getCurrentPriceDex(
  //         order.chainName,
  //         order.dex,
  //         fromAddress,
  //         order.baseToken.address
  //       );
  //     }
  //     if (currentPrice == null) {
  //       this.logger.error(`Failed to fetch current price for token: ${tokenMetadata.symbol}`);
  //     } else {
  //       const now = new Date();
  //       const creationGroupLabel = this.getGroupLabel(now, args.groupBy);

  //       const marketVal = currentPrice * totalTokensHeld;
  //       const costVal = totalCostUsd

  //       if (!groupMap.has(creationGroupLabel)) {
  //         groupMap.set(creationGroupLabel, {
  //           realizedUsd: 0,
  //           realizedCost: 0,
  //         });
  //       }

  //       groupMap.set(
  //         creationGroupLabel,
  //         {
  //           realizedUsd: groupMap.get(creationGroupLabel)!.realizedUsd,
  //           realizedCost: groupMap.get(creationGroupLabel)!.realizedCost,
  //         }
  //       );
  //     }
  //   }


  //   const finalResult: GroupedPnlDto[] = [];
  //   for (const [groupLabel, groupData] of groupMap.entries()) {

  //     const realizedUsd = groupData.realizedUsd || 0;
  //     const realizedCost = groupData.realizedCost || 0;


  //     let unrealizedUsd = 0;
  //     let unrealizedCost = 0;
  //     if (
  //       totalTokensHeld > 0 &&
  //       groupLabel === this.getGroupLabel(new Date(), args.groupBy) &&
  //       currentPrice
  //     ) {
  //       const marketVal = currentPrice * totalTokensHeld;
  //       const costVal = totalCostUsd;
  //       unrealizedUsd = marketVal - costVal;
  //       unrealizedCost = costVal;
  //     }

  //     const totalUsd = realizedUsd + unrealizedUsd;
  //     const totalCost = realizedCost + unrealizedCost;

  //     const realizedPct = (realizedCost > 0) ? (realizedUsd / realizedCost) * 100 : 0;
  //     const unrealizedPct = (unrealizedCost > 0) ? (unrealizedUsd / unrealizedCost) * 100 : 0;
  //     const totalPct = (totalCost > 0) ? (totalUsd / totalCost) * 100 : 0;

  //     finalResult.push({
  //       group: groupLabel,
  //       realizedPnl: realizedPct + ' %',
  //       unrealizedPnl: unrealizedPct + ' %',
  //       totalPnl: totalPct + ' %',
  //     });
  //   }
  //   return {
  //     token: tokenMetadata,
  //     groupedPnl: finalResult,
  //   };
  // }

  // private getGroupLabel(
  //   date: Date,
  //   groupBy: 'yearly' | 'quarterly' | 'monthly' | 'weekly'
  // ): string {
  //   const year = date.getFullYear();
  //   const month = date.getMonth();
  //   switch (groupBy) {
  //     case 'yearly':
  //       return `${year}`;
  //     case 'quarterly': {
  //       const quarter = Math.floor(month / 3) + 1;
  //       return `${year} Q${quarter}`;
  //     }
  //     case 'monthly': {
  //       const m = month + 1;
  //       return `${year}-${m < 10 ? '0' + m : m}`;
  //     }
  //     case 'weekly': {
  //       const oneJan = new Date(year, 0, 1);
  //       const millisecsInDay = 86400000;
  //       const dayOfYear = Math.floor((date.getTime() - oneJan.getTime()) / millisecsInDay) + 1;
  //       const weekNumber = Math.ceil(dayOfYear / 7);
  //       return `${year} W${weekNumber < 10 ? '0' + weekNumber : weekNumber}`;
  //     }
  //     default:
  //       return `${year}`;
  //   }
  // }
}
