import { Injectable, Logger } from '@nestjs/common';
import { BigNumber, ethers } from 'ethers';

import { ChainNames } from 'modules/blockchain/constants';
import { EvmUtils } from 'modules/blockchain/evm.utils';
import { PoolRepository } from 'modules/database/repository/hyperswap-pool.repository';
import { UserRepository } from 'modules/database/repository/user.repository';
import { KmsService } from 'modules/kms/kms.service';

import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { formatUnits } from 'ethers/lib/utils';
import { SwapOrder } from 'modules/database/entities/swap-order.entity';
import factoryAbi from './abi/factory.json';
import pairAbi from './abi/pair.json';
import routerV3Abi from './abi/position-manager.json';
import quoterV3Abi from './abi/quoter.json';
import routerV2Abi from './abi/router.json';

import { ExecuteLimitOrderDto, ExecuteSwapDto } from 'modules/blockchain/dto/params';
import { DcaSubscription } from 'modules/database/entities/dca-subscription.entity';
import { FeeService, Ops } from 'modules/fee/fee.service';
import { CreateOrderDto } from 'modules/swap-orders/dto/order.dto';
import { TokensService } from 'modules/tokens/tokens.service';
import { QuoteSwapDto } from './dto/hyperswap.dto';

@Injectable()
export class HyperSwapService {
  private readonly ROUTER_ADDRESS_V3 = '0x4E2960a8cd19B467b82d26D83fAcb0fAE26b094D';
  private readonly QUOTER_ADDRESS_V3 = '0x03A918028f22D9E1473B7959C927AD7425A45C7C';

  private readonly ROUTER_ADDRESS_V2 = '0xb4a9C4e6Ea8E2191d2FA5B380452a634Fb21240A';
  private readonly FACTORY_ADDRESS_V2 = '0x724412C00059bf7d6ee7d4a1d0D5cd4de3ea1C48';

  private readonly ERC20_ABI = [
    'function approve(address spender, uint256 amount) public returns (bool)',
    'function allowance(address owner, address spender) public view returns (uint256)',
    'function balanceOf(address account) public view returns (uint256)',
    'function decimals() public view returns (uint8)',
  ];

  private readonly logger = new Logger(HyperSwapService.name);

  constructor(
    private readonly evmUtils: EvmUtils,
    private readonly kmsService: KmsService,
    private readonly poolRepository: PoolRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokensService,
    private readonly feeService: FeeService
  ) { }


  @OnEvent("dca.buy.hyper")
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

  @OnEvent('limit-order.buy.hyper')
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
    let tx: string | undefined = undefined;
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
      chainName: ChainNames.HYPER,
      txHash: tx ?? '',
      tokenIn: data.tokenIn,
      tokenOut: data.tokenOut,
      amountIn: data.amount,
      reason: success ? 'Order executed successfully' : `Order execution failed: ${error}`,
    });
  }

  public async getRate(tokenAdressFrom: string, tokenAdressTo: string): Promise<number> {
    const provider = this.evmUtils.getProvider(ChainNames.HYPER);
    const quoter = new ethers.Contract(this.QUOTER_ADDRESS_V3, quoterV3Abi, provider);
    const pool = await this.poolRepository.findPairsByTokenAddresses(tokenAdressFrom, tokenAdressTo);

    for (const p of pool) {
      if (p.version === 'v3') {
        const tokenInContract = new ethers.Contract(tokenAdressFrom, this.ERC20_ABI, provider);
        const amountInRaw = ethers.utils.parseUnits('1', await tokenInContract.decimals());

        const params = {
          tokenIn: tokenAdressFrom,
          tokenOut: tokenAdressTo,
          amountIn: amountInRaw,
          fee: p.fee,
          sqrtPriceLimitX96: 0,
        };
        const quote = await quoter.callStatic.quoteExactInputSingle(params);
        const tokenOutContract = new ethers.Contract(tokenAdressTo, this.ERC20_ABI, provider);
        const decimals = await tokenOutContract.decimals();
        return parseFloat(formatUnits(quote.amountOut, decimals));
      }

      if (p.version === 'v2') {
        const tokenInContract = new ethers.Contract(tokenAdressFrom, this.ERC20_ABI, provider);
        const amountInRaw = ethers.utils.parseUnits('1', await tokenInContract.decimals());

        const params = {
          tokenIn: tokenAdressFrom,
          tokenOut: tokenAdressTo,
          amountIn: amountInRaw,
          fee: p.fee,
          sqrtPriceLimitX96: 0,
        };
        const quote = await quoter.callStatic.quoteExactInputSingle(params);
        const tokenOutContract = new ethers.Contract(tokenAdressTo, this.ERC20_ABI, provider);
        const decimals = await tokenOutContract.decimals();
        return parseFloat(formatUnits(quote.amountOut, decimals));
      }
    }
    throw new Error(`Pool not found for ${tokenAdressFrom} and ${tokenAdressTo}`);
  }


  public async getAmountOut(
    tokenAddressFrom: string,
    tokenAddressTo: string,
    amountIn: string,
  ): Promise<BigNumber> {
    const provider = this.evmUtils.getProvider(ChainNames.HYPER);
    const factory = new ethers.Contract(this.FACTORY_ADDRESS_V2, factoryAbi, provider);
    const pairAddress = await factory.getPair(tokenAddressFrom, tokenAddressTo);

    if (pairAddress === ethers.constants.AddressZero) {
      throw new Error('No Uniswap V2 pair found for the provided tokens.');
    }

    const pairContract = new ethers.Contract(pairAddress, pairAbi, provider);
    const reserves = await pairContract.getReserves();
    const token0 = await pairContract.token0();

    const [reserveIn, reserveOut] =
      tokenAddressFrom.toLowerCase() === token0.toLowerCase()
        ? [reserves[0], reserves[1]]
        : [reserves[1], reserves[0]];

    if (reserveIn.eq(0) || reserveOut.eq(0)) {
      throw new Error('Insufficient liquidity in Uniswap V2 pool.');
    }

    const amountInRaw = BigNumber.from(amountIn);
    return this.getAmountOutFormula(amountInRaw, reserveIn, reserveOut);
  }

  public async swapExactTokensForTokens(
    tokenAddressFrom: string,
    tokenAddressTo: string,
    amountIn: string,
    signer: ethers.Signer,
    recipient: string,
    amountOutMinimum: string = '0',
    isNative: boolean = false,
  ): Promise<any> {
    const router = new ethers.Contract(this.ROUTER_ADDRESS_V2, routerV2Abi, signer);

    const path = [tokenAddressFrom, tokenAddressTo];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 5;

    if (!isNative) {
      const tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        amountIn,
        amountOutMinimum,
        path,
        recipient,
        ethers.constants.AddressZero,
        deadline,
      );
      await tx.wait();
      return tx.hash;
    } else {
      const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        amountOutMinimum,
        path,
        recipient,
        ethers.constants.AddressZero,
        deadline,
        { value: amountIn },
      );
      await tx.wait();
      return tx;
    }
  }


  public async quoteSwap(args: QuoteSwapDto): Promise<string> {
    const { tokenSymbolFrom, tokenSymbolTo, amountIn } = args;
    const provider = this.evmUtils.getProvider(ChainNames.HYPER);
    const quoter = new ethers.Contract(this.QUOTER_ADDRESS_V3, quoterV3Abi, provider);

    let tokenIn = await this.tokenService.fetchTokenAddressByTicker({ chainName: ChainNames.HYPER, symbol: tokenSymbolFrom });
    let tokenOut = await this.tokenService.fetchTokenAddressByTicker({ chainName: ChainNames.HYPER, symbol: tokenSymbolTo });

    if (!tokenIn.address || !tokenOut.address) {
      throw new Error(`Token not found for ${tokenSymbolFrom} or ${tokenSymbolTo}`);
    }

    const pool = await this.poolRepository.findPairsByTokenAddresses(tokenIn.address, tokenOut.address);

    for (const p of pool) {
      const tokenInContract = new ethers.Contract(tokenIn.address, this.ERC20_ABI, provider);
      const tokenOutContract = new ethers.Contract(tokenOut.address, this.ERC20_ABI, provider);

      if (p.version === 'v3') {
        const amountInRaw = ethers.utils.parseUnits(amountIn, await tokenInContract.decimals());
        const params = {
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          amountIn: amountInRaw,
          fee: p.fee,
          sqrtPriceLimitX96: 0,
        };
        const quote = await quoter.callStatic.quoteExactInputSingle(params);
        const decimals = await tokenOutContract.decimals();
        return parseFloat(formatUnits(quote.amountOut, decimals)).toFixed(4);
      }

      if (p.version === 'v2') {
        const amountInRaw = ethers.utils.parseUnits(amountIn, await tokenInContract.decimals());
        const amountOut = await this.getAmountOut(tokenIn.address, tokenOut.address, amountInRaw.toString());
        const tokenOutDecimals = await tokenOutContract.decimals();
        return parseFloat(formatUnits(amountOut, tokenOutDecimals)).toFixed(4);
      }
    }
    throw new Error(`Pool not found for ${tokenIn.address} and ${tokenOut.address}`);
  }

  public async createLimitOrder(args: ExecuteLimitOrderDto): Promise<CreateOrderDto | string> {
    const { userId, userAddress, tokenSymbolFrom, tokenSymbolTo, amount } = args;
    const { encryptedKey, user } = await this.userRepository.getUserAccount(userId, userAddress);
    const privateKey = await this.kmsService.decryptSecret(encryptedKey);
    const signer = this.evmUtils.privateKeyToSigner(ChainNames.HYPER, privateKey);
    const router = new ethers.Contract(this.ROUTER_ADDRESS_V3, routerV3Abi, signer);

    let tokenInInfo = await this.tokenService.fetchTokenAddressByTicker({ chainName: ChainNames.HYPER, symbol: tokenSymbolFrom });
    let tokenOutInfo = await this.tokenService.fetchTokenAddressByTicker({ chainName: ChainNames.HYPER, symbol: tokenSymbolTo });

    if (!tokenInInfo.address || !tokenOutInfo.address) {
      throw new Error(`Token not found for ${tokenSymbolFrom} or ${tokenSymbolTo}`);
    }

    await this.evmUtils.ensureSufficientBalanceAndAllowance(
      ChainNames.HYPER,
      tokenInInfo.address,
      signer,
      router.address,
      amount,
      tokenInInfo.isNative ?? false,
    );

    const pool = await this.poolRepository.findPairsByTokenAddresses(
      tokenInInfo.address,
      tokenOutInfo.address,
    );
    let finalPool = pool.find((p) => p.version === 'v3');

    if (!finalPool || finalPool.fee === undefined) {
      throw new Error(
        `Pool not found for ${tokenInInfo.address} and ${tokenOutInfo.address}`,
      );
    }

    const rate = await this.getRate(tokenOutInfo.address, tokenInInfo.address);
    const buyPrice = rate;
    const sellPrice = buyPrice / (1 + args.threshold / 100);

    const createOrder = {
      orderId: ethers.utils.id(Date.now().toString()),
      userId: user.id,
      telegramId: user.telegramID,
      chainName: ChainNames.HYPER,
      walletAddress: args.userAddress,
      dex: 'hyperswap',
      tokenIn: await this.evmUtils.getTokenMetadata(ChainNames.HYPER, tokenInInfo.address),
      tokenOut: await this.evmUtils.getTokenMetadata(ChainNames.HYPER, tokenOutInfo.address),
      threshold: args.threshold,
      amount,
      buyPrice: String(buyPrice),
      sellPrice: String(sellPrice),
      creationTimestamp: String(await this.evmUtils.getTimestamp(ChainNames.HYPER)),
      expirationTimestamp: args.expiration
        ? String((await this.evmUtils.getTimestamp(ChainNames.HYPER)) + parseInt(args.expiration))
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


  public async executeSwap(args: ExecuteSwapDto): Promise<any | { error: string }> {
    const { userId, userAddress, tokenSymbolFrom, tokenSymbolTo, amountIn, amountOutMinimum } = args;
    const { encryptedKey } = await this.userRepository.getUserAccount(userId, userAddress);
    const privateKey = await this.kmsService.decryptSecret(encryptedKey);
    const signer = this.evmUtils.privateKeyToSigner(ChainNames.HYPER, privateKey);
    const routerV2 = new ethers.Contract(this.ROUTER_ADDRESS_V2, routerV2Abi, signer);
    const routerV3 = new ethers.Contract(this.ROUTER_ADDRESS_V3, routerV3Abi, signer);

    let tokenInInfo = await this.tokenService.fetchTokenAddressByTicker({ chainName: ChainNames.HYPER, symbol: tokenSymbolFrom });
    let tokenOutInfo = await this.tokenService.fetchTokenAddressByTicker({ chainName: ChainNames.HYPER, symbol: tokenSymbolTo });

    if (!tokenInInfo.address || !tokenOutInfo.address) {
      throw new Error(`Token not found for ${tokenSymbolFrom} or ${tokenSymbolTo}`);
    }

    const pool = await this.poolRepository.findPairsByTokenAddresses(
      tokenInInfo.address,
      tokenOutInfo.address,
    );

    const balanceBefore = await (new ethers.Contract(tokenOutInfo.address, this.ERC20_ABI, signer)).balanceOf(userAddress);

    for (const p of pool) {
      if (p.version === 'v3') {
        let fee: number;
        if (!p || p.fee === undefined) {
          fee = 3000;
        } else {
          fee = p.fee;
        }

        let amountAfterFee = await this.feeService.payFee(ChainNames.HYPER, amountIn, tokenInInfo.address, tokenInInfo.isNative ?? false, signer, Ops.SWAP);

        const amountInRaw = await this.evmUtils.ensureSufficientBalanceAndAllowance(
          ChainNames.HYPER,
          tokenInInfo.address,
          signer,
          routerV3.address,
          amountAfterFee,
          tokenInInfo.isNative ?? false,
        );

        const params = {
          tokenIn: tokenInInfo.address,
          tokenOut: tokenOutInfo.address,
          fee,
          recipient: signer.address,
          deadline: Math.floor(Date.now() / 1000) + 60 * 5,
          amountIn: amountInRaw,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        };

        this.logger.log(params);

        const tx = await routerV3.exactInputSingle(
          params,
          tokenInInfo.isNative ? { value: amountInRaw } : {},
        );
        await tx.wait();
        const balanceAfter = await (new ethers.Contract(tokenOutInfo.address, this.ERC20_ABI, signer)).balanceOf(userAddress);

        const amountOut = balanceAfter.sub(balanceBefore);

        return {
          tx: `https://purrsec.com/hyper_evm/tx/${(tx as any).hash ?? tx}`,
          fromSymbol: tokenSymbolFrom,
          toSymbol: tokenSymbolTo,
          tokenIn: tokenInInfo.address,
          tokenOut: tokenOutInfo.address,
          amountIn: amountIn,
          amountOut: formatUnits(amountOut, await (new ethers.Contract(tokenOutInfo.address, this.ERC20_ABI, signer)).decimals()),
        };
      }

      if (p.version === 'v2') {

        const amountInRaw = await this.evmUtils.ensureSufficientBalanceAndAllowance(
          ChainNames.HYPER,
          tokenInInfo.address,
          signer,
          routerV2.address,
          amountIn,
          tokenInInfo.isNative ?? false,
        );

        const tx = await this.swapExactTokensForTokens(
          tokenInInfo.address,
          tokenOutInfo.address,
          amountInRaw.toString(),
          signer,
          userAddress,
          amountOutMinimum,
          tokenInInfo.isNative,
        );
        await tx.wait();
        const balanceAfter = await (new ethers.Contract(tokenOutInfo.address, this.ERC20_ABI, signer)).balanceOf(userAddress);
        const amountOut = balanceAfter.sub(balanceBefore);
        return {
          tx: `https://purrsec.com/hyper_evm/tx/${(tx as any).hash ?? tx}`,
          tokenIn: tokenInInfo.address,
          tokenOut: tokenOutInfo.address,
          amountIn: amountIn,
          amountOut: formatUnits(amountOut, await (new ethers.Contract(tokenOutInfo.address, this.ERC20_ABI, signer)).decimals()),
        };
      }
    }
    throw new Error(`Pool not found for ${tokenInInfo.address} and ${tokenOutInfo.address}`);
  }

  private getAmountOutFormula(
    amountIn: ethers.BigNumber,
    reserveIn: ethers.BigNumber,
    reserveOut: ethers.BigNumber,
  ) {
    const amountInWithFee = amountIn.mul(997); // 0.3% fee
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(1000).add(amountInWithFee);
    return numerator.div(denominator);
  }
}
