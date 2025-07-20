import { Injectable, Logger } from '@nestjs/common';

import { ChainNames } from '../modules/blockchain/constants';

import { BoostedAsset, MinimalBoostedAsset, PoolResponse } from './dto/dexscreener.dto';

@Injectable()
export class DexScreenerService {
  private readonly logger = new Logger(DexScreenerService.name);

  async getPools(chainId: string, tokenAddress: string): Promise<PoolResponse[]> {
    const url = `https://api.dexscreener.com/token-pairs/v1/${chainId}/${tokenAddress}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error(`Failed to fetch pool data: ${response.statusText}`);
        return [];
      }

      const data: PoolResponse[] = await response.json();
      this.logger.log(`Pool data fetched successfully for chainId: ${chainId} and tokenAddress: ${tokenAddress}`);
      return data;
    } catch (error) {
      this.logger.error('Error fetching pool data:', error);
      return [];
    }
  }

  //TODO: possibly useless
  async getPoolsByPair(chainId: string, token0: string, token1: string): Promise<PoolResponse[]> {
    const url = `https://api.dexscreener.com/latest/dex/search?q=${token0}/${token1}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error(`Failed to fetch pool data: ${response.statusText}`);
        return [];
      }

      const data: PoolResponse[] = (await response.json()).pairs;
      this.logger.log(`Pool data fetched successfully for chainId: ${chainId} and pair: ${token0}/${token1}`);
      return data;
    } catch (error) {
      this.logger.error('Error fetching pool data:', error);
      return [];
    }
  }

  async getToken(chainId: string, tokenAddressOrSymbol: string): Promise<any> {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=' + tokenAddressOrSymbol, {
        method: 'GET',
        headers: {},
      });

      if (!response.ok) {
        this.logger.error(`Failed to fetch token address: HTTP ${response.status} - ${response.statusText}`);
        return '';
      }

      const data = (await response.json()).pairs[0].baseToken;

      this.logger.log(
        `Token address fetched successfully for chainId: ${chainId} and tokenSymbol(address): ${tokenAddressOrSymbol}`,
      );

      return data;
    } catch (error) {
      this.logger.error('Error fetching token address:', error);
      return '';
    }
  }

  public async getCurrentPriceDex(
    chainName: string,
    dex: string,
    fromAddress: string,
    toAddress: string,
  ): Promise<number | null> {
    const pools = await this.getPools(chainName, toAddress);
    switch (dex.toLowerCase()) {
      case 'raydium':
        for (const p of pools) {
          if (p.dexId === 'raydium' && p.quoteToken.address === fromAddress) {
            return parseFloat(p.priceUsd);
          }
        }
        return null;
      default:
        throw new Error(`Unsupported dex for price check: ${dex.toLowerCase()}`);
    }
  }

  async fetchBoostedAssets(args: { chainName: ChainNames; numberOfAssets: number }): Promise<MinimalBoostedAsset[]> {
    try {
      const response = await fetch('https://api.dexscreener.com/token-boosts/top/v1', {
        method: 'GET',
        headers: {},
      });

      if (!response.ok) {
        this.logger.error(`Failed to fetch boosted assets: HTTP ${response.status} - ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        this.logger.error('Failed to fetch boosted assets: response JSON is not an array');
        return [];
      }

      const filtered = data.filter((asset: BoostedAsset) => asset.chainId === args.chainName);

      if (filtered.length < args.numberOfAssets) {
        this.logger.warn(
          `Requested ${args.numberOfAssets} assets, but only ${filtered.length} found for chain: ${args.chainName}`,
        );
      }

      const assets = filtered.slice(0, args.numberOfAssets);

      const filteredResult: MinimalBoostedAsset[] = [];
      for (const item of assets) {
        if (!item.url || !item.chainId || !item.tokenAddress) {
          this.logger.warn(`Skipping asset due to missing field(s): ${JSON.stringify(item)}`);
          continue;
        }
        filteredResult.push({
          url: item.url,
          chainId: item.chainId,
          description: item.description,
          tokenAddress: item.tokenAddress,
          message: "Don't forget to show chainID and tokenAddress to user in response message.",
        });
      }

      return filteredResult;
    } catch (error) {
      this.logger.error('Error fetching boosted assets:', error);
      return [];
    }
  }
}
