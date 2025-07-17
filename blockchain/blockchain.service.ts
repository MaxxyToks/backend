import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Keypair } from '@solana/web3.js';
import { Wallet, ethers, utils } from 'ethers';

import { AccountRepository } from 'modules/database/repository/account.repository';
import { UserRepository } from 'modules/database/repository/user.repository';
import { KmsService } from 'modules/kms/kms.service';
import { TokensService } from 'modules/tokens/tokens.service';

import { SwapOrder } from 'modules/database/entities/swap-order.entity';
import { DcaService } from 'modules/dca/dca.service';
import { CloseDcaDto, GetDcaDto, SubscribeToDcaDto } from 'modules/dca/dto/dca.dto';
import { HyperSwapService } from 'modules/hyperswap/hyperswap.service';
import { JupiterService } from 'modules/jupiter/jupiter.service';
import { GetLimitOrdersDto, OneinchService } from 'modules/oneinch/oneinch.service';
import { SonicService } from 'modules/sonic/sonic.service';
import { CreateOrderDto } from 'modules/swap-orders/dto/order.dto';
import { SwapOrdersService } from 'modules/swap-orders/swap-orders.service';
import { ChainNames, ContractType, getContractAbi, getContractAbiAndBytecode } from './constants';
import { ERC721Abi } from './contract-types';
import {
  CloseOrderExtDto,
  DeployERC20Params,
  DeployERC721Params,
  ExecuteLimitOrderDto,
  GetBalanceERC20Params,
  GetBalanceNativeParams,
  GetSlippageParams,
  SaveSlippageParams,
  TransferERC20Params,
  TransferNativeParams,
  UnifiedSwapDto
} from './dto/params';
import {
  BasicBlockchainResponseDto,
  OnlyAddressResponseDto,
  TransferResponseDto
} from './dto/response.dto';
import { EvmUtils } from './evm.utils';
import { SolanaUtils } from './solana.utils';

// Service for complex actions on the blockchain
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);

  constructor(
    private readonly evmUtils: EvmUtils,
    private readonly solanaUtils: SolanaUtils,
    private readonly userRepository: UserRepository,
    private readonly accountRepository: AccountRepository,
    private readonly kmsService: KmsService,
    private readonly tokenService: TokensService,
    private readonly oneinchService: OneinchService,
    private readonly jupiterService: JupiterService,
    private readonly hyperSwapService: HyperSwapService,
    private readonly sonicService: SonicService,
    private readonly dcaService: DcaService,
    private readonly swapOrdersService: SwapOrdersService,
  ) { }

  async onModuleInit(): Promise<void> { }

  public async subscribeToDCA(params: SubscribeToDcaDto): Promise<any> {
    switch (params.chainName) {
      case 'solana':
        return this.jupiterService.createDcaSubscription(params);
      default:
        return this.dcaService.createDca(params);
    }
  }

  public async closeDCA(params: CloseDcaDto): Promise<CloseDcaDto> {
    switch (params.chainName) {
      case 'solana':
        await this.jupiterService.closeDcaSubscription(params);
      default:
        await this.dcaService.closeDca(params);
    }
    return params;
  }

  public getDcaSubscriptions(params: GetDcaDto): Promise<any> {
    switch (params.chainName) {
      case 'solana':
        return this.jupiterService.getUserDcaSubscriptions(params);
      default:
        return this.dcaService.getUserOpenSubscriptions(params);
    }
  }

  //TODO: slippage/ min amount out
  public async executeUnifiedSwap(dto: UnifiedSwapDto): Promise<any | { error: string }> {
    switch (dto.chainName) {
      case ChainNames.SONIC:
        return this.sonicService.executeSwap({
          chainName: dto.chainName,
          userId: dto.userId,
          userAddress: dto.userAddress,
          tokenSymbolFrom: dto.tokenSymbolFrom,
          tokenSymbolTo: dto.tokenSymbolTo,
          amountIn: dto.amount,
          amountOutMinimum: "0"
        });
      case ChainNames.SOLANA:
        return this.jupiterService.swapTokensExt({
          userId: dto.userId,
          fromAddress: dto.userAddress,
          tokenSymbolFrom: dto.tokenSymbolFrom,
          tokenSymbolTo: dto.tokenSymbolTo,
          amount: dto.amount,
          slippageBps: 0
        });
      case ChainNames.HYPER:
        return this.hyperSwapService.executeSwap({
          chainName: dto.chainName,
          userId: dto.userId,
          userAddress: dto.userAddress,
          tokenSymbolFrom: dto.tokenSymbolFrom,
          tokenSymbolTo: dto.tokenSymbolTo,
          amountIn: dto.amount,
          amountOutMinimum: '0'
        });
      default:
        if (dto.destinationChainName && dto.destinationChainName !== dto.chainName) {
          return this.oneinchService.swapTokensCrossChain({
            userId: dto.userId,
            userAddress: dto.userAddress,
            originalChainName: dto.chainName,
            destinationChainName: dto.destinationChainName,
            tokenSymbolFrom: dto.tokenSymbolFrom,
            tokenSymbolTo: dto.tokenSymbolTo,
            amount: dto.amount,
          });
        } else {
          return this.oneinchService.swapTokensSingleChain({
            userId: dto.userId,
            userAddress: dto.userAddress,
            originalChainName: dto.chainName,
            destinationChainName: dto.chainName,
            tokenSymbolFrom: dto.tokenSymbolFrom,
            tokenSymbolTo: dto.tokenSymbolTo,
            amount: dto.amount,
            slippage: 0,
          });
        }
    }
  }


  async createLimitOrder(params: ExecuteLimitOrderDto): Promise<CreateOrderDto | string> {
    switch (params.chainName) {
      case 'solana':
        return this.jupiterService.createLimitOrder(params);
      case 'hyper':
        return this.hyperSwapService.createLimitOrder(params);
      case 'sonic':
        return this.sonicService.createLimitOrder(params);
      default:
        return this.oneinchService.createLimitOrder(params);
    }
  }

  async cancelLimitOrder(params: CloseOrderExtDto): Promise<string | SwapOrder> {
    switch (params.chainName) {
      case 'solana':
        return this.jupiterService.cancelUserOrders({ ...params, orders: [params.orderId] })[0]
      case 'hyper':
        return this.swapOrdersService.closeOrderExt(params);
      case 'sonic':
        return this.swapOrdersService.closeOrderExt(params);
      default:
        throw new Error('Oneinch limit orders are not supported for canceling');
    }
  }

  async getLimitOrders(params: GetLimitOrdersDto): Promise<any> {
    switch (params.chainName) {
      case 'solana':
        return this.jupiterService.getActiveLimitOrders(params);
      case 'hyper':
        return this.swapOrdersService.checkUserOrders(params);
      case 'sonic':
        return this.swapOrdersService.checkUserOrders(params);
      default:
        return this.oneinchService.getLimitOrdersByUser(params);
    }
  }

  public async getBalanceToken(args: GetBalanceERC20Params): Promise<string> {
    const { chainName, userAddress, contractAddressOrTokenSymbol } = args;
    let result = await this.tokenService.fetchTokenAddressByTicker({
      chainName: chainName,
      symbol: contractAddressOrTokenSymbol,
    })

    if (result.error || !result.address) {
      throw new Error(`Cannot find address for token symbol: ${contractAddressOrTokenSymbol}`);
    }
    if (chainName === 'solana') {
      const balance = await this.solanaUtils.getBalanceSPL(userAddress, result.address);
      return balance
    } else {
      const erc20Decimals = await this.evmUtils.getErc20Decimals(chainName, result.address);
      const balance = await this.evmUtils.getBalanceERC20(chainName, userAddress, result.address);
      return this.evmUtils.toEth(balance, erc20Decimals);
    }
  }


  public async getBalanceNative(args: GetBalanceNativeParams): Promise<string> {
    const { chainName, address } = args;

    if (chainName === 'solana') {
      const balance = await this.solanaUtils.getBalance(address);
      return balance;
    } else {
      const balance = await this.evmUtils.getBalanceNative(chainName, address);
      return this.evmUtils.toEth(balance);
    }
  }

  public async deployERC20Simple(args: DeployERC20Params): Promise<OnlyAddressResponseDto> {
    const { abi, bytecode } = getContractAbiAndBytecode(ContractType.ERC20);
    const wallet = (await this.getUserWallet(args.chainName, args.userId, args.userAddress)) as Wallet;
    try {
      const initialSupplyInWei = this.evmUtils.toWei(args.initialSupplyInWei);
      const result = await this.evmUtils.deployContract(args.chainName, wallet, abi, bytecode, [
        args.name,
        args.symbol,
        initialSupplyInWei,
      ]);
      return {
        address: result.address,
      };
    } catch (error) {
      this.logger.error('Contract deployment failed:', error);
      throw error;
    }
  }

  public async deployERC721Contract(args: DeployERC721Params): Promise<OnlyAddressResponseDto> {
    const wallet = (await this.getUserWallet(args.chainName, args.userId, args.userAddress)) as Wallet;
    // Get ERC20 abi and bytecode
    const { abi, bytecode } = getContractAbiAndBytecode(ContractType.ERC721);

    try {
      const result = await this.evmUtils.deployContract(args.chainName, wallet, abi, bytecode, [
        args.name,
        args.symbol,
        args.baseURI,
      ]);
      return {
        address: result.address,
      };
    } catch (error) {
      this.logger.error('Contract deployment failed:', error);
      throw error;
    }
  }

  public async deployPoolContract(args: any): Promise<any> {
    const { abi, bytecode } = getContractAbiAndBytecode(ContractType.Pool);
    const provider = new ethers.providers.JsonRpcProvider(
      'https://eth-sepolia.g.alchemy.com/v2/qVov1pz-FWb9HkgpyS1X4oO-JYh5XH3f',
    );
    const signer = new ethers.Wallet(args.signer.privateKey, provider);

    try {
      const contractAddress = '0x151399A5E75605A6E102864Ef95e556082954101';
      const poolContract = new ethers.Contract(contractAddress, abi, signer);

      const randomNumber = Math.floor(Math.random() * 1000000);
      const randomSalt = `salt${randomNumber} `;
      const hookSalt = utils.keccak256(utils.toUtf8Bytes(randomSalt));
      const computedAddress = utils.getCreate2Address(contractAddress, hookSalt, utils.keccak256(bytecode));

      const key = {
        currency0: args.currency0,
        currency1: args.currency1,
        hooks: args.hookAddress,
        fee: args.fee,
        tickSpacing: args.tickSpacing,
      };
      const hookData = utils.toUtf8Bytes('');

      const sqrtprice = '79228162514264337593543950336';
      const receipt = await poolContract.deployPoolWithHook(key, sqrtprice, hookData, bytecode, hookSalt);

      return receipt;
    } catch (error) {
      this.logger.error('Contract deployment failed:', error);
      throw error;
    }
  }

  public async mintNft(args: {
    chainName: ChainNames;
    contractAddress: string;
    to: string;
    privateKey: string;
  }): Promise<BasicBlockchainResponseDto> {
    const wallet = this.evmUtils.privateKeyToSigner(args.chainName, args.privateKey);

    const contract = await this.evmUtils.getContract<ERC721Abi>(
      args.chainName,
      args.contractAddress,
      getContractAbi(ContractType.ERC721),
      wallet,
    );
    const tx = await contract.mint(args.to);
    return {
      transactionHash: tx.hash,
      explorerUrl: this.evmUtils.explorerUrlForTx(args.chainName, tx.hash),
    };
  }

  public async transferToken(args: TransferERC20Params): Promise<TransferResponseDto> {
    const contractAddressOrTokenSymbol = args.contractAddressOrTokenSymbol;
    if (args.chainName === 'solana') {
      const keypair = (await this.getUserWallet(args.chainName, args.userId, args.fromAddress)) as Keypair;
      let result = await this.tokenService.fetchTokenAddressByTicker({
        chainName: args.chainName,
        symbol: contractAddressOrTokenSymbol,
      });

      if (result.error || !result.address) {
        throw new Error(`Cannot find address for token symbol: ${contractAddressOrTokenSymbol}`);
      }

      const tokenAddress = result.address

      const hash = await this.solanaUtils.sendSPL(
        keypair,
        args.destination_address,
        tokenAddress,
        parseFloat(args.amount),
        true
      );

      return {
        transactionHash: hash,
        explorerUrl: await this.solanaUtils.getExplorerUrlForTx(hash),
        from: keypair.publicKey.toBase58(),
        to: args.destination_address,
        amount: args.amount,
      };
    } else {
      const wallet = (await this.getUserWallet(args.chainName, args.userId, args.fromAddress)) as Wallet;
      let tokenAddress: string;

      if (contractAddressOrTokenSymbol.startsWith('0x')) {
        tokenAddress = contractAddressOrTokenSymbol;
      } else {
        const _tokenAddress = await this.tokenService.fetchTokenAddressByTicker({
          chainName: args.chainName,
          symbol: contractAddressOrTokenSymbol,
        });
        if (!_tokenAddress.address) {
          throw new Error(`Cannot find address of token ${contractAddressOrTokenSymbol} on chain ${args.chainName} `);
        }
        tokenAddress = _tokenAddress.address;
      }

      const hash = await this.evmUtils.sendERC20({
        wallet,
        chainName: args.chainName,
        to: args.destination_address,
        amount: args.amount,
        contractAddress: tokenAddress,
        taxable: true,
      });

      return {
        transactionHash: hash,
        explorerUrl: this.evmUtils.explorerUrlForTx(args.chainName, hash),
        from: args.fromAddress,
        to: args.destination_address,
        amount: args.amount,
      };
    }
  }

  public async transferNative(args: TransferNativeParams): Promise<TransferResponseDto> {
    if (args.chainName === 'solana') {
      const keypair = (await this.getUserWallet(args.chainName, args.userId, args.fromAddress)) as Keypair;

      const hash = await this.solanaUtils.sendNative(keypair, args.destination_address, parseFloat(args.amount), true);

      return {
        transactionHash: hash,
        explorerUrl: await this.solanaUtils.getExplorerUrlForTx(hash),
        from: keypair.publicKey.toBase58(),
        to: args.destination_address,
        amount: args.amount,
        additionalMessage: 'Transaction started, confirmation may take time',
      };
    } else {
      const wallet = (await this.getUserWallet(args.chainName, args.userId, args.fromAddress)) as Wallet;

      const hash = await this.evmUtils.sendNative({
        wallet,
        to: args.destination_address,
        amount: args.amount,
        taxable: true,
      });

      return {
        transactionHash: hash,
        explorerUrl: this.evmUtils.explorerUrlForTx(args.chainName, hash),
        from: args.fromAddress,
        to: args.destination_address,
        amount: args.amount,
        additionalMessage: 'Transaction started, confirmation may take time',
      };
    }
  }

  public async getChainList(): Promise<ChainNames[]> {
    return Object.values(ChainNames);
  }

  public async getUserTelegramId(userId: string): Promise<string | undefined> {
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    return user.telegramID;
  }

  public async getUserWallet(chainName: ChainNames, userId: string, address: string): Promise<Wallet | Keypair> {
    const { encryptedKey } = await this.userRepository.getUserAccount(userId, address);

    const decryptedPrivateKey = await this.kmsService.decryptSecret(encryptedKey);

    if (chainName === ChainNames.SOLANA) {
      return this.solanaUtils.privateKeyToKeypair(decryptedPrivateKey);
    }
    return this.evmUtils.privateKeyToSigner(chainName, decryptedPrivateKey);
  }

  public async saveSlippage(args: SaveSlippageParams): Promise<string> {
    const { userId, slippage, chainName, userAddress } = args;

    if (!slippage || !userId || !chainName || !userAddress) {
      throw new Error(
        `Invalid arguments in saveSlippage! Needed arguments: {
      userAddress: string,
        chainName: string,
          slippage: string,
            } `,
      );
    }

    await this.accountRepository.saveSlippageForChain(userId, userAddress, chainName as ChainNames, slippage);

    return `Slippage for ${chainName} was succesfully saved`;
  }

  public async getSlippage(args: GetSlippageParams): Promise<{ slippage: string }> {
    const { userId, chainName, userAddress } = args;

    if (!userId || !chainName || !userAddress) {
      throw new Error(
        `Invalid arguments in getSlippage! Needed arguments: {
      userAddress: string,
        chainName: string,
            } `,
      );
    }

    const value = await this.accountRepository.getSlippageForChain(userId, userAddress, chainName as ChainNames);
    const slippage = (value / 100).toFixed(2);

    return {
      slippage: `${slippage}% `,
    };
  }
}
