import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import axios from "axios";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";

import {
  ChainNames,
  ContractType,
  getChainIdByName,
  getContractAbi,
  ZERO_ADDRESS,
} from "modules/blockchain/constants";
import { SpokePoolAbi } from "modules/blockchain/contract-types";
import { ERC20Abi } from "modules/blockchain/contract-types/ERC20Abi";
import { BasicBlockchainResponseDto } from "modules/blockchain/dto/response.dto";
import { EvmUtils } from "modules/blockchain/evm.utils";
import { AcrossDepositRepository } from "modules/database/repository/across-deposit.repository";
import {
  Erc20Repository,
  TokenForChainName,
} from "modules/database/repository/erc20.repository";
import { UserRepository } from "modules/database/repository/user.repository";
import { KmsService } from "modules/kms/kms.service";
import { RedisService } from "modules/redis/redis.service";
import { SettingsService } from "modules/settings/settings.service";
import { TokensService } from "modules/tokens/tokens.service";

import { FeeService, Ops } from "modules/fee/fee.service";
import { getAcrossChainConfig } from "./constants";
import {
  ChainNameAndSymbolParam,
  ChainNameParam,
  HashParam,
  RunBridgeParams,
} from "./dto/params";
import { AcrossRoute, AcrossSuggestedFeesResponse } from "./types";
interface AcrossError extends Error {
  response?: { data?: { message: string } };
}

@Injectable()
export class AcrossService implements OnModuleInit {
  private readonly logger = new Logger(AcrossService.name);
  private readonly apiUrl: string;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly evmUtils: EvmUtils,
    private readonly acrossDepositRepository: AcrossDepositRepository,
    private readonly userRepository: UserRepository,
    private readonly kmsService: KmsService,
    private readonly redisService: RedisService,
    private readonly erc20Repository: Erc20Repository,
    private readonly tokensService: TokensService,
    private readonly feeService: FeeService,
  ) {
    this.apiUrl = this.settingsService.getSettings().across.apiUrl;
  }
  async onModuleInit(): Promise<void> {}

  // =============== Gpt helpers ===============
  // ToolMethod
  public async getTokensForChainNameAndSymbol(
    args: ChainNameAndSymbolParam,
  ): Promise<TokenForChainName[]> {
    return this.erc20Repository.getTokenForChainNameAndSymbol(args);
  }

  // ToolMethod
  public async getTokensForChain(
    args: ChainNameParam,
  ): Promise<TokenForChainName[]> {
    return this.erc20Repository.getTokensForChain(args);
  }

  private async validateTokenAddresses(
    originalChainName: string,
    destinationChainName: string,
    tokenSymbolFrom: string,
    tokenSymbolTo?: string,
  ): Promise<{ fromToken: string; toToken: string } | { error: string }> {
    const fromTokenResult = await this.tokensService.fetchTokenAddressByTicker({
      chainName: originalChainName as ChainNames,
      symbol: tokenSymbolFrom,
    });

    if (fromTokenResult.error || !fromTokenResult.address) {
      return { error: `Error fetching source token: ${fromTokenResult.error}` };
    }

    const toTokenResult = await this.tokensService.fetchTokenAddressByTicker({
      chainName: destinationChainName as ChainNames,
      symbol: tokenSymbolTo ?? tokenSymbolFrom,
    });

    if (toTokenResult.error || !toTokenResult.address) {
      return {
        error: `Error fetching destination token: ${toTokenResult.error}`,
      };
    }

    return {
      fromToken: fromTokenResult.address,
      toToken: toTokenResult.address,
    };
  }

  public async runBridge(
    args: RunBridgeParams,
  ): Promise<BasicBlockchainResponseDto> {
    const {
      userId,
      userAddress,
      originalChainName,
      destinationChainName,

      tokenSymbolFrom,
      tokenSymbolTo,
      amount,
    } = args;

    if (
      !userId ||
      !userAddress ||
      !originalChainName ||
      !destinationChainName ||
      !tokenSymbolFrom ||
      !amount
    ) {
      throw new Error(
        `Invalid arguments in runBridge! Required:
         { userId, userAddress, originalChainName, destinationChainName, tokenSymbolFrom, amount }`,
      );
    }

    const validationResult = await this.validateTokenAddresses(
      originalChainName,
      destinationChainName,
      tokenSymbolFrom,
      tokenSymbolTo,
    );
    if ("error" in validationResult) {
      throw new Error(validationResult.error);
    }

    const { fromToken: validatedFromToken, toToken: validatedToToken } =
      validationResult;
    const isInputNative = validatedFromToken === ZERO_ADDRESS;
    const isOutputNative = validatedToToken === ZERO_ADDRESS;

    const realInputToken = isInputNative
      ? getAcrossChainConfig(originalChainName).wethAddress
      : validatedFromToken;
    const realOutputToken = isOutputNative
      ? getAcrossChainConfig(destinationChainName).wethAddress
      : validatedToToken;

    const originalChainId = getChainIdByName(originalChainName);
    const destinationChainId = getChainIdByName(destinationChainName);

    let decimals = 18;
    if (!isInputNative) {
      decimals = Number(
        await this.evmUtils.getErc20Decimals(originalChainName, realInputToken),
      );
    }

    const { encryptedKey } = await this.userRepository.getUserAccount(
      userId,
      userAddress,
    );
    const privateKey = await this.kmsService.decryptSecret(encryptedKey);
    const signer = this.evmUtils.privateKeyToSigner(
      originalChainName,
      privateKey,
    );

    let amountAfterFee = await this.feeService.payFee(
      originalChainName,
      amount,
      realInputToken,
      isInputNative,
      signer,
      Ops.BRIDGE,
    );
    const amountInWei = this.evmUtils
      .toWei(amountAfterFee, decimals)
      .toString();

    const suggestedFees = await this.getSuggestedFees(
      realInputToken,
      originalChainId,
      destinationChainId,
      amountInWei,
    );
    if (suggestedFees.isAmountTooLow) {
      throw new Error("Amount is too low to bridge");
    }

    if (isInputNative) {
      const nativeBalance = await this.evmUtils.getBalanceNative(
        originalChainName,
        userAddress,
      );
      if (BigNumber(nativeBalance).lt(BigNumber(amountInWei))) {
        throw new Error("Insufficient native balance");
      }
    } else {
      const tokenBalance = await this.evmUtils.getBalanceERC20(
        originalChainName,
        signer.address,
        realInputToken,
      );
      if (BigNumber(tokenBalance).lt(BigNumber(amountInWei))) {
        throw new Error("Insufficient ERC20 token balance");
      }
    }

    const txOverrides: ethers.PayableOverrides = {};
    if (isInputNative) {
      txOverrides.value = amountInWei;
    }

    const feeData = await signer.getFeeData();
    let gasPrice = feeData.gasPrice;
    const { maxFeePerGas, maxPriorityFeePerGas, lastBaseFeePerGas } = feeData;

    let finalMaxFeePerGas: ethers.BigNumber | undefined;
    let finalMaxPriorityFeePerGas: ethers.BigNumber | undefined;

    const BUFFER_GWEI = 2;

    if (maxFeePerGas && maxPriorityFeePerGas && lastBaseFeePerGas) {
      finalMaxFeePerGas = lastBaseFeePerGas.mul(2);
      finalMaxPriorityFeePerGas = finalMaxFeePerGas.sub("1");

      this.logger.debug(
        `EIP-1559: baseFee=${ethers.utils.formatUnits(lastBaseFeePerGas, "gwei")} gwei, ` +
          `maxFeePerGas=${ethers.utils.formatUnits(finalMaxFeePerGas, "gwei")} gwei, ` +
          `maxPriorityFeePerGas=${ethers.utils.formatUnits(finalMaxPriorityFeePerGas, "gwei")} gwei`,
      );

      // Estimate how much gas limit can be spent with this gas price
      const userBalance = await signer.getBalance();
      const affordableGasLimit = userBalance.div(
        finalMaxFeePerGas.add(finalMaxPriorityFeePerGas),
      );
      this.logger.debug(
        `Affordable gas limit: ${affordableGasLimit.toString()}`,
      );
    } else if (gasPrice) {
      gasPrice = this.addGwei(gasPrice, BUFFER_GWEI);
      txOverrides.gasPrice = gasPrice;

      this.logger.debug(
        `Legacy: gasPrice=${ethers.utils.formatUnits(gasPrice, "gwei")} gwei (with +${BUFFER_GWEI} buffer)`,
      );
    } else {
      throw new Error("No valid gas configuration returned by provider");
    }

    if (!isInputNative) {
      await this.approveTransfer({
        senderAddress: userAddress,
        receiverAddress: suggestedFees.spokePoolAddress,
        tokenContractAddress: validatedFromToken,
        signer,
        amountInWei,
        maxFeePerGas: finalMaxFeePerGas,
        maxPriorityFeePerGas: finalMaxPriorityFeePerGas,
      });
    }

    const spokePoolContract = this.evmUtils.getContract<SpokePoolAbi>(
      originalChainName,
      suggestedFees.spokePoolAddress,
      getContractAbi(ContractType.SpokePool),
      signer,
    );

    const outputAmountInWei = BigNumber(amountInWei)
      .minus(BigNumber(suggestedFees.totalRelayFee.total))
      .toString();

    const fillDeadline = Math.round(Date.now() / 1000) + 18000;
    const message = "0x";

    try {
      const depositCall = async (
        overrides: ethers.Overrides,
      ): Promise<ethers.BigNumber> => {
        return spokePoolContract.estimateGas.depositV3(
          userAddress,
          userAddress,
          isInputNative ? realInputToken : validatedFromToken,
          isOutputNative ? realOutputToken : validatedToToken,
          amountInWei,
          outputAmountInWei,
          destinationChainId,
          suggestedFees.exclusiveRelayer,
          suggestedFees.timestamp,
          fillDeadline,
          suggestedFees.exclusivityDeadline,
          message,
          overrides,
        );
      };

      const depositOverrides = await this.getOverrides(
        depositCall,
        finalMaxFeePerGas,
        finalMaxPriorityFeePerGas,
        txOverrides,
        signer,
      );

      const tx = await spokePoolContract.depositV3(
        userAddress,
        userAddress,
        isInputNative ? realInputToken : validatedFromToken,
        isOutputNative ? realOutputToken : validatedToToken,
        amountInWei,
        outputAmountInWei,
        destinationChainId,
        suggestedFees.exclusiveRelayer,
        suggestedFees.timestamp,
        fillDeadline,
        suggestedFees.exclusivityDeadline,
        message,
        depositOverrides,
      );

      await tx.wait();
      const depositHash = tx.hash.toLowerCase();

      await this.acrossDepositRepository.createAcrossDeposit(
        suggestedFees.spokePoolAddress,
        userAddress,
        userAddress,
        validatedFromToken,
        ZERO_ADDRESS,
        amount,
        originalChainName,
        destinationChainName,
        depositHash,
      );

      return {
        transactionHash: depositHash,
        explorerUrl: this.evmUtils.explorerUrlForTx(
          originalChainName,
          depositHash,
        ),
      };
    } catch (err) {
      this.logger.error("Error in deposit transaction");
      this.logger.error(err);
      throw new Error("Deposit transaction failed. Check logs.");
    }
  }

  private async approveTransfer(params: {
    senderAddress: string;
    receiverAddress: string;
    tokenContractAddress: string;
    signer: ethers.Signer;
    amountInWei: string;
    maxFeePerGas?: ethers.BigNumber;
    maxPriorityFeePerGas?: ethers.BigNumber;
  }): Promise<void> {
    const {
      senderAddress,
      receiverAddress,
      tokenContractAddress,
      signer,
      amountInWei,
    } = params;

    this.logger.log(
      `Approve transfer if needed, token=${tokenContractAddress}, spender=${receiverAddress}`,
    );

    const erc20Contract = new ethers.Contract(
      tokenContractAddress,
      getContractAbi(ContractType.ERC20),
      signer,
    ) as ERC20Abi;

    const allowance = await erc20Contract.allowance(
      senderAddress,
      receiverAddress,
    );
    if (allowance.gte(amountInWei)) {
      this.logger.log(
        `Already approved enough: currentAllowance=${allowance.toString()}`,
      );
      return;
    }

    const approveOverrides: ethers.Overrides = {};
    if (params.maxFeePerGas && params.maxPriorityFeePerGas) {
      approveOverrides.maxFeePerGas = params.maxFeePerGas;
      approveOverrides.maxPriorityFeePerGas = params.maxPriorityFeePerGas;
    }

    try {
      const estimateFn = async (
        ov: ethers.Overrides,
      ): Promise<ethers.BigNumber> => {
        return erc20Contract.estimateGas.approve(
          receiverAddress,
          amountInWei,
          ov,
        );
      };
      const safeOverrides = await this.getOverrides(
        estimateFn,
        params.maxFeePerGas,
        params.maxPriorityFeePerGas,
        approveOverrides,
        signer,
      );

      const approveTx = await erc20Contract.approve(
        receiverAddress,
        amountInWei,
        safeOverrides,
      );
      await approveTx.wait();
      this.logger.log(`Approve tx: ${approveTx.hash}`);
    } catch (err) {
      this.logger.error("Error approving transfer");
      this.logger.error(err);
      throw err;
    }
  }

  private async getOverrides(
    estimateCall: (overrides: ethers.Overrides) => Promise<ethers.BigNumber>,
    maxFeePerGas: ethers.BigNumber | undefined,
    maxPriorityFeePerGas: ethers.BigNumber | undefined,
    baseOverrides: ethers.Overrides,
    signer: ethers.Signer,
  ): Promise<ethers.Overrides> {
    const finalOverrides: ethers.Overrides = { ...baseOverrides };

    if (maxFeePerGas) finalOverrides.maxFeePerGas = maxFeePerGas;
    if (maxPriorityFeePerGas)
      finalOverrides.maxPriorityFeePerGas = maxPriorityFeePerGas;

    let estimatedGas: ethers.BigNumber;
    try {
      estimatedGas = await estimateCall(finalOverrides);
    } catch (err) {
      throw new Error(`Gas estimation failed: ${err}`);
    }

    const paddedGasLimit = estimatedGas.mul(120).div(100);
    finalOverrides.gasLimit = paddedGasLimit;

    const userBalance = await signer.getBalance();
    let worstCaseCost: ethers.BigNumber;
    if (finalOverrides.maxFeePerGas) {
      const maxFeePerGas = await Promise.resolve(finalOverrides.maxFeePerGas);
      worstCaseCost = paddedGasLimit.mul(maxFeePerGas);
    } else if (finalOverrides.gasPrice) {
      const gasPrice = await Promise.resolve(finalOverrides.gasPrice);
      worstCaseCost = paddedGasLimit.mul(gasPrice);
    } else {
      worstCaseCost = ethers.BigNumber.from(0);
    }
    if (userBalance.lt(worstCaseCost)) {
      throw new Error(
        `User's wallet balance (${userBalance.toString()}) is too low for worst-case gas cost (${worstCaseCost.toString()})`,
      );
    }

    this.logger.log(
      `Estimated Gas: ${estimatedGas.toString()}, padded => ${paddedGasLimit.toString()}. 
       Worst-case cost => ${worstCaseCost.toString()}, userBalance => ${userBalance.toString()}`,
    );

    return finalOverrides;
  }

  public addGwei(
    bigNum: ethers.BigNumber,
    gweiToAdd: number,
  ): ethers.BigNumber {
    return bigNum.add(ethers.utils.parseUnits(gweiToAdd.toString(), "gwei"));
  }

  public async checkIfBridgeSuccessByHash(args: HashParam): Promise<string> {
    const { hash, chainName } = args;
    const chainId = getChainIdByName(chainName);

    // Find tx and get depositID from it
    const txReceipt = await this.evmUtils.getTransactionReceipt(
      args.chainName,
      hash,
    );

    if (!txReceipt) {
      throw new Error("Transaction not found");
    }

    const logWith4Topics = txReceipt.logs.find(
      (log) => log.topics.length === 4,
    );
    if (!logWith4Topics) {
      throw new Error("No logs with 4 topics found");
    }
    const topic3 = logWith4Topics.topics[2];
    // Convert hex to number
    const depositId = Number(topic3);

    // Check deposit status by deposit id
    const depositStatus = await this.checkDepositStatus(chainId, depositId);
    return JSON.stringify(
      {
        fillTx: depositStatus.fillTx,
        status: depositStatus.status,
        isSuccessful: depositStatus.status === "filled",
      },
      null,
      2,
    );
  }

  public async getRoutes(): Promise<AcrossRoute[]> {
    // Get cached routes
    const routes = await this.redisService.get<AcrossRoute[]>("across:routes");
    if (routes) {
      return routes;
    }

    const response = await axios.get(`${this.apiUrl}/available-routes`);
    const lowercasedRoutes = response.data.map((route) => ({
      ...route,
      originToken: route.originToken.toLowerCase(),
      destinationToken: route.destinationToken.toLowerCase(),
    }));
    await this.redisService.set(
      "across:routes",
      lowercasedRoutes,
      60 * 60 * 24,
    );
    return lowercasedRoutes;
  }

  public async findMyRoute(
    originalToken: string,
    destinationToken: string,
  ): Promise<AcrossRoute | null> {
    const routes = await this.getRoutes();
    return (
      routes.find(
        (route) =>
          route.originToken.toLowerCase() === originalToken.toLowerCase() &&
          route.destinationToken.toLowerCase() ===
            destinationToken.toLowerCase(),
      ) ?? null
    );
  }

  private async checkDepositStatus(
    originChainId: number,
    depositId: number,
  ): Promise<{
    status: string;
    fillTx: string;
  }> {
    const response = await axios.get(`${this.apiUrl}/deposit/status`, {
      params: {
        originChainId,
        depositId,
      },
    });
    return response.data;
  }

  public async getSuggestedFees(
    token: string,
    originChainId: number,
    destinationChainId: number,
    amount: string,
  ): Promise<AcrossSuggestedFeesResponse> {
    try {
      const url = `${this.apiUrl}/suggested-fees`;
      const params = {
        token,
        originChainId,
        destinationChainId,
        amount,
      };
      this.logger.debug("suggested fees params", params);
      this.logger.debug(`URL: ${url}, params: ${JSON.stringify(params)}`);
      const response = await axios.get(url, {
        params,
      });
      return response.data;
    } catch (error) {
      const err = error as AcrossError;
      const message =
        err.response?.data?.message ?? err.message ?? "Unknown error";
      throw new Error(message);
    }
  }

  private async getDepositEventInterface(): Promise<ethers.utils.Interface> {
    return new ethers.utils.Interface([
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: "address",
            name: "inputToken",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "outputToken",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "inputAmount",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "outputAmount",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "destinationChainId",
            type: "uint256",
          },
          {
            indexed: true,
            internalType: "uint32",
            name: "depositId",
            type: "uint32",
          },
          {
            indexed: false,
            internalType: "uint32",
            name: "quoteTimestamp",
            type: "uint32",
          },
          {
            indexed: false,
            internalType: "uint32",
            name: "fillDeadline",
            type: "uint32",
          },
          {
            indexed: false,
            internalType: "uint32",
            name: "exclusivityDeadline",
            type: "uint32",
          },
          {
            indexed: true,
            internalType: "address",
            name: "depositor",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "recipient",
            type: "address",
          },
          {
            indexed: false,
            internalType: "address",
            name: "exclusiveRelayer",
            type: "address",
          },
          {
            indexed: false,
            internalType: "bytes",
            name: "message",
            type: "bytes",
          },
        ],
        name: "V3FundsDeposited",
        type: "event",
      },
    ]);
  }
}
