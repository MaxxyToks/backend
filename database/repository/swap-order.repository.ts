import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SwapOrder } from '../entities/swap-order.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class SwapOrderRepository extends BaseRepository<SwapOrder> {
  constructor(
    @InjectRepository(SwapOrder)
    repository: Repository<SwapOrder>,
  ) {
    super(repository);
  }

  async getUserOrdersBySymbolOrName(userId: string, symbolOrName: string): Promise<SwapOrder[]> {
    const ordersBySymbol = await this.repository
      .createQueryBuilder('swapOrder')
      .where('swapOrder.userId = :userId', { userId })
      .andWhere("swapOrder.baseToken ->> 'symbol' = :symbolOrName", { symbolOrName })
      .getMany();

    if (ordersBySymbol.length > 0) {
      return ordersBySymbol;
    }

    const ordersByName = await this.repository
      .createQueryBuilder('swapOrder')
      .where('swapOrder.userId = :userId', { userId })
      .andWhere("swapOrder.baseToken ->> 'name' = :symbolOrName", { symbolOrName })
      .getMany();

    return ordersByName;
  }

}
