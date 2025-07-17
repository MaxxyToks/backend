import { Injectable, Logger } from '@nestjs/common';

import { SettingsService } from 'modules/settings/settings.service';

import Bottleneck from 'bottleneck';
import { ChainNames } from 'modules/blockchain/constants';

import { GetTopTokens, TopTokensDto } from './dto/top-tokens.dto';

/**
 * Production-level service for interacting with the DexTools public API.
 * All logs and error messages are in English.
 */
@Injectable()
export class TopTokensService {
  private readonly logger = new Logger(TopTokensService.name);

  private readonly pageSize: string = '50';
  private apiKey: string;
  private baseUrl: string;

  constructor(protected readonly settingsService: SettingsService) {
    this.apiKey = this.settingsService.getSettings().keys.dexTools;
    this.baseUrl = this.settingsService.getSettings().dextools.url;
  }

  public async getTopTokens(args: GetTopTokens): Promise<any> {
    const { numberOfAssets, chainName } = args;

    if (!numberOfAssets || !chainName) {
      throw new Error(
        `Invalid arguments in getTopTokens! Needed arguments: {
            numberOfAssets: number,
            chainName: string,
          }`,
      );
    }
    const limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 2000,
    });
    const assets = await limiter.schedule(() =>
      this.fetchTopTokensData({
        chainName,
        numberOfAssets,
      }),
    );

    // this.logger.log(' -> Action result:', assets);

    if (assets == null) {
      return [];
    }

    const topTokensText: string[] = [];
    let i: number = 0;
    for (const asset of assets) {
      i++;
      const assetDetails = asset.baseAsset;
      const assetFormattedData: TopTokensDto = {
        chain: asset.chain,
        liquidity: asset.liquidity,
        volume24h: asset.volume24h,
        tokenName: assetDetails.name,
        tokenSymbol: assetDetails.symbol,
        tokenAddress: assetDetails.tokenProgram,
        price: assetDetails.usdPrice,
        organicScore: assetDetails.organicScore,
        buyOrganicVolume24h: assetDetails.stats24h.buyOrganicVolume,
        sellOrganicVolume24h: assetDetails.stats24h.sellOrganicVolume,
        circulatingSupply: assetDetails.circSupply,
        totalSupply: assetDetails.totalSupply,
        mcap: assetDetails.mcap,
        fdv: assetDetails.fdv,
        holders: assetDetails.holderCount,

        // transactions: asset,
      };

      let poolId = asset.id;
      // if (assetDetails.hasOwnProperty('graduatedPool')) {
      //   poolId = assetDetails.graduatedPool;
      // }

      const dexToolsLink = `https://www.dextools.io/app/en/solana/pair-explorer/${poolId}`;

      const tokenData = `${i}. **<a href="${dexToolsLink}" target="_blank" rel="noopener">${assetDetails.name} (${assetDetails.symbol})</a>**:
- Address: ${assetDetails.id}
- Liquidity: $${this.formatNumber(asset.liquidity, 2)}
- 24h Volume: $${this.formatNumber(asset.volume24h, 2)}
- Price: $${this.numberFormat(assetDetails.usdPrice, 2)}
- Circulating Supply: ${this.numberFormat(assetDetails.circSupply, 2)}
- Market Cap: $${this.formatNumber(assetDetails.mcap, 2)}
- FDV: $${this.formatNumber(assetDetails.fdv, 2)}
- Holders: ${assetDetails.holderCount}\n\n`;

      topTokensText.push(tokenData);
    }

    // return topTokensList
    return { customMessage: true, content: topTokensText.join('') };
  }

  /**
   * Get a list of tokens/pools that have gained the most in value.
   * @param chainId - Chain id (e.g., 'ether').
   */
  public async fetchTopTokensData({
    chainName,
    numberOfAssets,
  }: {
    chainName: ChainNames;
    numberOfAssets: number;
  }): Promise<any | null> {
    let url;
    if (chainName === 'solana') {
      url = 'https://datapi.jup.ag/v1/pools/toptraded/24h';
    }
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error(`Failed to fetch gainers: HTTP ${response.status} - ${response.statusText}`);
        return null;
      }
      const result = await response.json();
      const data = numberOfAssets == 0 ? result.pools : result.pools.slice(0, numberOfAssets);
      this.logger.log(`Fetched gainers successfully for chainId: ${chainName}`);
      return data;
    } catch (error) {
      this.logger.error('Error fetching gainers:', error);
      return null;
    }
  }

  public formatNumber(num: number, digits = 3) {
    const lookup = [
      { value: 1, symbol: '' },
      { value: 1e3, symbol: 'k' },
      { value: 1e6, symbol: 'M' },
      { value: 1e9, symbol: 'G' },
      { value: 1e12, symbol: 'T' },
      { value: 1e15, symbol: 'P' },
      { value: 1e18, symbol: 'E' },
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    const item = lookup
      .slice()
      .reverse()
      .find(function (item) {
        return num >= item.value;
      });

    return item ? (num / item.value).toFixed(digits).replace(rx, '$1') + item.symbol : '0';
  }

  public numberFormat(
    number: number,
    decimals: number = 3,
    dec_point: string = '.',
    thousands_sep: string = ',',
  ): string {
    let i: string, j: number, kw: string, kd: string, km: string;

    // Input validation & defaults
    decimals = isNaN(Math.abs(decimals)) ? 2 : Math.abs(decimals);

    i = parseInt((number = Number(number.toFixed(decimals))) + '').toString();

    j = i.length > 3 ? i.length % 3 : 0;

    km = j ? i.slice(0, j) + thousands_sep : '';
    kw = i.slice(j).replace(/(\d{3})(?=\d)/g, '$1' + thousands_sep);
    kd =
      decimals && number - parseInt(i) > 0
        ? dec_point +
        Math.abs(number - parseInt(i))
          .toFixed(decimals)
          .slice(2)
        : '';

    if (kd) {
      let kz = 0;
      for (const value of kd) {
        if (value !== '.') {
          if (parseInt(value) > 0) {
            kz++;
          }
        }
      }
      if (kz === 0) {
        kd = '';
      }

      if (kd) {
        const tmp1 = parseFloat('0' + kd).toString();
        const tmp2 = tmp1.split('.');
        kd = '.' + (tmp2[1] || '00');
      } else {
        kd = '.00';
      }
    }

    return km + kw + kd;
  }
}
