import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DcaSubscription } from '../entities/dca-subscription.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class DcaSubscriptionRepository extends BaseRepository<DcaSubscription> {
  constructor(
    @InjectRepository(DcaSubscription)
    repository: Repository<DcaSubscription>,
  ) {
    super(repository);
  }


  async getUserOrdersBySymbolOrName(userId: string, symbolOrName: string): Promise<DcaSubscription[]> {
    const ordersBySymbol = await this.repository
      .createQueryBuilder('dcaSubscription')
      .where('dcaSubscription.userId = :userId', { userId })
      .andWhere("dcaSubscription.tokenTo ->> 'symbol' = :symbolOrName", { symbolOrName })
      .getMany();

    if (ordersBySymbol.length > 0) {
      return ordersBySymbol;
    }

    const ordersByName = await this.repository
      .createQueryBuilder('swapOrder')
      .where('swapOrder.userId = :userId', { userId })
      .andWhere("swapOrder.tokenTo ->> 'name' = :symbolOrName", { symbolOrName })
      .getMany();

    return ordersByName;
  }
}
