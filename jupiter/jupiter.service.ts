import { CloseDCAParams, CreateDCAParamsV2, DCA, Network } from '@jup-ag/dca-sdk';
import { LimitOrderProvider } from '@jup-ag/limit-order-sdk';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionSignature,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { ChainNames, ZERO_SOL_ADDRESS } from '../modules/blockchain/constants';
import { ExecuteLimitOrderDto } from '../modules/blockchain/dto/params';
import { SwapResponseDto } from '../modules/blockchain/dto/response.dto';
import { SolanaUtils } from '../modules/blockchain/solana.utils';
import { AccountRepository } from '../modules/database/repository/account.repository';
import { UserRepository } from '../modules/database/repository/user.repository';
import { CloseDcaDto, GetDcaDto, SubscribeToDcaDto } from '../modules/dca/dto/dca.dto';
import { FeeService, Ops } from '../modules/fee/fee.service';
import { KmsService } from '../modules/kms/kms.service';
import { SettingsService } from '../modules/settings/settings.service';
import { CreateOrderDto } from '../swap-orders/dto/order.dto';
import { SwapSolanaParams, SwapSolanaParamsExt } from './dto/jupiter.dto';

@Injectable()
export class JupiterService implements OnModuleInit {
  private readonly logger = new Logger(JupiterService.name);
  private connection: Connection;
  private HELIUM_RPC_URL: string;

  private ENDPOINT_APIS_URL = {
    QUOTE: 'https://lite-api.jup.ag/swap/v1/quote',
    SWAP: 'https://lite-api.jup.ag/swap/v1/swap',
    CREATE_ORDER: 'https://lite-api.jup.ag/trigger/v1/createOrder',
    CANCEL_ORDERS: 'https://lite-api.jup.ag/trigger/v1/cancelOrders',
    TRIGGER_ORDERS: 'https://lite-api.jup.ag/trigger/v1/getTriggerOrders',
    PRICE: 'https://lite-api.jup.ag/price/v2',
  };

  constructor(
    private readonly kmsService: KmsService,
    private readonly settingsService: SettingsService,
    private readonly solanaUtils: SolanaUtils,
    private readonly userRepository: UserRepository,
    private readonly accountRepository: AccountRepository,
    private readonly feeService: FeeService,
  ) {
    this.HELIUM_RPC_URL = settingsService.getSettings().solana.rpc;
  }

  async onModuleInit(): Promise<void> {
    this.connection = new Connection(this.HELIUM_RPC_URL, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 120000,
    });
    this.logger.log('Solana connection initialized (Helium RPC)');
  }

  async createDcaSubscription(params: SubscribeToDcaDto): Promise<any> {
    const { userId, userAddress, tokenFrom, tokenTo, amount, amountPerCycle, cycleInterval } = params;
    if (!userId || !userAddress || !tokenFrom || !tokenTo || !amount || !amountPerCycle || !cycleInterval) {
      throw new Error('Missing required parameters');
    }
    const userAccount = await this.userRepository.getUserAccount(userId, userAddress);
    const tokenFromAddress = await this.solanaUtils.normalizeSolanaAddressOrSymbol(
      tokenFrom,
      ChainNames.SOLANA,
      userAccount.address,
    );
    const tokenToAddress = await this.solanaUtils.normalizeSolanaAddressOrSymbol(
      tokenTo,
      ChainNames.SOLANA,
      userAccount.address,
    );
    const { encryptedKey, user } = await this.userRepository.getUserAccount(userId, userAddress);
    const privateKey = await this.kmsService.decryptSecret(encryptedKey);
    const walletKeypair = this.solanaUtils.privateKeyToKeypair(privateKey);

    let balance = '0';
    if (['sol', 'solana'].includes(tokenFrom.toLowerCase())) {
      balance = await this.solanaUtils.getBalance(userAccount.address);
    } else {
      balance = await this.solanaUtils.getBalanceSPL(userAccount.address, tokenFromAddress);
    }
    if (parseFloat(balance) < parseFloat(amount)) {
      throw new Error(`Insufficient balance for token ${tokenFrom}`);
    }
    return this.openDca(
      tokenFromAddress,
      tokenToAddress,
      walletKeypair,
      parseFloat(amount),
      parseFloat(amountPerCycle),
      parseInt(cycleInterval),
    );
  }

  async closeDcaSubscription(params: CloseDcaDto): Promise<any> {
    const { userId, userAddress, index, dcaKey } = params;
    if (!userId || !userAddress) {
      throw new Error('Missing required parameters');
    }
    const userAccount = await this.userRepository.getUserAccount(userId, userAddress);
    const { encryptedKey, user } = await this.userRepository.getUserAccount(userId, userAddress);
    const privateKey = await this.kmsService.decryptSecret(encryptedKey);
    const walletKeypair = this.solanaUtils.privateKeyToKeypair(privateKey);

    if (dcaKey) {
      return this.closeDca(dcaKey, walletKeypair);
    }
    if (index !== undefined) {
      const dcas = await this.getDcaAccounts(userAccount.address);
      if (dcas.length > index) {
        return this.closeDca(dcas[index].publicKey, walletKeypair);
      }
      throw new Error(`Index ${index} is out of bounds`);
    }
    throw new Error('Please provide either dcaKey or index');
  }

  async getUserDcaSubscriptions(params: GetDcaDto): Promise<any> {
    const { userId, userAddress } = params;
    if (!userId || !userAddress) {
      throw new Error('Missing required parameters');
    }
    const dcaAccounts = await this.getDcaAccounts(userAddress);
    const formatTimestamp = (ts: string) => new Date(parseInt(ts, 10) * 1000).toISOString();
    return Promise.all(
      dcaAccounts.map(async (raw: any) => {
        const acct = raw.account;
        const inputMeta = await this.solanaUtils.getTokenMetadata(acct.inputMint);
        const outputMeta = await this.solanaUtils.getTokenMetadata(acct.outputMint);
        const decimalsIn = Math.pow(10, await this.solanaUtils.getTokenDecimals(acct.inputMint));
        const decimalsOut = Math.pow(10, await this.solanaUtils.getTokenDecimals(acct.outputMint));
        return {
          publicKey: raw.publicKey,
          user: acct.user,
          inputToken: inputMeta.symbol,
          outputToken: outputMeta.symbol,
          depositedAmount: acct.inDeposited.toNumber() / decimalsIn,
          outReceived: acct.outReceived.toNumber() / decimalsOut,
          amountPerCycle: acct.inAmountPerCycle.toNumber() / decimalsIn,
          nextCycleAmountLeft: acct.nextCycleAmountLeft.toNumber() / decimalsIn,
          nextCycleAt: formatTimestamp(acct.nextCycleAt.toString()),
          createdAt: formatTimestamp(acct.createdAt.toString()),
        };
      }),
    );
  }

  async getDcaAccounts(walletAddress: string): Promise<any> {
    const dcaClient = new DCA(this.connection, Network.MAINNET);
    return dcaClient.getCurrentByUser(new PublicKey(walletAddress));
  }

  async openDca(
    input: string,
    output: string,
    fromKeypair: Keypair,
    totalInAmount: number,
    amountPerCycle: number,
    cycleFrequency: number,
    minOutAmountPerCycle?: bigint,
    maxOutAmountPerCycle?: bigint,
    startAt?: number,
  ): Promise<{ transactionSignature: TransactionSignature; dcaPubKey: PublicKey }> {
    const dcaClient = new DCA(this.connection, Network.MAINNET);
    const decimals = await this.solanaUtils.getTokenDecimals(input);
    const total = BigInt(totalInAmount * Math.pow(10, decimals));
    const perCycle = BigInt(amountPerCycle * Math.pow(10, decimals));
    const inputMint = new PublicKey(input);
    const outputMint = new PublicKey(output);
    const params: CreateDCAParamsV2 = {
      payer: fromKeypair.publicKey,
      user: fromKeypair.publicKey,
      inAmount: total,
      inAmountPerCycle: perCycle,
      cycleSecondsApart: BigInt(cycleFrequency),
      inputMint,
      outputMint,
      minOutAmountPerCycle: minOutAmountPerCycle ?? null,
      maxOutAmountPerCycle: maxOutAmountPerCycle ?? null,
      startAt: startAt ? BigInt(startAt) : null,
    };
    const { tx, dcaPubKey } = await dcaClient.createDcaV2(params);
    const transactionSignature = await sendAndConfirmTransaction(this.connection, tx, [fromKeypair]);
    return { transactionSignature, dcaPubKey };
  }

  async closeDca(dcaPubKey: string, fromKeypair: Keypair): Promise<any> {
    const dcaClient = new DCA(this.connection, Network.MAINNET);
    const params: CloseDCAParams = {
      user: fromKeypair.publicKey,
      dca: dcaPubKey,
    };
    const { tx } = await dcaClient.closeDCA(params);
    return sendAndConfirmTransaction(this.connection, tx, [fromKeypair]);
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps?: number,
    swapMode = 'ExactIn',
    onlyDirectRoutes = false,
    asLegacyTransaction = false,
    excludeDexes?: string[],
    maxAccounts?: number,
    platformFeeBps?: number,
  ): Promise<any> {
    const decimals = await this.solanaUtils.getTokenDecimals(inputMint);
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: Math.round(amount * Math.pow(10, decimals)).toString(),
      swapMode,
      onlyDirectRoutes: String(onlyDirectRoutes),
      asLegacyTransaction: String(asLegacyTransaction),
    });
    if (slippageBps !== undefined) {
      params.append('slippageBps', slippageBps.toString());
    }
    if (excludeDexes?.length) {
      params.append('excludeDexes', excludeDexes.join(','));
    }
    if (maxAccounts !== undefined) {
      params.append('maxAccounts', maxAccounts.toString());
    }
    if (platformFeeBps !== undefined) {
      params.append('plateformFeeBps', platformFeeBps.toString());
    }

    const quoteUrl = `${this.ENDPOINT_APIS_URL.QUOTE}?${params.toString()}`;
    const response = await fetch(quoteUrl);
    const data = await response.json();
    if (data.routePlan === undefined) {
      throw new Error(data.error || 'Unknown error in quote response');
    }
    return data;
  }

  async getSwapTransaction(
    inputMint: string,
    outputMint: string,
    fromKeypair: Keypair,
    amount: number,
    quoteResponse?: any,
    prioritizationFeeLamports?: number,
    wrapUnwrapSol = true,
    slippageBps = 1,
    swapMode = 'ExactIn',
    onlyDirectRoutes = false,
    asLegacyTransaction = false,
    excludeDexes?: string[],
    maxAccounts?: number,
    platformFeeBps?: number,
  ): Promise<TransactionSignature> {
    let finalQuote = quoteResponse;
    if (!finalQuote) {
      finalQuote = await this.getQuote(
        inputMint,
        outputMint,
        amount,
        slippageBps,
        swapMode,
        onlyDirectRoutes,
        asLegacyTransaction,
        excludeDexes,
        maxAccounts,
        platformFeeBps,
      );
    }
    const body: any = {
      quoteResponse: finalQuote,
      userPublicKey: fromKeypair.publicKey.toBase58(),
      wrapUnwrapSol,
    };
    if (prioritizationFeeLamports !== undefined) {
      body.prioritizationFeeLamports = prioritizationFeeLamports;
    }
    this.logger.log(` -> ENDPOINT_APIS_URL: ${this.ENDPOINT_APIS_URL.SWAP}`);
    const response = await fetch(this.ENDPOINT_APIS_URL.SWAP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return data.swapTransaction;
  }

  async executeSwap(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps = 50,
    fromKeypair: Keypair,
  ): Promise<TransactionSignature> {
    amount = parseFloat(
      await this.feeService.payFee(ChainNames.SOLANA, amount.toString(), inputMint, false, fromKeypair, Ops.SWAP),
    );
    const quoteData = await this.getQuote(inputMint, outputMint, amount, slippageBps);
    const rawSwapTx = await this.getSwapTransaction(
      inputMint,
      outputMint,
      fromKeypair,
      amount,
      quoteData,
      Math.round(await this.solanaUtils.estimateNetworkPrioritizationFee(this.HELIUM_RPC_URL)),
    );
    const txBuffer = Buffer.from(rawSwapTx, 'base64');
    const decodedTx = VersionedTransaction.deserialize(txBuffer);
    const latestBlockhash = await this.connection.getLatestBlockhash('confirmed');
    decodedTx.message.recentBlockhash = latestBlockhash.blockhash;
    decodedTx.sign([fromKeypair]);
    const txSig = await this.connection.sendRawTransaction(decodedTx.serialize(), { skipPreflight: false });
    await this.connection.confirmTransaction(
      {
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature: txSig,
      },
      'confirmed',
    );
    return txSig;
  }

  async swapTokens(params: SwapSolanaParams): Promise<SwapResponseDto> {
    const { userId, fromAddress, tokenMetadataFrom, tokenMetadataTo, amount } = params;
    const { encryptedKey, user } = await this.userRepository.getUserAccount(userId, fromAddress);
    const privateKey = await this.kmsService.decryptSecret(encryptedKey);
    const keypair = this.solanaUtils.privateKeyToKeypair(privateKey);
    const fromMint = tokenMetadataFrom.address;
    const toMint = tokenMetadataTo.address;
    const chainSlippage = await this.accountRepository.getSlippageForChain(userId, fromAddress, ChainNames.SOLANA);
    const slippageBps = chainSlippage ?? 50;

    const signature = await this.executeSwap(
      fromMint,
      toMint,
      parseFloat(amount),
      slippageBps, //(parseFloat(amount) / 100) * slippageBps,
      keypair,
    );

    return {
      transactionHash: signature,
      explorerUrl: await this.solanaUtils.getExplorerUrlForTx(signature),
      from: keypair.publicKey.toBase58(),
      fromSymbol: tokenMetadataFrom.symbol,
      toSymbol: tokenMetadataTo.symbol,
      fromMint,
      toMint,
      amount,
      additionalMessage: 'Swap transaction initiated, confirmation may take time',
    };
  }

  async swapTokensExt(params: SwapSolanaParamsExt): Promise<SwapResponseDto> {
    const tokenFromAddress = await this.solanaUtils.normalizeSolanaAddressOrSymbol(
      params.tokenSymbolFrom,
      ChainNames.SOLANA,
      params.fromAddress,
    );
    const tokenToAddress = await this.solanaUtils.normalizeSolanaAddressOrSymbol(
      params.tokenSymbolTo,
      ChainNames.SOLANA,
      params.fromAddress,
    );
    const fromMeta = await this.solanaUtils.getTokenMetadata(tokenFromAddress);
    const toMeta = await this.solanaUtils.getTokenMetadata(tokenToAddress);

    return this.swapTokens({
      userId: params.userId,
      fromAddress: params.fromAddress,
      tokenMetadataFrom: fromMeta,
      tokenMetadataTo: toMeta,
      amount: params.amount,
      slippageBps: params.slippageBps,
    });
  }

  async getOrderHistory(walletAddress: string): Promise<any> {
    const provider = new LimitOrderProvider(this.connection);
    return provider.getOrderHistory({ wallet: walletAddress });
  }

  async getTradeHistory(walletAddress: string): Promise<any> {
    const provider = new LimitOrderProvider(this.connection);
    return provider.getTradeHistory({ wallet: walletAddress });
  }

  async openOrder(
    fromKeypair: Keypair,
    inputMint: string,
    outputMint: string,
    inAmount: number,
    outAmount: number,
    expiredAt?: number,
  ): Promise<string> {
    // const decimals = await this.solanaUtils.getTokenDecimals(inputMint);
    // const makingAmount = Math.round(inAmount * Math.pow(10, decimals));
    const makingAmount = Math.round(inAmount);
    const takingAmount = Math.round(outAmount);

    const body: any = {
      inputMint,
      outputMint,
      maker: fromKeypair.publicKey.toBase58(),
      payer: fromKeypair.publicKey.toBase58(),
      params: {
        makingAmount: makingAmount.toString(),
        takingAmount: takingAmount.toString(),
      },
      computeUnitPrice: 'auto',
    };
    if (expiredAt) {
      const now = Math.floor(new Date().getTime() / 1000);
      body.params.expiredAt = (now + expiredAt).toString();
    }
    const response = await fetch(this.ENDPOINT_APIS_URL.CREATE_ORDER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!data?.transaction) {
      throw new Error(`Missing 'tx' in createOrder response: ${JSON.stringify(data)}`);
    }
    const transaction = VersionedTransaction.deserialize(Buffer.from(data.transaction, 'base64'));
    transaction.sign([fromKeypair]);
    const rawTx = transaction.serialize();
    const txSig = await this.connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      maxRetries: 2,
    });
    const confirmation = await this.connection.confirmTransaction(txSig, 'finalized');
    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}\n\nhttps://solscan.io/tx/${txSig}`,
      );
    }
    return txSig;
  }

  public async createLimitOrder(args: ExecuteLimitOrderDto): Promise<CreateOrderDto> {
    const threshold = Math.abs(parseFloat(args.threshold!));
    const expiration = parseInt(args.expiration!);

    const { encryptedKey, user } = await this.userRepository.getUserAccount(args.userId, args.userAddress);
    const fromKeypair = this.solanaUtils.privateKeyToKeypair(await this.kmsService.decryptSecret(encryptedKey));

    const tokenFromAddress = await this.solanaUtils.normalizeSolanaAddressOrSymbol(
      args.tokenSymbolFrom,
      ChainNames.SOLANA,
      args.userAddress,
    );
    const tokenToAddress = await this.solanaUtils.normalizeSolanaAddressOrSymbol(
      args.tokenSymbolTo,
      ChainNames.SOLANA,
      args.tokenSymbolTo,
    );

    const decimals = await this.solanaUtils.getTokenDecimals(tokenFromAddress);
    const expandedAmount = parseFloat(args.amount) * Math.pow(10, decimals);
    // const required = expandedAmount + (expandedAmount * threshold) / 100;

    const priceResponse = await fetch(`${this.ENDPOINT_APIS_URL.PRICE}?ids=${tokenFromAddress},${tokenToAddress}`);
    const priceData = await priceResponse.json();

    let currentPrice = 1;

    if (priceData.data) {
      currentPrice = Number(priceData.data[tokenToAddress].price) / Number(priceData.data[tokenFromAddress].price);
    }
    const targetPrice = currentPrice * parseFloat(args.amount) * ((100 - threshold) / 100);
    const required = (parseFloat(args.amount) / targetPrice) * 1_000_000_000;

    await this.openOrder(
      fromKeypair,
      tokenFromAddress,
      tokenToAddress,
      expandedAmount, // "obtained"
      required,
      expiration,
    );

    this.logger.log(
      `Order created for ${tokenToAddress} → ${tokenFromAddress} with obtained=${expandedAmount}, required=${required}, expiration=${expiration}`,
    );

    const order: CreateOrderDto = {
      userId: args.userId,
      orderId: 'orderId',
      telegramId: 'telegramId',
      chainName: ChainNames.SOLANA,
      walletAddress: args.userAddress,
      dex: 'dex',
      tokenIn: {
        name: 'tokenIn',
        address: tokenFromAddress,
        symbol: args.tokenSymbolFrom,
      },
      tokenOut: {
        name: 'tokenOut',
        address: tokenToAddress,
        symbol: args.tokenSymbolTo,
      },
      amount: args.amount,
      buyPrice: 'buyPrice',
      sellPrice: 'sellPrice',
      threshold: args.threshold!,
      creationTimestamp: new Date().toISOString(),
      expirationTimestamp: args.expiration!,
      isActive: true,
    };

    return order;
  }

  async cancelLimitOrders(fromKeypair: Keypair, orders: string[] = []): Promise<string[]> {
    const body: any = {
      maker: fromKeypair.publicKey.toBase58(),
      computeUnitPrice: 'auto',
    };
    if (orders.length) {
      body.orders = orders;
    }
    const response = await fetch(this.ENDPOINT_APIS_URL.CANCEL_ORDERS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!data?.transactions?.length) {
      throw new Error(`No transactions returned from cancelOrders response: ${JSON.stringify(data)}`);
    }
    const signatures: string[] = [];
    for (const txBase64 of data.transactions) {
      const transaction = VersionedTransaction.deserialize(Buffer.from(txBase64, 'base64'));
      transaction.sign([fromKeypair]);
      const rawTx = transaction.serialize();
      const txSig = await this.connection.sendRawTransaction(rawTx, {
        skipPreflight: false,
        maxRetries: 2,
      });
      const confirmation = await this.connection.confirmTransaction(txSig, 'finalized');
      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}\n\nhttps://solscan.io/tx/${txSig}`,
        );
      }
      signatures.push(txSig);
    }
    return signatures;
  }

  async cancelUserOrders(params: { userId: string; userAddress: string; orders: string[] }) {
    const { encryptedKey, user } = await this.userRepository.getUserAccount(params.userId, params.userAddress);
    const walletKeypair = this.solanaUtils.privateKeyToKeypair(await this.kmsService.decryptSecret(encryptedKey));
    return this.cancelLimitOrders(walletKeypair, params.orders);
  }

  async getActiveLimitOrders(params: { userAddress: string }) {
    const response = await fetch(
      `${this.ENDPOINT_APIS_URL.TRIGGER_ORDERS}?user=${params.userAddress}&orderStatus=active`,
    );
    const rawOrders = await response.json();

    // TODO optimize check for native
    return Promise.all(
      rawOrders?.orders.map(async (item: any) => {
        const inMeta =
          item.inputMint === ZERO_SOL_ADDRESS
            ? { symbol: 'SOL' }
            : await this.solanaUtils.getTokenMetadata(item.inputMint);
        const outMeta =
          item.outputMint === ZERO_SOL_ADDRESS
            ? { symbol: 'SOL' }
            : await this.solanaUtils.getTokenMetadata(item.outputMint);
        const inDecimals =
          item.inputMint === ZERO_SOL_ADDRESS ? 9 : await this.solanaUtils.getTokenDecimals(item.inputMint);
        const outDecimals =
          item.outputMint === ZERO_SOL_ADDRESS ? 9 : await this.solanaUtils.getTokenDecimals(item.outputMint);
        const makingAmount = Number(item.makingAmount) / Math.pow(10, inDecimals);
        const takingAmount = Number(item.takingAmount) / Math.pow(10, outDecimals);
        // const createdDate = new Date(item.createdAt * 1000);
        const createdAtStr = item.createdAt.replace(/\.\d+Z$/, ' UTC');
        return {
          inputToken: inMeta.symbol,
          outputToken: outMeta.symbol,
          makingAmount: Number(makingAmount.toFixed(5)),
          takingAmount: Number(takingAmount.toFixed(5)),
          createdAt: createdAtStr,
          orderPubkey: item.userPubkey,
        };
      }),
    );
  }

  async getAllLimitOrderHistory(params: { userAddress: string }) {
    let page = 1;
    let hasMoreData = true;
    const allOrders: any[] = [];
    while (hasMoreData) {
      const response = await fetch(
        `${this.ENDPOINT_APIS_URL.TRIGGER_ORDERS}?user=${params.userAddress}&orderStatus=history&page=${page}`,
      );
      const data: {
        orders: any[];
        hasMoreData: boolean;
        page: number;
      } = await response.json();
      allOrders.push(...data.orders);
      hasMoreData = data.hasMoreData;
      page++;
    }
    return allOrders;
  }

  async getPrice(mintAddress: string): Promise<number> {
    const url = `${this.ENDPOINT_APIS_URL.PRICE}?ids=${mintAddress}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch price. HTTP error: ${response.status}`);
    }
    const data = await response.json();
    if (!data.data || !data.data[mintAddress] || !data.data[mintAddress].price) {
      throw new Error(`Price data not found for mint: ${mintAddress}`);
    }
    return parseFloat(data.data[mintAddress].price);
  }
}
