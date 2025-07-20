import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ZERO_ADDRESS } from '@polymarket/order-utils';
import { Repository } from 'typeorm';

import { ChainNames, getChainIdByName, getChainNameById, ZERO_ARB_ADDRESS, ZERO_BNB_ADDRESS, ZERO_HYPER_ADDRESS, ZERO_SOL_ADDRESS } from '../modules/blockchain/constants';
import { EvmUtils } from '../modules/blockchain/evm.utils';
import { SolanaUtils } from '../modules/blockchain/solana.utils';
import { Erc20 } from '../modules/database/entities/erc20.entity';
import { Erc20Repository } from '../modules/database/repository/erc20.repository';
import { HyperswapUtils } from '../modules/hyperswap/hyperswap.utils';
import { OneInchUtils } from '../modules/oneinch/oneinch.utils';
import { SonicUtils } from '../modules/sonic/sonic.utils';

export interface FetchTokenAddressParam {
  chainName: ChainNames;
  symbol: string;
}

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(Erc20)
    private readonly tokenRepository: Repository<Erc20>,
    private readonly sonicUtils: SonicUtils,
    private readonly evmUtils: EvmUtils,
    private readonly solanaUtils: SolanaUtils,
    private readonly hyperswapUtils: HyperswapUtils,
    private readonly oneInchUtils: OneInchUtils,
    private readonly erc20Repository: Erc20Repository
  ) { }

  // ToolMethod
  public async fetchTokenAddressByTicker(args: FetchTokenAddressParam): Promise<{ address?: string; isNative?: boolean; error?: string }> {
    const { chainName, symbol } = args;
    if (symbol.toUpperCase() === 'ETH' || symbol.toLowerCase() === ZERO_ADDRESS) {
      return { address: ZERO_ADDRESS, isNative: true };
    }
    if (chainName == ChainNames.SONIC && symbol.toUpperCase() === 'S') {
      return { address: ZERO_ADDRESS, isNative: true };
    }
    if (chainName == ChainNames.POLYGON && symbol.toUpperCase() === 'MATIC') {
      return { address: ZERO_ADDRESS, isNative: true };
    }
    if (chainName == ChainNames.HYPER && (symbol.toUpperCase() === 'HYPE' || symbol.toUpperCase() === 'ETH')) {
      return { address: ZERO_HYPER_ADDRESS, isNative: true };
    }
    if (chainName == ChainNames.BSC && (symbol.toUpperCase() === 'BNB' || symbol.toUpperCase() === 'ETH')) {
      return { address: ZERO_BNB_ADDRESS, isNative: true };
    }
    if (chainName == ChainNames.ARBITRUM && symbol.toUpperCase() === 'ETH') {
      return { address: ZERO_ARB_ADDRESS, isNative: true };
    }
    if (chainName == ChainNames.SOLANA && symbol.toUpperCase() === 'SOL') {
      return { address: ZERO_SOL_ADDRESS, isNative: true };
    }

    const chainId = getChainIdByName(chainName);
    let erc20 = (await this.tokenRepository.findOne({
      where: {
        chainId: chainId,
        symbol: symbol.toUpperCase(),
        verified: true,
      },
    }));

    if (erc20?.address) {
      return { address: erc20.address };
    }

    let tokenInfo;
    try {
      switch (chainName) {
        case ChainNames.SONIC:
          tokenInfo = await this.sonicUtils.resolveTokenAddress(symbol)
          break;
        case ChainNames.SOLANA:
          tokenInfo = await this.solanaUtils.resolveTokenAddress(symbol)
          break;
        case ChainNames.HYPER:
          tokenInfo = await this.hyperswapUtils.resolveTokenAddress(symbol);
          break;
        default:
          tokenInfo = await this.oneInchUtils.fetchTokenAddressByTicker({
            chainName: ChainNames[chainId],
            symbol,
          });
      }
      if (tokenInfo.address) {
        let tokenMetadata;
        let decimals;

        if (chainName == ChainNames.SOLANA) {
          tokenMetadata = await this.solanaUtils.getTokenMetadata(tokenInfo.address);
          decimals = await this.solanaUtils.getTokenDecimals(tokenInfo.address);
        } else {
          tokenMetadata = await this.evmUtils.getTokenMetadata(chainName, tokenInfo.address);
          decimals = await this.evmUtils.getErc20Decimals(chainName, tokenInfo.address);
        }

        this.erc20Repository.saveToken(
          getChainNameById(chainId),
          tokenInfo.address,
          decimals,
          tokenMetadata.name,
          symbol,
          chainId
        );

      }

      if (!tokenInfo.address) {
        return {
          error: `No token found with symbol '${symbol}' on chainId '${chainId}'.`,
        };
      }

      return { address: tokenInfo.address, isNative: false };
    } catch (err) {
      return {
        error: `Failed to fetch token data from the database: ${(err as Error).message}`,
      };
    }
  }
}
