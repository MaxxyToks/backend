import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  ParsedAccountData,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import { FeeService, Ops } from "modules/fee/fee.service";
import { SettingsService } from "modules/settings/settings.service";
import { TokenMetadataDto } from "modules/swap-orders/dto/order.dto";
import { ChainNames } from "./constants";

@Injectable()
export class SolanaUtils implements OnModuleInit {
  private readonly logger = new Logger(SolanaUtils.name);
  private connection: Connection;

  private HELIUM_RPC_URL: string;

  public WRAPPED_SOL_MINT = new PublicKey(
    "So11111111111111111111111111111111111111112",
  );

  // private allPoolKeysJson: LiquidityPoolJsonInfo[] = [];

  constructor(
    private readonly settingsService: SettingsService,
    @Optional()
    @Inject(forwardRef(() => FeeService))
    private readonly feeService?: FeeService,
  ) {
    this.HELIUM_RPC_URL = settingsService.getSettings().solana.rpc;
  }

  public async onModuleInit(): Promise<void> {
    this.connection = new Connection(this.HELIUM_RPC_URL, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 120_000,
    });

    this.logger.log("Solana connection initialized (Helium RPC)");
  }

  public async getUserTokenAddress(
    userPublicKey: String,
    symbol: string,
  ): Promise<string> {
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      new PublicKey(userPublicKey),
      {
        programId: TOKEN_PROGRAM_ID,
      },
    );
    for (const tokenAccountInfo of tokenAccounts.value) {
      const metadata = await this.getTokenMetadata(
        tokenAccountInfo.account.data.parsed.info.mint,
      );
      if (metadata.symbol === symbol) {
        return tokenAccountInfo.account.data.parsed.info.mint;
      }
    }
    return "";
  }

  public async generateAccount(): Promise<{
    privateKey: string;
    address: string;
  }> {
    const keypair = Keypair.generate();
    return {
      privateKey: Buffer.from(keypair.secretKey).toString("hex"),
      address: keypair.publicKey.toBase58(),
    };
  }

  public async requestAirdrop(
    publicKey: string,
    solAmount: number,
  ): Promise<string> {
    const signature = await this.connection.requestAirdrop(
      new PublicKey(publicKey),
      solAmount * LAMPORTS_PER_SOL,
    );
    await this.connection.confirmTransaction(signature);
    this.logger.log(`Airdropped ${solAmount} SOL to ${publicKey}`);
    return signature;
  }

  public async sendNative(
    fromKeypair: Keypair,
    toPublicKey: string,
    solAmount: number,
    taxable: boolean,
  ): Promise<TransactionSignature> {
    const toPublicKeyObj = new PublicKey(toPublicKey);
    const balance =
      (await this.connection.getBalance(fromKeypair.publicKey)) /
      LAMPORTS_PER_SOL;
    if (balance < solAmount) {
      throw new Error("Insufficient balance");
    }

    if (taxable) {
      solAmount = parseFloat(
        await this.feeService!.payFee(
          ChainNames.SOLANA,
          solAmount.toString(),
          "0x",
          true,
          fromKeypair,
          Ops.TRANSFER,
        ),
      );
    }
    const transferIx = SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKeyObj,
      lamports: Math.floor(solAmount * LAMPORTS_PER_SOL),
    });

    const transaction = new Transaction().add(transferIx);

    const latestBlockHash =
      await this.connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = latestBlockHash.blockhash;
    transaction.lastValidBlockHeight = latestBlockHash.lastValidBlockHeight;
    transaction.feePayer = fromKeypair.publicKey;

    try {
      const signature = await this.connection.sendTransaction(
        transaction,
        [fromKeypair],
        {
          skipPreflight: false,
        },
      );

      await this.connection.confirmTransaction(
        {
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature,
        },
        "confirmed",
      );

      this.logger.log(
        `Sent ${solAmount} SOL from ${fromKeypair.publicKey.toBase58()} to ${toPublicKey}`,
      );
      return signature;
    } catch (error) {
      this.logger.error(`Transaction failed: ${error}`);
      throw new Error(
        "Transaction was not confirmed within the extended timeout.",
      );
    }
  }

  public async sendSPL(
    fromKeypair: Keypair,
    recipientAddress: string,
    tokenMintAddress: string,
    amount: number,
    taxable: boolean,
  ): Promise<string> {
    const recipientPubkey = new PublicKey(recipientAddress);
    const tokenMintPubkey = new PublicKey(tokenMintAddress);

    const decimals = await this.getTokenDecimals(tokenMintAddress);
    const senderTokenAddress = await getAssociatedTokenAddress(
      tokenMintPubkey,
      fromKeypair.publicKey,
    );
    const recipientTokenAddress = await getAssociatedTokenAddress(
      tokenMintPubkey,
      recipientPubkey,
    );

    const senderBalance = parseFloat(
      await this.getBalanceSPL(
        fromKeypair.publicKey.toBase58(),
        tokenMintAddress,
      ),
    );
    if (senderBalance < amount) {
      throw new Error("Insufficient SPL token balance");
    }

    if (taxable) {
      amount = parseFloat(
        await this.feeService!.payFee(
          ChainNames.SOLANA,
          amount.toString(),
          tokenMintAddress,
          false,
          fromKeypair,
          Ops.TRANSFER,
        ),
      );
    }

    const transaction = new Transaction();

    const recipientAccount = await this.connection.getAccountInfo(
      recipientTokenAddress,
    );
    if (!recipientAccount) {
      const createATAIx = createAssociatedTokenAccountInstruction(
        fromKeypair.publicKey,
        recipientTokenAddress,
        recipientPubkey,
        tokenMintPubkey,
      );
      transaction.add(createATAIx);
    }

    try {
      const microLamports = Math.round(
        await this.estimateNetworkPrioritizationFee(this.HELIUM_RPC_URL),
      );
      if (microLamports > 0) {
        const feeIx = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports,
        });
        transaction.add(feeIx);
      }
    } catch (error) {
      this.logger.error("Failed to estimate prioritization fee:", error);
    }
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }),
    );

    const transferInstruction = createTransferInstruction(
      senderTokenAddress,
      recipientTokenAddress,
      fromKeypair.publicKey,
      amount * Math.pow(10, decimals),
    );
    transaction.add(transferInstruction);

    const latestBlockhash =
      await this.connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
    transaction.feePayer = fromKeypair.publicKey;

    transaction.sign(fromKeypair);

    try {
      const rawTransaction = transaction.serialize();
      const signature = await this.connection.sendRawTransaction(
        rawTransaction,
        {
          skipPreflight: false,
        },
      );

      await this.connection.confirmTransaction(
        {
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          signature,
        },
        "confirmed",
      );

      this.logger.log(
        `Successfully transferred ${amount} tokens from ${fromKeypair.publicKey.toBase58()} to ${recipientAddress}`,
      );

      return signature;
    } catch (error) {
      this.logger.error("Transaction failed:", error);
      throw error;
    }
  }

  public async normalizeSolanaAddressOrSymbol(
    token: string,
    chainName: ChainNames = ChainNames.SOLANA,
    userAddress?: string,
  ): Promise<string> {
    if (token === "SOL") {
      return this.WRAPPED_SOL_MINT.toBase58();
    }
    if (token.startsWith("0x") || token.length === 44 || token.length === 43) {
      return token;
    }

    return this.getTokenAddressBySymbol(token);
  }

  public async estimateNetworkPrioritizationFee(url: string): Promise<number> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getPriorityFeeEstimate",
        params: [
          {
            accountKeys: ["JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"],
            options: {
              includeAllPriorityFeeLevels: true,
            },
          },
        ],
      }),
    });
    const data = await response.json();
    return data?.result?.priorityFeeLevels?.high || 0;
  }

  public async getTimestamp(): Promise<number> {
    const slot = await this.connection.getSlot();
    const blockTime = await this.connection.getBlockTime(slot);
    if (!blockTime) {
      throw new Error("Block time not available");
    }
    return blockTime;
  }

  public async getBlockNumber(): Promise<number> {
    const slot = await this.connection.getSlot();
    return slot;
  }

  public privateKeyToAddress(privateKey: string): string {
    const keypair = Keypair.fromSecretKey(Buffer.from(privateKey, "hex"));
    return keypair.publicKey.toBase58();
  }

  public privateKeyToKeypair(privateKey: string): Keypair {
    return Keypair.fromSecretKey(Buffer.from(privateKey, "hex"));
  }

  public async getBalance(publicKey: string): Promise<string> {
    const balance = await this.connection.getBalance(new PublicKey(publicKey));
    return (balance / LAMPORTS_PER_SOL).toString();
  }

  public async getBalanceSPL(
    publicKey: string,
    tokenMintAddress: string,
  ): Promise<string> {
    const tokenMintPubkey = new PublicKey(tokenMintAddress);
    const ownerPublicKey = new PublicKey(publicKey);

    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      ownerPublicKey,
      { mint: tokenMintPubkey },
    );

    if (tokenAccounts.value.length === 0) {
      console.error("No token account found for this mint.");
      return "0";
    }

    const tokenAccountPubkey = tokenAccounts.value[0].pubkey;
    const decimals = await this.getTokenDecimals(tokenMintAddress);

    const tokenBalance =
      await this.connection.getTokenAccountBalance(tokenAccountPubkey);

    return String(
      parseFloat(tokenBalance.value.amount) / Math.pow(10, decimals),
    );
  }

  public async getTokenDecimals(tokenMintAddress: string): Promise<number> {
    const tokenMintInfo = await this.connection.getParsedAccountInfo(
      new PublicKey(tokenMintAddress),
    );
    if (!tokenMintInfo.value) {
      throw new Error(
        `Unable to fetch token info for mint address ${tokenMintAddress}`,
      );
    }

    const tokenData = tokenMintInfo.value.data;
    if ("parsed" in tokenData) {
      const parsedData = tokenData as ParsedAccountData;
      return parsedData.parsed.info.decimals;
    }
    return 0;
  }

  /**
   * Fetch transaction details
   */
  public async getTransactionDetails(signature: string): Promise<any> {
    const transactionDetails = await this.connection.getTransaction(signature, {
      commitment: "confirmed",
    });
    if (!transactionDetails) {
      throw new Error(`Transaction with signature ${signature} not found`);
    }
    return transactionDetails;
  }

  public async getTokenMetadata(
    mintAddress: string,
  ): Promise<TokenMetadataDto> {
    const payload = {
      jsonrpc: "2.0",
      id: "text",
      method: "getAsset",
      params: { id: mintAddress },
    };

    try {
      const response = await fetch(this.HELIUM_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.result && data.result.content && data.result.content.metadata) {
        const metadata = data.result.content.metadata;
        const tokenMetadata: TokenMetadataDto = {
          address: mintAddress,
          name: metadata.name,
          symbol: metadata.symbol,
        };
        return tokenMetadata;
      } else {
        throw new Error("Metadata not found in the response.");
      }
    } catch (error) {
      this.logger.error(
        `Error fetching token metadata for mint address ${mintAddress}`,
        error,
      );
      throw error;
    }
  }

  public async getTokenAddressBySymbol(
    tokenSymbol: string,
    userAddress?: string,
  ): Promise<string> {
    if (tokenSymbol === "SOL") {
      return this.WRAPPED_SOL_MINT.toBase58();
    }
    if (userAddress) {
      const tokenAddress = await this.getUserTokenAddress(
        userAddress,
        tokenSymbol,
      );
      if (tokenAddress) {
        return tokenAddress;
      }
    }
    const response = await fetch(
      "https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json",
    );
    const data = await response.json();

    if (!data || !data.tokens) {
      throw new Error("Failed to fetch token list.");
    }

    const token = data.tokens.find(
      (t: { symbol: string; address: string }) => t.symbol === tokenSymbol,
    );

    if (!token) {
      throw new Error(
        `Cannot find token symbol or address for "${tokenSymbol}"`,
      );
    }
    return token.address;
  }

  public isSolanaWalletAddress(address: string): boolean {
    return !address.startsWith("0x");
  }

  public async resolveTokenAddress(tokenSymbolOrAddress: string): Promise<{
    address: string;
    isNative: boolean;
  }> {
    if (tokenSymbolOrAddress.trim().startsWith("0x")) {
      return { address: tokenSymbolOrAddress, isNative: false };
    }

    if (
      tokenSymbolOrAddress.trim().toLowerCase() === "sol" ||
      tokenSymbolOrAddress.trim().toLowerCase() === "native" ||
      tokenSymbolOrAddress.trim().toLowerCase() === "solana"
    ) {
      return { address: this.WRAPPED_SOL_MINT.toBase58(), isNative: true };
    }

    const tokenAddress =
      await this.getTokenAddressBySymbol(tokenSymbolOrAddress);

    if (!tokenAddress) {
      throw new Error(
        `No address found for token symbol: ${tokenSymbolOrAddress}`,
      );
    }

    this.logger.log(`${tokenSymbolOrAddress} has address ${tokenAddress}`);

    return { address: tokenAddress, isNative: false };
  }

  /**
   * Return explorer URL (MAINNET).
   * If you truly are on devnet, switch ?cluster=devnet
   */
  public async getExplorerUrlForTx(signature: string): Promise<string> {
    return `https://explorer.solana.com/tx/${signature}?cluster=mainnet`;
  }

  public async getExplorerUrlForAddress(publicKey: string): Promise<string> {
    return `https://explorer.solana.com/address/${publicKey}?cluster=mainnet`;
  }

  // DEPRECATED
  // private async getOwnerTokenAccounts(owner: PublicKey): Promise<any[]> {
  //   const resp = await this.connection.getTokenAccountsByOwner(owner, {
  //     programId: TOKEN_PROGRAM_ID,
  //   });

  //   return resp.value.map(({ pubkey, account }) => {
  //     const decoded = SPL_ACCOUNT_LAYOUT.decode(account.data);
  //     return {
  //       pubkey,
  //       programId: account.owner,
  //       accountInfo: {
  //         ...decoded,
  //         amount: new BN(decoded.amount, 10, 'le'),
  //       },
  //     };
  //   });
  // }

  // private async _getProgramAccounts(baseMint: string, quoteMint: string): Promise<GetProgramAccountsResponse> {
  //   const layout = LIQUIDITY_STATE_LAYOUT_V4;
  //   return this.connection.getProgramAccounts(SolanaUtils.RAYDIUM_V4_PROGRAM_ID, {
  //     filters: [
  //       { dataSize: layout.span },
  //       {
  //         memcmp: {
  //           offset: layout.offsetOf('baseMint'),
  //           bytes: new PublicKey(baseMint).toBase58(),
  //         },
  //       },
  //       {
  //         memcmp: {
  //           offset: layout.offsetOf('quoteMint'),
  //           bytes: new PublicKey(quoteMint).toBase58(),
  //         },
  //       },
  //     ],
  //   });
  // }

  // private async getProgramAccounts(baseMint: string, quoteMint: string): Promise<GetProgramAccountsResponse> {
  //   const [res1, res2] = await Promise.all([
  //     this._getProgramAccounts(baseMint, quoteMint),
  //     this._getProgramAccounts(quoteMint, baseMint),
  //   ]);
  //   return res1.length > 0 ? res1 : res2;
  // }

  // public async findRaydiumPoolInfoOnChain(baseMint: string, quoteMint: string): Promise<LiquidityPoolKeys | null> {
  //   const layout = LIQUIDITY_STATE_LAYOUT_V4;
  //   const programData = await this.getProgramAccounts(baseMint, quoteMint);
  //   if (!programData.length) return null;
  //   const poolDecoded = programData.map((info) => ({
  //     id: new PublicKey(info.pubkey),
  //     version: 4,
  //     programId: SolanaUtils.RAYDIUM_V4_PROGRAM_ID,
  //     ...layout.decode(info.account.data),
  //   }))[0];

  //   if (!poolDecoded) return null;
  //   const marketRaw = await this.connection.getAccountInfo(poolDecoded.marketId);
  //   if (!marketRaw) return null;
  //   const marketDecoded = {
  //     programId: marketRaw.owner,
  //     ...MARKET_STATE_LAYOUT_V3.decode(marketRaw.data),
  //   };

  //   const poolAuthority = Liquidity.getAssociatedAuthority({
  //     programId: SolanaUtils.RAYDIUM_V4_PROGRAM_ID,
  //   }).publicKey;

  //   const marketProgramId = marketDecoded.programId;

  //   const marketAuthority = Market.getAssociatedAuthority({
  //     programId: marketProgramId,
  //     marketId: marketDecoded.ownAddress,
  //   }).publicKey;

  //   const poolKeys: LiquidityPoolKeys = {
  //     id: poolDecoded.id,
  //     baseMint: poolDecoded.baseMint,
  //     quoteMint: poolDecoded.quoteMint,
  //     lpMint: poolDecoded.lpMint,
  //     baseDecimals: Number(poolDecoded.baseDecimal),
  //     quoteDecimals: Number(poolDecoded.quoteDecimal),
  //     lpDecimals: Number(poolDecoded.baseDecimal), // or parse carefully
  //     version: 4,
  //     programId: poolDecoded.programId,
  //     openOrders: poolDecoded.openOrders,
  //     targetOrders: poolDecoded.targetOrders,
  //     baseVault: poolDecoded.baseVault,
  //     quoteVault: poolDecoded.quoteVault,
  //     withdrawQueue: poolDecoded.withdrawQueue,
  //     lpVault: poolDecoded.lpVault,
  //     marketVersion: 3,
  //     authority: poolAuthority,
  //     marketProgramId,
  //     marketId: marketDecoded.ownAddress,
  //     marketAuthority,
  //     marketBaseVault: marketDecoded.baseVault,
  //     marketQuoteVault: marketDecoded.quoteVault,
  //     marketBids: marketDecoded.bids,
  //     marketAsks: marketDecoded.asks,
  //     marketEventQueue: marketDecoded.eventQueue,
  //     lookupTableAccount: PublicKey.default,
  //   };
  //   return poolKeys;
  // }

  // private findLocalPoolKeys(mintA: string, mintB: string): LiquidityPoolKeys | null {
  //   if (!this.allPoolKeysJson?.length) {
  //     throw new Error('Raydium pool keys JSON not loaded. Call initRaydiumPoolKeys() first!');
  //   }

  //   const poolData = this.allPoolKeysJson.find(
  //     (i) => (i.baseMint === mintA && i.quoteMint === mintB) || (i.baseMint === mintB && i.quoteMint === mintA),
  //   );
  //   if (!poolData) return null;

  //   return jsonInfo2PoolKeys(poolData) as LiquidityPoolKeys;
  // }

  // public async initRaydiumPoolKeys(liquidityFile: string): Promise<void> {
  //   let liquidityJson: any;
  //   if (liquidityFile.startsWith('http')) {
  //     const resp = await fetch(liquidityFile);
  //     if (!resp.ok) {
  //       this.logger.error(`Failed to fetch Raydium JSON from ${liquidityFile}`);
  //       return;
  //     }
  //     liquidityJson = await resp.json();
  //   } else {
  //     const filePath = path.isAbsolute(liquidityFile) ? liquidityFile : path.join(__dirname, liquidityFile);

  //     if (!fs.existsSync(filePath)) {
  //       this.logger.error(`Local Raydium JSON file not found: ${filePath}`);
  //       return;
  //     }
  //     liquidityJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  //   }

  //   this.allPoolKeysJson = [...(liquidityJson?.official ?? []), ...(liquidityJson?.unOfficial ?? [])];

  //   this.logger.log(`Loaded Raydium pool keys: ${this.allPoolKeysJson.length} total pools found.`);
  // }

  // public async swapRaydiumTokens(
  //   fromKeypair: Keypair,
  //   fromMint: string,
  //   toMint: string,
  //   inputAmount: number,
  //   slippageBps = 50,
  //   useVersionedTx = false,
  //   skipPreflight = false,
  //   tryLocalPool = true,
  // ): Promise<string> {
  //   let poolKeys: LiquidityPoolKeys | null = null;
  //   if (tryLocalPool && this.allPoolKeysJson?.length) {
  //     poolKeys = this.findLocalPoolKeys(fromMint, toMint);
  //   }
  //   if (!poolKeys) {
  //     poolKeys = await this.findRaydiumPoolInfoOnChain(fromMint, toMint);
  //   }
  //   if (!poolKeys) {
  //     throw new Error(`No Raydium pool found for fromMint=${fromMint} toMint=${toMint}`);
  //   }

  //   const poolInfo = await Liquidity.fetchInfo({
  //     connection: this.connection,
  //     poolKeys,
  //   });

  //   const isBaseSideIn = poolKeys.baseMint.toBase58() === fromMint;
  //   const inDecimals = isBaseSideIn ? poolInfo.baseDecimals : poolInfo.quoteDecimals;
  //   const outDecimals = isBaseSideIn ? poolInfo.quoteDecimals : poolInfo.baseDecimals;
  //   const slip = new Percent(slippageBps, 10_000);

  //   const currencyIn = new RaydiumToken(TOKEN_PROGRAM_ID, new PublicKey(fromMint), inDecimals);

  //   const tokenAmountIn = new TokenAmount(currencyIn, inputAmount, false);

  //   const currencyOut = new RaydiumToken(TOKEN_PROGRAM_ID, new PublicKey(toMint), outDecimals);

  //   const { minAmountOut } = Liquidity.computeAmountOut({
  //     poolKeys,
  //     poolInfo,
  //     amountIn: tokenAmountIn,
  //     currencyOut,
  //     slippage: slip,
  //   });

  //   const fromkeypairTokenAccounts = await this.getOwnerTokenAccounts(fromKeypair.publicKey);
  //   const makeTxVersion = useVersionedTx ? 1 : 0;

  //   const swapTx = await Liquidity.makeSwapInstructionSimple({
  //     connection: this.connection,
  //     makeTxVersion,
  //     poolKeys,
  //     fromkeypairKeys: {
  //       tokenAccounts: fromkeypairTokenAccounts,
  //       owner: fromKeypair.publicKey,
  //     },
  //     amountIn: tokenAmountIn,
  //     amountOut: minAmountOut,
  //     fixedSide: 'in',
  //     config: {
  //       bypassAssociatedCheck: false,
  //     },
  //     computeBudgetConfig: {
  //       microLamports: 300_000,
  //     },
  //   });

  //   const latestBlockhash = await this.connection.getLatestBlockhash('confirmed');
  //   const instructions = swapTx.innerTransactions[0].instructions.filter(Boolean);

  //   let txSignature: string;

  //   if (fromMint === this.WRAPPED_SOL_MINT.toBase58()) {
  //     const balance = await this.getBalance(fromKeypair.publicKey.toBase58());
  //     if (parseFloat(balance) < inputAmount) {
  //       throw new Error('Insufficient balance');
  //     }
  //   } else {
  //     const balanceToken = await this.getBalanceSPL(fromKeypair.publicKey.toBase58(), fromMint);
  //     if (balanceToken < inputAmount) {
  //       throw new Error('Insufficient token balance');
  //     }
  //   }

  //   if (useVersionedTx) {
  //     const messageV0 = new TransactionMessage({
  //       payerKey: fromKeypair.publicKey,
  //       recentBlockhash: latestBlockhash.blockhash,
  //       instructions,
  //     }).compileToV0Message();

  //     const versionedTx = new VersionedTransaction(messageV0);
  //     versionedTx.sign([fromKeypair]);

  //     txSignature = await this.connection.sendTransaction(versionedTx, {
  //       skipPreflight,
  //     });
  //   } else {
  //     const legacyTx = new Transaction({
  //       blockhash: latestBlockhash.blockhash,
  //       lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  //       feePayer: fromKeypair.publicKey,
  //     });
  //     legacyTx.add(...instructions);
  //     legacyTx.sign(fromKeypair);

  //     txSignature = await this.connection.sendTransaction(legacyTx, [fromKeypair], {
  //       skipPreflight,
  //     });
  //   }

  //   await this.connection.confirmTransaction(
  //     {
  //       blockhash: latestBlockhash.blockhash,
  //       lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  //       signature: txSignature,
  //     },
  //     'confirmed',
  //   );

  //   this.logger.log(`Raydium swap successful! Tx Signature: ${txSignature}`);
  //   return txSignature;
  // }
}
