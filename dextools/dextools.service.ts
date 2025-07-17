import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';

import { ChainNames, getChainIdByName } from 'modules/blockchain/constants';
import { EvmUtils } from 'modules/blockchain/evm.utils';
import { Erc20Repository } from 'modules/database/repository/erc20.repository';
import { SettingsService } from 'modules/settings/settings.service';

import { chainMapping } from './constants/chainNamesToDextoolsIds';
import { ApiResponse } from './dto/dextools.dto';
interface AggregatedToken {
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  ca: string;
  liq: number;
  fdv: number;
  age: number;
  humanableReadAge: string;
  tx1h: number;
  tx6h: number;
  tx24h: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
  priceChange24h: number;
  priceDiff: number;
  volatility: number;
  volume6h: number;
  volume24h: number;
  txCount: number;
}

interface TopTokensFilters {
  minLiq?: number;
  minVolume?: number;
  minTxCount?: number;
  minFdv?: number;
  maxAgeInMs?: number;
  exchange?: string;
  tokenSymbol?: string;
  tokenCa?: string;
}

interface GetBoostedAssetsWithMetadataInput {
  chainName: string;
  numberOfTokens: number;
  sortBy: 'liq' | 'volume' | 'txCount' | 'priceDiff' | 'volatility';
  filters?: TopTokensFilters;
  toRawData?: boolean;
}

interface TokenInfo {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
}

export interface DisplayPair {
  id: string;
  symbol: string;
  tvl: number;
  stats?: {
    last_24h_vol?: number;
    last_24h_fees?: number;
  };
  token0: TokenInfo;
  token1: TokenInfo;
  explorerUri: string;
}

export interface DisplayToken {
  address: string;
  info: TokenInfo;
  tvlSum: number;
  vol24hSum: number;
  pairsCount: number;
  explorerUri: string;
}

@Injectable()
export class DexToolsService {
  private readonly logger = new Logger(DexToolsService.name);

  constructor(
    protected readonly settingsService: SettingsService,
    private readonly erc20Repository: Erc20Repository,
    private readonly evmUtils: EvmUtils,
  ) {}

  public async getBoostedAssetsWithMetadata(args: GetBoostedAssetsWithMetadataInput): Promise<
    | {
        veryDegen: AggregatedToken[];
        degen: AggregatedToken[];
        midCaps: AggregatedToken[];
        oldMidCaps: AggregatedToken[];
        largerMidCaps: AggregatedToken[];
        others: AggregatedToken[];
      }
    | any
  > {
    const apiResponse = await this.fetchApiData(args.chainName);
    const data = apiResponse.data;
    const tokensMap: { [ca: string]: AggregatedToken } = {};

    data.forEach((item) => {
      const ca = item._id.token;
      const rawTokenCreationTime = item.token.creationTime;
      let tokenCreationTime = this.getCreationTime(rawTokenCreationTime);
      if (!tokenCreationTime && item.pair.creationTime) {
        tokenCreationTime = item.pair.creationTime;
      }

      const age = tokenCreationTime ? Date.now() - new Date(tokenCreationTime).getTime() : 0;
      const liq = item.pair.metrics?.liquidity || 0;
      const fdv = item.token.metrics?.fdv || 0;
      const volume24 = item.pair.periodStats?.['24h']?.volume.total;
      const txCount = item.pair.metrics?.txCount || 0;
      const tokenSymbol = item.token.symbol.toLowerCase();
      const exchange = item._id.exchange;

      if (
        (args.filters?.minLiq !== undefined && liq < args.filters?.minLiq) ||
        (args.filters?.minVolume !== undefined && volume24 < args.filters?.minVolume) ||
        (args.filters?.minTxCount !== undefined && txCount < args.filters?.minTxCount) ||
        (args.filters?.minFdv !== undefined && fdv < args.filters?.minFdv) ||
        (args.filters?.maxAgeInMs !== undefined && age > args.filters?.maxAgeInMs) ||
        // age === undefined || age === 0 ||
        (args.filters?.exchange && exchange !== args.filters?.exchange) ||
        (args.filters?.tokenSymbol && !tokenSymbol.includes(args.filters?.tokenSymbol.toLowerCase())) ||
        (args.filters?.tokenCa && ca !== args.filters?.tokenCa)
      ) {
        return;
      }

      if (!tokensMap[ca]) {
        tokensMap[ca] = {
          tokenSymbol: item.token.symbol,
          tokenName: item.token.name,
          tokenDecimals: item.token.decimals,
          ca: this.evmUtils.explorerUrlForAddress(args.chainName as ChainNames, ca),
          liq,
          fdv,
          age,
          humanableReadAge: this.formatAge(age),
          tx1h: item.pair.periodStats?.['1h']?.swaps.total || 0,
          tx6h: item.pair.periodStats?.['6h']?.swaps.total || 0,
          tx24h: item.pair.periodStats?.['24h']?.swaps.total || 0,
          priceChange5m: item.pair.periodStats?.['5m']?.price.usd.diff || 0,
          priceChange1h: item.pair.periodStats?.['1h']?.price.usd.diff || 0,
          priceChange6h: item.pair.periodStats?.['6h']?.price.usd.diff || 0,
          priceChange24h: item.pair.periodStats?.['24h']?.price.usd.diff || 0,
          priceDiff: item.pair.periodStats?.['24h']?.price.usd.diff || 0,
          volatility: item.pair.periodStats?.['24h']?.volatility || 0,
          volume6h: item.pair.periodStats?.['6h']?.volume.total || 0,
          volume24h: item.pair.periodStats?.['24h']?.volume.total || 0,
          txCount,
        };
      } else {
        tokensMap[ca].liq += liq;
        tokensMap[ca].volume24h += volume24;
        tokensMap[ca].txCount += txCount;
      }
    });

    if (args.chainName != 'solana') {
      await Promise.all(
        Object.keys(tokensMap).map((ca) => {
          const tokenData = tokensMap[ca];
          return this.erc20Repository.saveToken(
            args.chainName as ChainNames,
            ca,
            tokenData.tokenDecimals,
            tokenData.tokenName,
            tokenData.tokenSymbol,
            getChainIdByName(args.chainName as ChainNames),
          );
        }),
      );
    }

    let tokensArray = Object.values(tokensMap);

    if (!args.sortBy) {
      args.sortBy = 'priceDiff';
    }

    tokensArray.sort((a, b) => {
      switch (args.sortBy) {
        case 'liq':
          return b.liq - a.liq;
        case 'volume':
          return b.volume24h - a.volume24h;
        case 'txCount':
          return b.txCount - a.txCount;
        case 'priceDiff':
          return b.priceDiff - a.priceDiff;
        case 'volatility':
          return b.volatility - a.volatility;
        default:
          return 0;
      }
    });
    // Function to convert hours to milliseconds
    const hoursToMs = (h: number) => h * 60 * 60 * 1000;

    // Create arrays for each category
    const veryDegen: AggregatedToken[] = [];
    const degen: AggregatedToken[] = [];
    const midCaps: AggregatedToken[] = [];
    const oldMidCaps: AggregatedToken[] = [];
    const largerMidCaps: AggregatedToken[] = [];
    const others: AggregatedToken[] = [];

    if (args.numberOfTokens) {
      tokensArray = tokensArray.slice(0, args.numberOfTokens);
    }

    // Iterate through the sorted/filtered tokensArray
    for (const t of tokensArray) {
      // 1) Very Degen
      //    Liquidity: >= $10k
      //    Pair Age: <= 48 hours
      //    1h transactions: >= 30
      if (t.fdv >= 100_000 && t.liq >= 10_000 && t.age <= hoursToMs(48) && t.tx1h >= 30) {
        veryDegen.push(t);

        // 2) Degen
        //    Liquidity: >= $100k
        //    Pair Age: between 1 and 72 hours
        //    24h transactions: >= 100
      } else if (
        t.fdv >= 100_000 &&
        t.liq >= 15_000 &&
        t.age >= hoursToMs(1) &&
        t.age <= hoursToMs(72) &&
        t.tx1h >= 100
      ) {
        degen.push(t);

        // 3) Mid-Caps
        //    Liquidity: >= $100k
        //    24h Volume: >= $1.2M
        //    24h transactions: >= 200
      } else if (t.fdv >= 1_000_000 && t.liq >= 100_000 && t.volume24h >= 1_200_000 && t.tx24h >= 30) {
        midCaps.push(t);

        // 4) Old Mid-Caps
        //    Liquidity: >= $100k
        //    Pair Age: >= 700 hours
        //    24h transactions: >= 200
      } else if (t.fdv >= 200_000 && t.liq >= 100_000 && t.age >= hoursToMs(700) && t.tx24h >= 2000) {
        oldMidCaps.push(t);

        // 5) Larger Mid Caps
        //    Liquidity: >= $200k
        //    6h Volume: >= $150k
      } else if (t.fdv >= 1_000_000 && t.liq >= 200_000 && t.volume6h >= 150_000) {
        largerMidCaps.push(t);

        // Fallback: if the token doesn't match any of the above criteria,
        // assign it to the others category by default.
      } else {
        others.push(t);
      }
    }
    const categorizedTokens = {
      veryDegen,
      degen,
      midCaps,
      oldMidCaps,
      largerMidCaps,
      others,
    };

    if (args.toRawData === true) {
      return categorizedTokens;
    } else {
      return {
        customMessage: true,
        content: this.formatCategorizedTokens(categorizedTokens, args.chainName, args.numberOfTokens),
      };
    }
  }

  public async fetchApiData(chainName: string): Promise<ApiResponse> {
    const url = `https://www.dextools.io/shared/analytics/pairs/gainers?chain=${this.getDexToolsChainName(chainName)}`;

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        Referer: 'https://www.dextools.io/app/en/pairs',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'de-DE',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"iOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        Origin: 'https://www.dextools.io',
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: any = await response.json();
    return data;
  }

  private getCreationTime(rawCreationTime: any): string {
    if (typeof rawCreationTime === 'string') {
      return rawCreationTime;
    } else if (rawCreationTime && rawCreationTime.$ifNull && Array.isArray(rawCreationTime.$ifNull)) {
      return rawCreationTime.$ifNull[1] || '';
    }
    return '';
  }

  private getDexToolsChainName(chainName: string): string {
    try {
      const key = chainName;
      if (!chainMapping.hasOwnProperty(key)) {
        throw new Error(`Chain ${chainName}  not found.`);
      } else {
      }
      return chainMapping[key];
    } catch (error) {
      this.logger.error('Error fetching chain id:', error);
      throw error;
    }
  }

  private formatAge(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days} days, ${hours} hours, ${minutes} minutes`;
    } else if (totalHours > 0) {
      return `${totalHours} hours, ${minutes} minutes`;
    } else {
      return `${totalMinutes} minutes`;
    }
  }

  private formatCategorizedTokens(
    categorizedTokens: {
      veryDegen: AggregatedToken[];
      degen: AggregatedToken[];
      midCaps: AggregatedToken[];
      oldMidCaps: AggregatedToken[];
      largerMidCaps: AggregatedToken[];
      others: AggregatedToken[];
    },
    chainName: string,
    numberOfTokens?: number,
  ): string {
    const categoryNames: { [key: string]: string } = {
      veryDegen: 'Very Degen',
      degen: 'Degen',
      midCaps: 'MidCaps',
      oldMidCaps: 'Old MidCaps',
      largerMidCaps: 'Larger MidCaps',
      others: 'Others',
    };
    let formattedString = numberOfTokens
      ? `Here are the top ${numberOfTokens} tokens on the ${chainName} network, categorized by activity:\n\n`
      : `Here are the tokens on the ${chainName} network that match the criteria, categorized by activity:\n\n`;

    let counter = 1;
    const categories = ['veryDegen', 'degen', 'midCaps', 'oldMidCaps', 'largerMidCaps', 'others'];

    for (const cat of categories) {
      const tokens = categorizedTokens[cat as keyof typeof categorizedTokens];
      if (tokens.length > 0) {
        formattedString += `### ${categoryNames[cat]}\n`;

        for (const token of tokens) {
          formattedString += `${counter}. **${token.tokenName} (${token.tokenSymbol})**\n`;
          formattedString += `   - 📜 [Contract](${token.ca})\n`;
          formattedString += `   - ⏳ Age: ${token.humanableReadAge}\n`;
          formattedString += `   - 💧 Liquidity: $${this.formatNumber(token.liq)}\n`;
          formattedString += `   - 📈 FDV: $${this.formatNumber(token.fdv)}\n`;
          formattedString += `   - 🚀 Price Changes: 5m: ${token.priceChange5m.toFixed(2)}% | 1h: ${token.priceChange1h.toFixed(2)}% | 6h: ${token.priceChange6h.toFixed(2)}% | 24h: ${token.priceChange24h.toFixed(2)}%\n`;
          formattedString += `   - 💸 Volumes: 6h: $${this.formatNumber(token.volume6h)} | 24h: $${this.formatNumber(token.volume24h)}\n`;
          formattedString += `   - 🔄 Transactions: 1h: ${token.tx1h} | 6h: ${token.tx6h} | 24h: ${token.tx24h} | Total: ${token.txCount}%\n\n`;
          counter++;
        }
      }
    }

    formattedString += `These tokens are driving trading activity and displaying notable price changes on ${chainName}.`;
    return formattedString;
  }

  private formatNumber(num: number): string {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
