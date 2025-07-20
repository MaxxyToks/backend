import { Injectable, Logger } from '@nestjs/common';

import { sleep } from 'common/utils/sleep';
import { AcrossService } from '../../modules/across/across.service';
import { ChainId, getChainNameById } from '../../modules/blockchain/constants';
import { EvmUtils } from '../../modules/blockchain/evm.utils';

import { Erc20 } from '../entities/erc20.entity';
import { Erc20Repository } from '../repository/erc20.repository';

interface TokenData {
  chainId: number;
  address: string;
}

@Injectable()
export class SeedErc20VerifiedService {
  private readonly logger = new Logger(SeedErc20VerifiedService.name);
  constructor(
    private readonly acrossService: AcrossService,
    private readonly evmUtils: EvmUtils,
    private readonly erc20Repository: Erc20Repository,
  ) { }

  public async seed(): Promise<void> {
    // Seed only if count in db is null
    const count = await this.erc20Repository.count();
    if (count > 0) {
      return;
    }

    // Get routes from across
    const routes = await this.acrossService.getRoutes();

    const chainIdArray = Object.values(ChainId);
    const tokenDataList: TokenData[] = [];

    // Create token data list
    for (const route of routes) {
      if (chainIdArray.includes(route.originChainId)) {
        tokenDataList.push({ chainId: route.originChainId, address: route.originToken.toLowerCase() });
      }
      if (chainIdArray.includes(route.destinationChainId)) {
        tokenDataList.push({ chainId: route.destinationChainId, address: route.destinationToken.toLowerCase() });
      }
    }

    // Save token data to db
    for (const tokenData of tokenDataList) {
      const { address, chainId } = tokenData;
      const existedRecord = await this.erc20Repository.getVerifiedErc20DataByAddress(address, chainId, true);

      // If this token is already existed, skip
      if (existedRecord) {
        this.logger.debug(`Token ${address} on chainId ${chainId} is already existed`);
        continue;
      }

      const { decimals, name, symbol } = await this.evmUtils.getErc20FullDetails(getChainNameById(chainId), address);

      this.logger.debug(`Seeding erc20 verified data for chainId: ${chainId} - ${symbol}`);
      await this.saveToken(address, decimals, name, symbol, chainId);
      await sleep(500);
    }

    this.logger.log('Seed erc20 verified data completed');
  }

  private async saveToken(
    address: string,
    decimals: number,
    name: string,
    symbol: string,
    chainId: number,
  ): Promise<void> {
    const erc20 = new Erc20();
    erc20.address = address;
    erc20.decimals = decimals;
    erc20.name = name;
    erc20.symbol = symbol;
    erc20.verified = true;
    erc20.chainId = chainId;
    erc20.chainName = getChainNameById(chainId);
    await this.erc20Repository.save(erc20);
  }
}
