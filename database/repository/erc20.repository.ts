import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { ChainNames } from 'modules/blockchain/constants';

import { Erc20 } from '../entities/erc20.entity';

import { BaseRepository } from './base.repository';

export interface TokenForChainName {
  symbol: string;
  name: string;
  address: string;
}

@Injectable()
export class Erc20Repository extends BaseRepository<Erc20> {
  private readonly logger = new Logger(Erc20Repository.name);

  constructor(
    @InjectRepository(Erc20)
    repository: Repository<Erc20>,
  ) {
    super(repository);
  }

  public async saveToken(
    chainName: ChainNames,
    address: string,
    decimals: number,
    name: string,
    symbol: string,
    chainId: number,
  ): Promise<void> {
    this.logger.log(chainName, address, decimals, name, symbol, chainId);
    const existingToken = await this.findOne({ where: { address, chainId } });
    if (existingToken) {
      this.logger.log("existingToken", existingToken);
      return;
    }
    const erc20 = new Erc20();
    erc20.address = address;
    erc20.decimals = decimals;
    erc20.name = name;
    erc20.symbol = symbol;
    erc20.verified = true;
    erc20.chainId = chainId;
    erc20.chainName = chainName;
    await this.save(erc20);
  }

  public async getTokenForChainNameAndSymbol(args: {
    chainName: ChainNames;
    symbol: string;
  }): Promise<TokenForChainName[]> {
    const { chainName, symbol } = args;

    const tokens = await this.find({
      where: { chainName, symbol: ILike(`%${symbol}%`), verified: true },
    });

    return tokens.map((token) => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
    }));
  }

  public async getTokensForChain(args: { chainName: ChainNames }): Promise<TokenForChainName[]> {
    const { chainName } = args;
    const tokens = await this.find({ where: { chainName, verified: true } });
    return tokens.map((token) => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
    }));
  }

  public async getTokenAddressBySymbol(symbol: string, chainId: number): Promise<string | null> {
    const erc20 = await this.findOne({ where: { symbol, chainId, verified: true } });
    return erc20?.address ?? null;
  }

  public async getVerifiedErc20DataByAddress(
    address: string,
    chainId: number,
    verified: boolean,
  ): Promise<Erc20 | null> {
    return this.findOne({ where: { address: address.toLowerCase(), chainId, verified } });
  }
}
