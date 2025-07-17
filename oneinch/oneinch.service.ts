import { randomBytes } from 'node:crypto';

import {
  HashLock,
  OrderStatus,
  PresetEnum,
  PrivateKeyProviderConnector,
  Quote,
  SDK,
  SupportedChain,
} from '@1inch/cross-chain-sdk';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import BigNumber from 'bignumber.js';
import Bottleneck from 'bottleneck';
import { ethers } from 'ethers';

import { Address, Api, getLimitOrderV4Domain, LimitOrder, MakerTraits } from '@1inch/limit-order-sdk';
import { getAcrossChainConfig } from 'modules/across/constants';
import { ChainNames, ContractType, getChainIdByName, getContractAbi, ZERO_ADDRESS, ZERO_BNB_ADDRESS } from 'modules/blockchain/constants';
import { ERC20Abi } from 'modules/blockchain/contract-types';
import { BasicBlockchainResponseDto } from 'modules/blockchain/dto/response.dto';
import { EvmUtils } from 'modules/blockchain/evm.utils';
import { AccountRepository } from 'modules/database/repository/account.repository';
import { UserRepository } from 'modules/database/repository/user.repository';
import { KmsService } from 'modules/kms/kms.service';
import { SettingsService } from 'modules/settings/settings.service';

import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ExecuteLimitOrderDto } from 'modules/blockchain/dto/params';
import { DcaSubscription } from 'modules/database/entities/dca-subscription.entity';
import { FeeService, Ops } from 'modules/fee/fee.service';
import { TokensService } from 'modules/tokens/tokens.service';
import { LimitOrderProtocolAddresses, ONE_INCH_NATIVE_TOKEN_ADDRESS } from './constants';
import { OneInchUtils } from './oneinch.utils';
import { AxiosProviderConnector } from './utils/AxiosProviderConnector';

export interface FetchTokenAddressParam {
  chainName: string;
  symbol: string;
}

interface OneInchPriceApiResponse {
  [address: string]: string;
}

interface FetchMultipleTokenPriceParam {
  chainName: string;
  symbols: string[];
}

interface BulkFetchTokenPriceResult {
  symbol: string;
  price?: number;
  error?: string;
}

type SwapCalldataResponse = {
  from: string;
  to: string;
  data: string;
  value: string;
  gas: number;
  gasPrice: string;
};

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  domainVersion: string;
  eip2612: boolean;
  isFoT: boolean;
  tags: string[];
}
interface SwapResponse {
  srcToken: Token;
  dstToken: Token;
  dstAmount: string;
  protocols: any;
  tx: SwapCalldataResponse;
}

type OneInchRouterAddressResponse = {
  address: string;
};


export class GetLimitOrdersDto {
  userId: string;
  userAddress: string;
  chainName: ChainNames;
}

export class GetLimitOrdersByHashDto {
  orderHash: string;
  chainName: string;
}


export class SwapTokensParams {
  userAddress: string;
  originalChainName: ChainNames;
  destinationChainName: ChainNames;
  tokenSymbolFrom: string;
  tokenSymbolTo: string;
  amount: string;
  userId: string;
  slippage?: number;
}

@Injectable()
export class OneinchService {
  private readonly ONE_INCH_API_URL: string;
  private readonly ONE_INCH_API_KEY: string;
  private readonly logger = new Logger(OneinchService.name);

  constructor(
    private readonly evmUtils: EvmUtils,
    private readonly httpService: HttpService,
    private readonly userRepository: UserRepository,
    private readonly accountRepository: AccountRepository,
    private readonly kmsService: KmsService,
    private readonly oneInchUtils: OneInchUtils,
    private readonly settingsService: SettingsService,
    private readonly tokenService: TokensService,
    private readonly eventEmitter: EventEmitter2,
    private readonly feeService: FeeService,
  ) {
    this.ONE_INCH_API_URL = settingsService.getSettings().oneinch.apiUrl;
    this.ONE_INCH_API_KEY = settingsService.getSettings().oneinch.apiKey;
  }


  @OnEvent("dca.buy.oneinch")
  public async dcaBuy(data: DcaSubscription): Promise<void> {
    const { tokenIn, tokenOut, amountPerCycle, userAddress, userId } = data;
    const executeSwap = {
      userId,
      userAddress,
      originalChainName: data.chainName,
      destinationChainName: data.chainName,
      tokenSymbolFrom: tokenIn.symbol,
      tokenSymbolTo: tokenOut.symbol,
      amount: amountPerCycle,
      slippage: 0,
    };


    const amountOut = parseFloat((await this.swapTokensSingleChain(executeSwap)).amountOut).toFixed(4).toString();

    this.eventEmitter.emit('notification.created.dca-buy', { subscription: data, amountOut });
  }

  public async fetchTokenPriceInTermsOfAnotherToken(args: {
    chainName: string;
    symbolA: string;
    symbolB: string;
  }): Promise<number> {
    const { chainName, symbolA, symbolB } = args;

    const prices = await this.fetchTokenPricesByTickersInUsd({
      chainName,
      symbols: [symbolA, symbolB],
    });

    const priceA = prices.find((p) => p.symbol === symbolA);
    const priceB = prices.find((p) => p.symbol === symbolB);

    if (!priceA || priceA.error || priceA.price === undefined) {
      throw new Error(
        `Failed to get price (USD) for token "${symbolA}". Error: ${priceA?.error ?? 'unknown error'}`
      );
    }
    if (!priceB || priceB.error || priceB.price === undefined) {
      throw new Error(
        `Failed to get price (USD) for token "${symbolB}". Error: ${priceB?.error ?? 'unknown error'}`
      );
    }

    const ratio = priceA.price / priceB.price;

    return ratio;
  }

  public async fetchTokenPricesByTickersInUsd(
    args: FetchMultipleTokenPriceParam
  ): Promise<BulkFetchTokenPriceResult[]> {
    const { chainName, symbols } = args;
    const currency = 'USD';

    const limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 2000,
    });

    const results: BulkFetchTokenPriceResult[] = [];
    const symbolToAddressMap: Record<string, string> = {};
    for (const symbol of symbols) {
      try {
        const tokenAddressResult = await limiter.schedule(() =>
          this.oneInchUtils.fetchTokenAddressByTicker({ chainName, symbol })
        );

        if (!tokenAddressResult) {
          results.push({
            symbol,
            error: `Failed to fetch address for symbol: ${symbol}`,
          });
          continue;
        }

        symbolToAddressMap[symbol] = tokenAddressResult.address
      } catch (err) {
        results.push({
          symbol,
          error: `Error while fetching address for ${symbol}: ${(err as Error).message}`,
        });
      }
    }

    const addresses = Object.values(symbolToAddressMap);

    if (!addresses.length) {
      return results;
    }

    const endpoint = `price/v1.1/${getChainIdByName(chainName as ChainNames)}/quote`;
    const url = `${this.ONE_INCH_API_URL}${endpoint}`;

    const body = {
      tokens: addresses,
      currency,
    };

    const config = {
      headers: {
        Authorization: `Bearer ${this.ONE_INCH_API_KEY}`,
        accept: 'application/json',
      },
      params: {},
      paramsSerializer: {
        indexes: null,
      },
    };

    try {
      const response = await limiter.schedule(() =>
        this.postWithRetry<OneInchPriceApiResponse>(url, {
          ...config,
          data: body,
        })
      );
      const pricesData = response;
      this.logger.log(pricesData);

      for (const symbol of symbols) {
        const address = symbolToAddressMap[symbol];

        if (!address) {
          continue;
        }

        const priceInfo = pricesData[address];

        if (priceInfo === undefined) {
          results.push({
            symbol,
            error: `1inch did not provide any price info for address: ${address}`,
          });
        } else {
          const parsed = parseFloat(priceInfo);
          if (isNaN(parsed)) {
            results.push({
              symbol,
              error: `Invalid price (string) received for address: ${address}`,
            });
          } else {
            results.push({
              symbol,
              price: parsed,
            });
          }
        }
      }

      return results;
    } catch (err) {
      const errorMsg = `Error fetching token prices from 1inch: ${(err as Error).message}`;
      this.logger.error(errorMsg);

      const symbolsWithAddress = Object.keys(symbolToAddressMap);
      for (const symbol of symbolsWithAddress) {
        const alreadyHasResult = results.some(
          (r) => r.symbol === symbol && (r.price !== undefined || r.error !== undefined)
        );
        if (!alreadyHasResult) {
          results.push({
            symbol,
            error: errorMsg,
          });
        }
      }

      return results;
    }
  }

  private async postWithRetry<T>(
    url: string,
    config: AxiosRequestConfig,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.httpService.axiosRef.post<T>(url, config.data, config);
        return response.data;
      } catch (error) {
        if ((error as any).response?.status === 429 && attempt < maxRetries - 1) {
          await new Promise((res) => setTimeout(res, delayMs));
          delayMs *= 2;
        } else {
          throw error;
        }
      }
    }
    throw new Error('Unable to fetch after multiple retries.');
  }

  private async getQuote(
    sdk: SDK,
    walletAddress: string,
    amount: string,
    srcChainId: SupportedChain,
    dstChainId: SupportedChain,
    srcTokenAddress: string,
    dstTokenAddress: string,
  ): Promise<Quote> {
    try {
      const quote = await sdk.getQuote({
        amount,
        srcChainId,
        dstChainId,
        enableEstimate: true,
        srcTokenAddress,
        dstTokenAddress,
        walletAddress,
      });

      return quote;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logger.error('Error fetching quote:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  private async validateTokenAddresses(
    originalChainName: string,
    tokenSymbolFrom: string,
    tokenSymbolTo: string,
    destinationChainName?: string,
  ): Promise<{ fromToken: string; toToken: string } | { error: string }> {
    const limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 2000,
    });

    const fromAssetResult = await limiter.schedule(() => this.tokenService.fetchTokenAddressByTicker({
      chainName: originalChainName as ChainNames,
      symbol: tokenSymbolFrom
    }));

    if (!fromAssetResult.address) {
      return { error: `Error fetching from token: ${fromAssetResult.error}` };
    }


    const toAssetResult = await limiter.schedule(() => this.tokenService.fetchTokenAddressByTicker({
      chainName: (destinationChainName ?? originalChainName).toLowerCase() as ChainNames,
      symbol: tokenSymbolTo
    }));

    if (!toAssetResult.address) {
      return { error: `Error fetching taker token: ${toAssetResult.error}` };
    }

    return {
      fromToken: fromAssetResult.address,
      toToken: toAssetResult.address,
    };
  }

  public async approveTransfer(args: {
    senderAddress: string;
    receiverAddress: string;
    contract: ERC20Abi;
    amount: string;
    overrides: ethers.PayableOverrides;
  }): Promise<string | undefined> {
    const { senderAddress, receiverAddress, contract, amount, overrides } = args;

    const allowance = await contract.allowance(senderAddress, receiverAddress);

    if (allowance.gte(amount)) {
      this.logger.log('Already approved enough');
      return;
    }
    const approveTx = await contract.approve(receiverAddress, amount, overrides);

    await approveTx.wait();

    this.logger.log(`Approve tx: ${approveTx.hash}`);
    return approveTx.hash;
  }

  public async swapTokensCrossChain(args: SwapTokensParams): Promise<BasicBlockchainResponseDto> {
    const { userId, userAddress, originalChainName, destinationChainName, tokenSymbolFrom, tokenSymbolTo, amount } =
      args;

    if (
      !userAddress ||
      !userId ||
      !originalChainName ||
      !destinationChainName ||
      !tokenSymbolFrom ||
      !tokenSymbolTo ||
      !amount
    ) {
      throw new Error(
        `Invalid arguments in swapTokensCrossChain! Needed arguments: {
              userAddress: string,
              originalChainName: string,
              destinationChainName: string,
              tokenSymbolFrom: string,
              tokenSymbolTo: string,
              amount: string
            }`,
      );
    }

    const lowerCasedOriginalChainName = originalChainName.toLowerCase() as ChainNames;
    const lowerCasedDestinationChainName = destinationChainName.toLowerCase() as ChainNames;

    const validationResult = await this.validateTokenAddresses(
      lowerCasedOriginalChainName,
      tokenSymbolFrom,
      tokenSymbolTo,
      lowerCasedDestinationChainName,
    );

    if ('error' in validationResult) {
      throw new Error(validationResult.error);
    }

    const { fromToken: validatedFromToken, toToken: validatedToToken } = validationResult;
    const isInputNative = validatedFromToken === ZERO_ADDRESS || validatedFromToken == ZERO_BNB_ADDRESS;
    const isOutputNative = validatedToToken === ZERO_ADDRESS || validatedFromToken == ZERO_BNB_ADDRESS;

    const realInputToken = isInputNative ? getAcrossChainConfig(originalChainName).wethAddress : validatedFromToken;

    const originalChainId = getChainIdByName(lowerCasedOriginalChainName);
    const destinationChainId = getChainIdByName(destinationChainName.toLowerCase() as ChainNames);

    const authKey = this.ONE_INCH_API_KEY;

    const { encryptedKey } = await this.userRepository.getUserAccount(userId, userAddress);
    const privateKey = await this.kmsService.decryptSecret(encryptedKey);
    const signer = this.evmUtils.privateKeyToSigner(lowerCasedOriginalChainName, privateKey);

    const walletAddress = signer.address;

    let decimals: number;
    if (!isInputNative) {
      decimals = Number(await this.evmUtils.getErc20Decimals(lowerCasedOriginalChainName, realInputToken));
    } else {
      decimals = 18;
    }

    const amountInWei = this.evmUtils.toWei(amount, decimals).toString();

    if (isInputNative) {
      const balance = await this.evmUtils.getBalanceNative(lowerCasedOriginalChainName, userAddress);
      if (BigNumber(balance).lt(BigNumber(amountInWei))) {
        throw new Error('Insufficient balance');
      }
    } else {
      const balance = await this.evmUtils.getBalanceERC20(lowerCasedOriginalChainName, signer.address, realInputToken);

      if (BigNumber(balance).lt(BigNumber(amountInWei))) {
        throw new Error('Insufficient balance');
      }
    }

    const provider = this.evmUtils.getProvider(lowerCasedOriginalChainName);

    const ethersProviderConnector = {
      eth: {
        call(transactionConfig): Promise<string> {
          return provider.call(transactionConfig);
        },
      },
      extend(): void { },
    };

    const sdk = new SDK({
      url: `${this.ONE_INCH_API_URL}fusion-plus`,
      authKey,
      blockchainProvider: new PrivateKeyProviderConnector(privateKey, ethersProviderConnector),
    });

    const feeData = await signer.getFeeData();
    const { maxFeePerGas, maxPriorityFeePerGas, lastBaseFeePerGas } = feeData;
    if (!lastBaseFeePerGas || !maxFeePerGas || !maxPriorityFeePerGas) {
      throw new Error('No fee data');
    }
    const finalMaxFeePerGas = lastBaseFeePerGas.mul(2);
    const finalMaxPriorityFeePerGas = finalMaxFeePerGas.sub('1');
    const overrides: ethers.PayableOverrides = {
      maxFeePerGas: finalMaxFeePerGas,
      maxPriorityFeePerGas: finalMaxPriorityFeePerGas,
    };

    const erc20Contract = this.evmUtils.getContract<ERC20Abi>(
      lowerCasedOriginalChainName,
      validatedFromToken,
      getContractAbi(ContractType.ERC20),
      signer,
    );

    const limitOrderProtocolAddress = LimitOrderProtocolAddresses[lowerCasedOriginalChainName];

    if (!isInputNative) {
      await this.approveTransfer({
        senderAddress: userAddress,
        receiverAddress: limitOrderProtocolAddress,
        contract: erc20Contract,
        amount: amountInWei,
        overrides,
      });
    }
    let quote: Quote;
    try {
      quote = await this.getQuote(
        sdk,
        walletAddress,
        amountInWei,
        Number(originalChainId),
        Number(destinationChainId),
        isInputNative ? ONE_INCH_NATIVE_TOKEN_ADDRESS : validatedFromToken,
        isOutputNative ? ONE_INCH_NATIVE_TOKEN_ADDRESS : validatedToToken,
      );
    } catch (err) {
      this.logger.error('Error fetching quote:', err);
      throw new Error('Error fetching quote');
    }

    const preset = PresetEnum.fast;

    const secrets = Array.from({
      length: quote.presets[preset].secretsCount,
    }).map(() => '0x' + randomBytes(32).toString('hex'));

    const hashLock =
      secrets.length === 1
        ? HashLock.forSingleFill(secrets[0])
        : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets));

    const secretHashes = secrets.map((s) => HashLock.hashSecret(s));

    await this.sleep(1000);

    const { orderHash } = await sdk.placeOrder(quote, {
      walletAddress,
      hashLock,
      secretHashes,
      preset,
    });

    this.logger.log('Order hash:', orderHash);

    await this.sleep(1000);

    while (true) {
      const secretsToShare = await sdk.getReadyToAcceptSecretFills(orderHash);

      await this.sleep(2000);

      if (secretsToShare.fills.length) {
        for (const { idx } of secretsToShare.fills) {
          await sdk.submitSecret(orderHash, secrets[idx]);
          await this.sleep(1000);
        }
      }
      await this.sleep(2000);

      const { status } = await sdk.getOrderStatus(orderHash);

      await this.sleep(2000);

      this.logger.log('Order status:', status);

      if (status === OrderStatus.Executed || status === OrderStatus.Expired || status === OrderStatus.Refunded) {
        break;
      }

      await this.sleep(2000);
    }

    const statusResponse = await sdk.getOrderStatus(orderHash);

    const fill = statusResponse.fills.find((fill) =>
      fill.escrowEvents.some((event) => event.action === 'withdrawn' && event.side === 'dst'),
    );

    const event = fill?.escrowEvents.find((event) => event.action === 'withdrawn' && event.side === 'dst');

    return {
      transactionHash: event?.transactionHash ?? '',
      explorerUrl: this.evmUtils.explorerUrlForTx(lowerCasedDestinationChainName, event?.transactionHash ?? ''),
    };
  }

  public async swapTokensSingleChain(args: SwapTokensParams): Promise<any> {
    const { userId, userAddress, originalChainName, tokenSymbolFrom, tokenSymbolTo, amount } = args;

    if (!userAddress || !userId || !originalChainName || !tokenSymbolFrom || !tokenSymbolTo || !amount) {
      throw new Error(
        `Invalid arguments in swapTokensSingleChain! Needed arguments: {
              userAddress: string,
              originalChainName: string,
              tokenSymbolFrom: string,
              tokenSymbolTo: string,
              amount: string
            }`,
      );
    }

    const lowerCasedOriginalChainName = originalChainName.toLowerCase() as ChainNames;

    const validationResult = await this.validateTokenAddresses(
      lowerCasedOriginalChainName,
      tokenSymbolFrom,
      tokenSymbolTo,
    );

    if ('error' in validationResult) {
      throw new Error(validationResult.error);
    }

    const { fromToken: validatedFromToken, toToken: validatedToToken } = validationResult;
    const isInputNative = validatedFromToken === ZERO_ADDRESS || validatedFromToken == ZERO_BNB_ADDRESS;
    const isOutputNative = validatedToToken === ZERO_ADDRESS || validatedToToken == ZERO_BNB_ADDRESS;
    const realInputToken = isInputNative ? ONE_INCH_NATIVE_TOKEN_ADDRESS : validatedFromToken;
    const originalChainId = getChainIdByName(lowerCasedOriginalChainName);

    const { encryptedKey } = await this.userRepository.getUserAccount(userId, userAddress);
    const privateKey = await this.kmsService.decryptSecret(encryptedKey);
    const signer = this.evmUtils.privateKeyToSigner(lowerCasedOriginalChainName, privateKey);
    const walletAddress = signer.address;

    let decimals: number;
    if (!isInputNative) {
      decimals = Number(await this.evmUtils.getErc20Decimals(lowerCasedOriginalChainName, realInputToken));
    } else {
      decimals = 18;
    }

    let amountInWei = this.evmUtils.toWei(amount, decimals).toString();

    if (isInputNative) {
      const balance = await this.evmUtils.getBalanceNative(lowerCasedOriginalChainName, userAddress);
      if (BigNumber(balance).lt(BigNumber(amountInWei))) {
        throw new Error('Insufficient balance');
      } else {
        const amountAfterFee = await this.feeService.payFee(originalChainName as ChainNames, amount, validatedFromToken, isInputNative, signer, Ops.SWAP);
        amountInWei = this.evmUtils.toWei(amountAfterFee, decimals).toString();
      }
    } else {
      const balance = await this.evmUtils.getBalanceERC20(lowerCasedOriginalChainName, signer.address, realInputToken);

      if (BigNumber(balance).lt(BigNumber(amountInWei))) {
        throw new Error('Insufficient balance');
      } else {
        const amountAfterFee = await this.feeService.payFee(originalChainName as ChainNames, amount, validatedFromToken, isInputNative, signer, Ops.SWAP);
        amountInWei = this.evmUtils.toWei(amountAfterFee, decimals).toString();
      }
    }

    const feeData = await signer.getFeeData();
    const { maxFeePerGas, maxPriorityFeePerGas, lastBaseFeePerGas } = feeData;
    if (!lastBaseFeePerGas || !maxFeePerGas || !maxPriorityFeePerGas) {
      throw new Error('No fee data');
    }
    const finalMaxFeePerGas = lastBaseFeePerGas.mul(2);
    const finalMaxPriorityFeePerGas = finalMaxFeePerGas.sub('1');
    const overrides: ethers.PayableOverrides = {
      maxFeePerGas: finalMaxFeePerGas,
      maxPriorityFeePerGas: finalMaxPriorityFeePerGas,
    };

    const erc20Contract = this.evmUtils.getContract<ERC20Abi>(
      lowerCasedOriginalChainName,
      validatedFromToken,
      getContractAbi(ContractType.ERC20),
      signer,
    );


    const spenderAddressEndpoint = `swap/v6.0/${originalChainId}/approve/spender`;
    const swapEndpoint = `swap/v6.0/${originalChainId}/swap`;

    const spenderAddressUrl = `${this.ONE_INCH_API_URL}${spenderAddressEndpoint}`;
    const swapUrl = `${this.ONE_INCH_API_URL}${swapEndpoint}`;

    const headers = {
      Authorization: `Bearer ${this.ONE_INCH_API_KEY}`,
      accept: 'application/json',
    };

    const spenderAddressResponse = await this.settingsService.fetchWithRetry<OneInchRouterAddressResponse>(spenderAddressUrl, {
      headers,
    });

    await this.sleep(1000);
    if (!isInputNative) {
      await this.approveTransfer({
        senderAddress: userAddress,
        receiverAddress: spenderAddressResponse.address,
        contract: erc20Contract,
        amount: amountInWei,
        overrides,
      });
    }

    const slippage = await this.accountRepository.getSlippageForChain(
      userId,
      userAddress,
      lowerCasedOriginalChainName as ChainNames,
    );
    const realSlippage = slippage / 100;

    const swapParams = {
      chain: originalChainId,
      src: isInputNative ? ONE_INCH_NATIVE_TOKEN_ADDRESS : validatedFromToken,
      dst: isOutputNative ? ONE_INCH_NATIVE_TOKEN_ADDRESS : validatedToToken,
      amount: amountInWei,
      from: walletAddress,
      origin: walletAddress,
      slippage: realSlippage ?? 1,
    };

    const erc20ContractOutput = this.evmUtils.getContract<ERC20Abi>(
      lowerCasedOriginalChainName,
      validatedToToken,
      getContractAbi(ContractType.ERC20),
      signer,
    );

    const balanceBefore = await erc20ContractOutput.balanceOf(signer.address);
    let swapResponse: any;
    try {
      swapResponse = await this.httpService.axiosRef.get<SwapResponse>(swapUrl, {
        headers,
        params: swapParams,
      });

    } catch (error) {
      const axiosError = error as { response?: { data?: { description?: string; error?: string } }; message?: string };

      const errorMessage =
        axiosError.response?.data?.description ??
        axiosError.response?.data?.error ??
        axiosError.message ??
        'Unknown error';

      throw new Error(`Swap failed: ${errorMessage}`);
    }

    const { from, to, data, value, gas, gasPrice: swapGasPrice } = swapResponse.data.tx;;

    const swapTx = await signer.sendTransaction({
      from,
      to,
      data,
      value,
      gasLimit: gas,
      gasPrice: swapGasPrice,
    });

    await swapTx.wait();

    const balanceAfter = await erc20ContractOutput.balanceOf(signer.address);
    const decimalsOut = await erc20ContractOutput.decimals();
    const amountOut = ethers.utils.formatUnits(balanceAfter.sub(balanceBefore), decimalsOut)

    this.logger.log('Single chain swap transaction hash:', swapTx.hash);

    return {
      transactionHash: swapTx.hash,
      explorerUrl: this.evmUtils.explorerUrlForTx(lowerCasedOriginalChainName, swapTx.hash),
      amountOut,
      description: `{Amount out ${amountOut} ${tokenSymbolTo}}`
    };
  }

  public async createLimitOrder(args: ExecuteLimitOrderDto): Promise<any> {
    try {
      const {
        userId,
        userAddress,
        chainName,
        amount,
        threshold,
        tokenSymbolFrom,
        tokenSymbolTo,
        expiration
      } = args;

      const chainNameType = chainName.toLowerCase() as ChainNames;
      const { encryptedKey } = await this.userRepository.getUserAccount(userId, userAddress);
      const privateKey = await this.kmsService.decryptSecret(encryptedKey);
      const signer = this.evmUtils.privateKeyToSigner(chainNameType, privateKey);
      const chainId = getChainIdByName(chainNameType);

      const limiter = new Bottleneck({
        maxConcurrent: 1,
        minTime: 2000,
      });

      limiter.on("failed", async (error, jobInfo) => {
        if (error.response && error.response.status === 429 && jobInfo.retryCount < 5) {
          this.logger.error(
            `Job ${jobInfo.options.id} failed with error 429. Retrying #${jobInfo.retryCount + 1} in 5s.`
          );
          return 5000;
        }
        return null;
      });

      const makerAssetResult = await limiter.schedule(() =>
        this.tokenService.fetchTokenAddressByTicker({
          chainName,
          symbol: tokenSymbolFrom,
        })
      );

      if (!makerAssetResult.address) {
        throw new Error(`Error fetching maker token address: ${makerAssetResult.error}`);
      }

      const takerAssetResult = await limiter.schedule(() =>
        this.tokenService.fetchTokenAddressByTicker({
          chainName,
          symbol: tokenSymbolFrom,
        })
      );

      if (!takerAssetResult.address) {
        return { error: `Error fetching taker token address: ${takerAssetResult.error}` };
      }

      const expiresInSec = parseFloat(expiration) || 120;
      const expirationFinal = BigInt(Math.floor(Date.now() / 1000) + expiresInSec);
      const domain = getLimitOrderV4Domain(chainId);

      const makerAssetContract = new ethers.Contract(
        makerAssetResult.address,
        getContractAbi(ContractType.ERC20),
        signer
      );
      const takerAssetContract = new ethers.Contract(
        takerAssetResult.address,
        getContractAbi(ContractType.ERC20),
        signer
      );

      const makerAssetDecimals = await makerAssetContract.decimals();
      const takerAssetDecimals = await takerAssetContract.decimals();

      const currentPrice = await limiter.schedule(() =>
        this.fetchTokenPriceInTermsOfAnotherToken({
          chainName,
          symbolA: tokenSymbolFrom,
          symbolB: tokenSymbolTo
        })
      );

      this.logger.log("currentPrice:", currentPrice);

      const thresholdNum = Math.abs(parseFloat(threshold));
      let priceWithProfit = currentPrice * (1 + thresholdNum / 100);

      if (priceWithProfit <= 0) {
        throw new Error(`Invalid threshold: resulting price <= 0 (threshold=${threshold}).`);
      }

      let makerAmountBN: bigint;
      let takerAmountBN: bigint;

      // if (orderType === "sell") {
      const makerAmountBigNumber = ethers.utils.parseUnits(amount, makerAssetDecimals);
      makerAmountBN = BigInt(makerAmountBigNumber.toString());

      const takerRawNumber = parseFloat(amount) * priceWithProfit;

      const takerAmountString = takerRawNumber.toFixed(takerAssetDecimals);
      const takerAmountBigNumber = ethers.utils.parseUnits(takerAmountString, takerAssetDecimals);
      takerAmountBN = BigInt(takerAmountBigNumber.toString());

      // } else {
      //   const takerAmountBigNumber = ethers.utils.parseUnits(amount, takerAssetDecimals);
      //   takerAmountBN = BigInt(takerAmountBigNumber.toString());

      //   const makerRawNumber = parseFloat(amount) / priceWithProfit;
      //   const makerAmountString = makerRawNumber.toFixed(makerAssetDecimals);
      //   const makerAmountBigNumber = ethers.utils.parseUnits(makerAmountString, makerAssetDecimals);
      //   makerAmountBN = BigInt(makerAmountBigNumber.toString());
      // }

      const allowanceBN = BigInt((await makerAssetContract.allowance(signer.address, domain.verifyingContract)).toString());
      if (allowanceBN < makerAmountBN) {
        const balanceBN = BigInt((await makerAssetContract.balanceOf(signer.address)).toString());
        if (balanceBN < makerAmountBN) {
          this.logger.error(
            `Insufficient ${tokenSymbolFrom} balance. Needed: ${makerAmountBN}, available: ${balanceBN}, user: ${signer.address}`
          );
          throw new Error("Insufficient token balance.");
        }
        this.logger.log("Approving maker asset...");
        const approveTx = await makerAssetContract.approve(
          domain.verifyingContract,
          ethers.constants.MaxUint256
        );
        await approveTx.wait();
      } else {
        this.logger.log("Sufficient allowance for maker asset.");
      }

      const makerTraits = MakerTraits.default()
        .withExpiration(expirationFinal)
        .allowPartialFills()
        .allowMultipleFills();

      const orderObject = {
        makerAsset: makerAssetResult.address,
        takerAsset: takerAssetResult.address,
        makingAmount: ethers.utils.formatUnits(makerAmountBN, makerAssetDecimals),
        takingAmount: ethers.utils.formatUnits(takerAmountBN, takerAssetDecimals),
        maker: signer.address,
        salt: BigInt(Math.floor(Math.random() * 1e8)).toString(),
        receiver: signer.address,
      }
      this.logger.log(orderObject)

      const order = new LimitOrder(
        {
          makerAsset: new Address(makerAssetResult.address),
          takerAsset: new Address(takerAssetResult.address),
          makingAmount: makerAmountBN,
          takingAmount: takerAmountBN,
          maker: new Address(signer.address),
          salt: BigInt(Math.floor(Math.random() * 1e8)),
          receiver: new Address(signer.address),
        },
        makerTraits
      );

      const typedData = order.getTypedData(chainId);
      const signature = await signer._signTypedData(
        typedData.domain,
        { Order: typedData.types.Order },
        typedData.message
      );

      const api = new Api({
        networkId: chainId,
        authKey: this.ONE_INCH_API_KEY,
        httpConnector: new AxiosProviderConnector(),
      });

      await limiter.schedule(() => api.submitOrder(order, signature));
      const orderHash = order.getOrderHash(chainId);

      this.logger.log(`Order submitted! Hash: ${orderHash}`);
      return { orderHash, orderObject };

    } catch (error) {
      this.logger.error(`Error creating limit order: ${error}`);
      throw error;
    }
  }

  public async getLimitOrdersByUser(args: GetLimitOrdersDto): Promise<any> {
    const { userAddress, chainName } = args;
    const chainNameType: ChainNames = chainName.toLocaleLowerCase() as ChainNames;
    const chainId = getChainIdByName(chainNameType);

    const api = new Api({
      networkId: chainId,
      authKey: this.ONE_INCH_API_KEY,
      httpConnector: new AxiosProviderConnector(),
    });

    try {
      const orders = await api.getOrdersByMaker(new Address(userAddress))
      return orders;
    } catch (error) {
      this.logger.error(`Error during get limit orders: ${error}`);
      throw error;
    }
  }

  public async getLimitOrdersByHash(args: GetLimitOrdersByHashDto): Promise<any> {
    const { orderHash, chainName } = args;
    const chainNameType: ChainNames = chainName.toLocaleLowerCase() as ChainNames;
    const chainId = getChainIdByName(chainNameType);

    const api = new Api({
      networkId: chainId,
      authKey: this.ONE_INCH_API_KEY,
      httpConnector: new AxiosProviderConnector(),
    });

    try {
      const orders = await api.getOrderByHash(orderHash)
      return orders;
    } catch (error) {
      this.logger.error(`Error during get limit order by hash: ${error}`);
      throw error;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
