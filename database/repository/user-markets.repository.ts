import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';
import { UserMarkets } from '../entities/user-markets.entity';

export interface TokenForChainName {
  symbol: string;
  name: string;
  address: string;
}

@Injectable()
export class UserMarketsRepository extends BaseRepository<UserMarkets> {
  constructor(
    @InjectRepository(UserMarkets)
    repository: Repository<UserMarkets>,
  ) {
    super(repository);
  }

  public async createUserMarket(args: { address: string; marketId: string }): Promise<UserMarkets> {
    // check if user market already exists
    const userMarket = await this.findOne({ where: { address: args.address, marketId: args.marketId } });
    if (userMarket) {
      return userMarket;
    }
    return this.create({ address: args.address, marketId: args.marketId });
  }

  public async deleteUserMarket(args: { address: string; marketId: string }): Promise<void> {
    const { address, marketId } = args;
    await this.delete({ address, marketId });
  }

  public async getUserMarkets(args: { address: string }): Promise<UserMarkets[]> {
    const { address } = args;
    return this.find({ where: { address } });
  }
}
