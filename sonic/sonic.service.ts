import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ZERO_ADDRESS } from '@polymarket/order-utils';
import { ethers, Wallet } from 'ethers';
import { ChainNames } from 'modules/blockchain/constants';
import { ExecuteLimitOrderDto, ExecuteSwapDto } from 'modules/blockchain/dto/params';
import { EvmUtils } from 'modules/blockchain/evm.utils';
import { DcaSubscription } from 'modules/database/entities/dca-subscription.entity';
import { SwapOrder } from 'modules/database/entities/swap-order.entity';
import { UserRepository } from 'modules/database/repository/user.repository';
import { FeeService, Ops } from 'modules/fee/fee.service';
import { KmsService } from 'modules/kms/kms.service';
import { SettingsService } from 'modules/settings/settings.service';
import { CreateOrderDto } from 'modules/swap-orders/dto/order.dto';
import { TokensService } from 'modules/tokens/tokens.service';
import { SonicUtils } from './sonic.utils';


interface PairData {
  id: string;
  symbol: string;
  tvl: number;
  token0: string;
  token1: string;
  stats?: {
    last_24h_vol?: number;
    last_24h_fees?: number;
  };
  feeTier?: string;
  liquidity?: string
}

interface TokenAggregate {
  tvlSum: number;
  vol24hSum: number;
  pairsCount: number;
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

interface Route {
  from: string;
  to: string;
  stable: boolean;
}


@Injectable()
export class SonicService {
  private readonly logger = new Logger(SonicService.name);

  private readonly PAIRS_API_URL = 'https://api.shadow.so/mixed-pairs';
  private readonly SONIC_EXPLORER: string;

  private readonly ERC20_ABI = [
    'function approve(address spender, uint256 amount) public returns (bool)',
    'function allowance(address owner, address spender) public view returns (uint256)',
    'function balanceOf(address account) public view returns (uint256)',
    'function decimals() public view returns (uint8)',
  ];

  constructor(
    private readonly settingsService: SettingsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly kmsService: KmsService,
    private readonly userRepository: UserRepository,
    private readonly evmUtils: EvmUtils,
    private readonly sonicUtils: SonicUtils,
    private readonly tokensService: TokensService,
    private readonly feeService: FeeService,
  ) {
    this.SONIC_EXPLORER = settingsService.getSettings().blockchain.chains.sonic.blockExplorerUrl;
  }

  @OnEvent("dca.buy.sonic")
  public async dcaBuy(data: DcaSubscription): Promise<void> {
    const { tokenIn, tokenOut, amountPerCycle, userAddress, userId } = data;

    const executeSwap = {
      userId,
      userAddress,
      tokenSymbolFrom: tokenIn.symbol,
      tokenSymbolTo: tokenOut.symbol,
      amountIn: amountPerCycle,
      amountOutMinimum: '0',
    };


    const amountOut = parseFloat((await this.executeSwap(executeSwap)).amountOut).toFixed(4).toString();

    this.eventEmitter.emit('notification.created.dca-buy', { subscription: data, amountOut });
  }

  @OnEvent('limit-order.buy.sonic')
  public async orderBuy(data: SwapOrder): Promise<void> {
    const exectuteSwap = {
      userId: data.userId,
      userAddress: data.walletAddress,
      tokenSymbolFrom: data.tokenIn.address,
      tokenSymbolTo: data.tokenOut.address,
      amountIn: data.amount,
      amountOutMinimum: '0',
    };

    let success: boolean;
    let tx: any | undefined = undefined;
    let error: any = null;

    try {
      const result = await this.executeSwap(exectuteSwap);
      if (typeof result.tx === 'string') {
        tx = result;
        success = true;
      } else {
        success = false;
        error = result.error;
      }
    } catch (e) {
      success = false;
      this.logger.error(e);
      error = e;
    }

    await this.eventEmitter.emit('limit-order.close', {
      orderId: data.orderId,
      userId: data.userId,
      walletAddress: data.walletAddress,
      telegramId: data.telegramId,
      chainName: ChainNames.SONIC,
      txHash: tx.txHash ?? '',
      tokenIn: data.tokenIn,
      tokenOut: data.tokenOut,
      amountIn: data.amount,
      amountOut: tx.amountOut ?? '0',
      reason: success ? 'Order executed successfully' : `Order execution failed: ${error}`,
    });
  }

  public async getRate(userAddress: string, tokenAdressFrom: string, tokenAdressTo: string): Promise<{ dex: string, rate: number }> {
    let dex = 'magpie';
    let rate;
    const decimalsIn = tokenAdressFrom == ZERO_ADDRESS ? 18 : await this.evmUtils.getErc20Decimals(ChainNames.SONIC, tokenAdressFrom);
    const amountOne = ethers.utils.parseUnits('1', decimalsIn);
    const quoteMagpieData = await this.sonicUtils.fetchMagpieQuote(userAddress, tokenAdressFrom, tokenAdressTo, amountOne.toString());
    const decimalsOut = tokenAdressTo == ZERO_ADDRESS ? 18 : await this.evmUtils.getErc20Decimals(ChainNames.SONIC, tokenAdressTo);

    if (!quoteMagpieData) {
      const quouteOdosData = await this.sonicUtils.fetchOdosQuote(userAddress, tokenAdressFrom, tokenAdressTo, amountOne.toString());
      dex = 'odos';
      rate = parseFloat(ethers.utils.formatUnits(quouteOdosData.outAmounts[0], decimalsOut));
    } else {
      rate = parseFloat(ethers.utils.formatUnits(quoteMagpieData.amountOut, decimalsOut));
    }

    return { dex, rate };

  }

  public async createLimitOrder(args: ExecuteLimitOrderDto): Promise<CreateOrderDto | string> {
    const { userId, userAddress, tokenSymbolFrom, tokenSymbolTo, amount } = args;
    const { user } = await this.userRepository.getUserAccount(userId, userAddress);

    let tokenIn = await this.tokensService.fetchTokenAddressByTicker(
      { chainName: ChainNames.SONIC, symbol: tokenSymbolFrom }
    );
    if (!tokenIn.address) {
      throw new Error(`Token ${tokenSymbolFrom} not found`);
    }
    let tokenOut = await this.tokensService.fetchTokenAddressByTicker(
      { chainName: ChainNames.SONIC, symbol: tokenSymbolTo }
    );
    if (!tokenOut.address) {
      throw new Error(`Token ${tokenSymbolTo} not found`);
    }
    const rateArgs: ExecuteSwapDto = {
      userId: userId,
      userAddress: userAddress,
      tokenSymbolFrom: tokenSymbolFrom,
      tokenSymbolTo: tokenSymbolTo,
      amountIn: amount,
      amountOutMinimum: '0'
    }
    const { tokenInInfo, tokenOutInfo } = await this.initializeSwap(rateArgs);
    const { dex, rate } = await this.getRate(userAddress, tokenOutInfo.address, tokenInInfo.address);

    const threshold = Math.abs(parseFloat(args.threshold));

    const buyPrice = rate;
    const sellPrice = buyPrice / (1 + threshold / 100);
    const createOrder = {
      orderId: ethers.utils.id(Date.now().toString()),
      userId: user.id,
      telegramId: user.telegramID,
      chainName: ChainNames.SONIC,
      walletAddress: args.userAddress,
      dex,
      tokenIn: tokenIn.isNative ? { address: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", symbol: tokenSymbolFrom, decimals: 18, name: tokenSymbolFrom } : await this.evmUtils.getTokenMetadata(ChainNames.SONIC, tokenIn.address),
      tokenOut: tokenOut.isNative ? { address: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38", symbol: tokenSymbolTo, decimals: 18, name: tokenSymbolTo } : await this.evmUtils.getTokenMetadata(ChainNames.SONIC, tokenOut.address),
      threshold: String(threshold),
      amount,
      buyPrice: String(buyPrice),
      sellPrice: String(sellPrice),
      creationTimestamp: String(await this.evmUtils.getTimestamp(ChainNames.SONIC)),
      expirationTimestamp: args.expiration
        ? String((await this.evmUtils.getTimestamp(ChainNames.SONIC)) + parseInt(args.expiration))
        : '0',
      isActive: true,
    };

    await this.eventEmitter.emit('limit-order.create', createOrder);

    createOrder.creationTimestamp = new Date(
      parseInt(createOrder.creationTimestamp) * 1000,
    ).toISOString();
    createOrder.expirationTimestamp = new Date(
      parseInt(createOrder.expirationTimestamp.toString()) * 1000,
    ).toISOString();
    createOrder.buyPrice = parseFloat(createOrder.buyPrice).toFixed(4);
    createOrder.sellPrice = parseFloat(createOrder.sellPrice).toFixed(4);
    createOrder.amount = parseFloat(createOrder.amount).toFixed(4);

    return createOrder;
  }


  // private async fetchPairs(): Promise<PairData[]> {
  //   try {
  //     const response = await fetch(this.PAIRS_API_URL);
  //     if (!response.ok) {
  //       this.logger.error(`Failed to fetch pairs: ${response.statusText}`);
  //       return [];
  //     }
  //     const data = await response.json();
  //     return data?.pairs || [];
  //   } catch (error) {
  //     this.logger.error('Error fetching pairs:', error);
  //     return [];
  //   }
  // }

  public async executeSwap(args: ExecuteSwapDto): Promise<any | { error: string }> {
    try {
      const { signer, tokenInInfo, tokenOutInfo, amountInRaw } = await this.initializeSwap(args);
      const quoteMagpieData = await this.sonicUtils.fetchMagpieQuote(await signer.getAddress(), tokenInInfo.address, tokenOutInfo.address, amountInRaw);
      let txData: any;
      if (quoteMagpieData) {
        txData = await this.sonicUtils.fetchMagpieTransaction(quoteMagpieData.id);
      }

      if (!txData) {
        const quouteOdosData = await this.sonicUtils.fetchOdosQuote(await signer.getAddress(), tokenInInfo.address, tokenOutInfo.address, amountInRaw);
        txData = await this.sonicUtils.fetchOdosTx(args, quouteOdosData);
      }

      await this.evmUtils.ensureSufficientBalanceAndAllowance(
        ChainNames.SONIC,
        tokenInInfo.address,
        signer,
        txData.to,
        args.amountIn,
        tokenInInfo.isNative,
      );
      let value = { value: 0 }
      if (tokenInInfo.isNative) {
        value = { value: amountInRaw };
      }

      if (tokenOutInfo.address == ZERO_ADDRESS) {
        tokenOutInfo.isNative = true;
      }

      const balanceBefore = tokenOutInfo.isNative ? await this.evmUtils.getBalanceNative(ChainNames.SONIC, args.userAddress) : await this.evmUtils.getBalanceERC20(ChainNames.SONIC, args.userAddress, tokenOutInfo.address);
      const tx = await signer.sendTransaction({ ...txData, ...value });
      await tx.wait();
      const balanceAfter = tokenOutInfo.isNative ? await this.evmUtils.getBalanceNative(ChainNames.SONIC, args.userAddress) : await this.evmUtils.getBalanceERC20(ChainNames.SONIC, args.userAddress, tokenOutInfo.address);

      const amountOutFormatted = ethers.utils.formatUnits(ethers.BigNumber.from(balanceAfter).sub(ethers.BigNumber.from(balanceBefore)), tokenOutInfo.isNative ? 18 : await this.evmUtils.getErc20Decimals(ChainNames.SONIC, tokenOutInfo.address));

      await tx.wait();
      return {
        txHash: tx.hash,
        tx: `https://sonicscan.org/tx/${tx.hash}`,
        fromSymbol: args.tokenSymbolFrom,
        toSymbol: args.tokenSymbolTo,
        tokenIn: tokenInInfo.address,
        tokenOut: tokenOutInfo.address,
        amountIn: args.amountIn,
        amountOut: amountOutFormatted,
      };
    } catch (error: unknown) {
      this.logger.error('Swap execution error', error);
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: 'Unknown error' };
    }
  }

  private async initializeSwap(args: ExecuteSwapDto): Promise<{ signer: Wallet; tokenInInfo: any; tokenOutInfo: any; amountInRaw: any }> {
    const { userId, userAddress, tokenSymbolFrom, tokenSymbolTo, amountIn } = args;
    const { encryptedKey } = await this.userRepository.getUserAccount(userId, userAddress);
    const privateKey = await this.kmsService.decryptSecret(encryptedKey);
    const signer = this.evmUtils.privateKeyToSigner(ChainNames.SONIC, privateKey);
    const tokenInInfo = await this.tokensService.fetchTokenAddressByTicker(
      { chainName: ChainNames.SONIC, symbol: tokenSymbolFrom }
    );

    if (tokenInInfo.error || !tokenInInfo.address) {
      throw new Error(`Failed to fetch ${tokenSymbolFrom} token in address`);
    }

    const tokenOutInfo = await this.tokensService.fetchTokenAddressByTicker(
      { chainName: ChainNames.SONIC, symbol: tokenSymbolTo }
    );
    ;

    if (tokenOutInfo.error || !tokenOutInfo.address) {
      throw new Error(`Failed to fetch ${tokenSymbolFrom} token in address`);
    }

    const decimalsTokenIn = tokenInInfo.address == ZERO_ADDRESS ? 18 : await (new ethers.Contract(tokenInInfo.address, this.ERC20_ABI, signer)).decimals();
    const amountAfterFees = await this.feeService.payFee(ChainNames.SONIC, amountIn, tokenInInfo.address, tokenInInfo.isNative ?? false, signer, Ops.SWAP);
    const amountInRaw = ethers.utils.parseUnits(amountAfterFees.toString(), decimalsTokenIn);

    return { signer, tokenInInfo, tokenOutInfo, amountInRaw };
  }
}