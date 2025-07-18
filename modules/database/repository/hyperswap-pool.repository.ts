import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pool } from '../entities/hyperswap-pool.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class PoolRepository extends BaseRepository<Pool> {
  constructor(
    @InjectRepository(Pool)
    repository: Repository<Pool>,
  ) {
    super(repository);
  }

  public async findByPairAddress(pairAddress: string): Promise<Pool | undefined> {
    const pool = await this.findOne({ where: { pairAddress } });
    return pool ?? undefined;
  }

  public async findPairsByTokenAddresses(tokenA: string, tokenB: string): Promise<Pool[]> {
    return this.repository
      .createQueryBuilder('pool')
      .where(
        '(pool.token0Address = :tokenA AND pool.token1Address = :tokenB) OR (pool.token0Address = :tokenB AND pool.token1Address = :tokenA)',
        { tokenA, tokenB },
      )
      .getMany();
  }

  async findTokenAddressesBySymbol(symbol: string): Promise<string[]> {
    const pools = await this.repository
      .createQueryBuilder('pool')
      .where('LOWER(pool.token0Symbol) = LOWER(:symbol) OR LOWER(pool.token1Symbol) = LOWER(:symbol)', { symbol })
      .getMany();

    const tokenAddresses = new Set<string>();

    pools.forEach((pool) => {
      if (pool.token0Symbol.toLowerCase() === symbol.toLowerCase()) {
        tokenAddresses.add(pool.token0Address);
      }
      if (pool.token1Symbol.toLowerCase() === symbol.toLowerCase()) {
        tokenAddresses.add(pool.token1Address);
      }
    });

    return Array.from(tokenAddresses);
  }
} 