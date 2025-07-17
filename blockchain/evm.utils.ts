import { forwardRef, Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { BaseContract, BigNumber, ethers } from 'ethers';

import { SettingsService } from 'modules/settings/settings.service';

import { FeeService, Ops } from 'modules/fee/fee.service';
import { TokenMetadataDto } from 'modules/swap-orders/dto/order.dto';
import { ChainNames, ChainType, ContractType, getChainNameById, getContractAbi } from './constants';
import { ERC20Abi } from './contract-types';
import { ResolveENSParams } from './dto/params';
import { ContractDeploymentIface } from './types';

// Service for utility functions on the blockchain including ethers.js

@Injectable()
export class EvmUtils implements OnModuleInit {
  private mode: ChainType;
  private readonly logger = new Logger(EvmUtils.name);
  private providers: Record<ChainNames, ethers.providers.JsonRpcProvider>;

  constructor(private readonly settingsService: SettingsService,
    @Optional() @Inject(forwardRef(() => FeeService))
    private readonly feeService?: FeeService) {
  }

  public async onModuleInit(): Promise<void> {
    this.mode = this.settingsService.getSettings().blockchain.mode;
    this.providers = {
      [ChainNames.ETHEREUM]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.ETHEREUM].rpcUrl,
      ),
      [ChainNames.ARBITRUM]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.ARBITRUM].rpcUrl,
      ),
      [ChainNames.BASE]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.BASE].rpcUrl,
      ),
      [ChainNames.OPTIMISM]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.OPTIMISM].rpcUrl,
      ),
      [ChainNames.POLYGON]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.POLYGON].rpcUrl,
      ),
      [ChainNames.ZKSYNC]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.ZKSYNC].rpcUrl,
      ),
      [ChainNames.SCROLL]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.SCROLL].rpcUrl,
      ),
      [ChainNames.BSC]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.BSC].rpcUrl,
      ),
      [ChainNames.GNOSIS]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.GNOSIS].rpcUrl,
      ),
      [ChainNames.AVALANCHE]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.AVALANCHE].rpcUrl,
      ),
      [ChainNames.FANTOM]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.FANTOM].rpcUrl,
      ),
      [ChainNames.AURORA]: new ethers.providers.JsonRpcProvider(
        this.settingsService.getSettings().blockchain.chains[ChainNames.AURORA].rpcUrl,
      ),
      [ChainNames.SOLANA]: new ethers.providers.JsonRpcProvider(undefined),
      [ChainNames.HYPER]: new ethers.providers.JsonRpcProvider
        (this.settingsService.getSettings().blockchain.chains[ChainNames.HYPER].rpcUrl),
      [ChainNames.SONIC]: new ethers.providers.JsonRpcProvider
        (this.settingsService.getSettings().blockchain.chains[ChainNames.SONIC].rpcUrl),
    };

    await this.resolveENS({ ENS: 'vitalik.eth' });
  }

  public getProvider(chainName: ChainNames): ethers.providers.JsonRpcProvider {
    return this.providers[chainName];
  }

  public privateKeyToAddress(privateKey: string): string {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  }

  public privateKeyToSigner(chainName: ChainNames, privateKey: string): ethers.Wallet {
    return new ethers.Wallet(privateKey, this.getProvider(chainName));
  }

  public getSigner(chainName: ChainNames, privateKey: string): ethers.Wallet {
    return new ethers.Wallet(privateKey, this.getProvider(chainName));
  }

  public getGasPrice(chainName: ChainNames): Promise<ethers.providers.FeeData> {
    return this.getProvider(chainName).getFeeData();
  }

  public async getTimestamp(chainName: ChainNames): Promise<number> {
    const block = await this.getProvider(chainName).getBlock('latest');
    return block.timestamp;
  }

  public estimateGas(data: string, chainName: ChainNames): Promise<BigNumber> {
    return this.getProvider(chainName).estimateGas({ data });
  }

  public async deployContract(
    chainName: ChainNames,
    deployerWallet: ethers.Wallet,
    abi: ethers.ContractInterface,
    bytecode: string,
    args: unknown[],
  ): Promise<ContractDeploymentIface> {
    const contractFactory = new ethers.ContractFactory(abi, bytecode, deployerWallet);
    const deploymentTx = contractFactory.getDeployTransaction(...args);
    const gasEstimate = await this.getProvider(chainName).estimateGas({
      from: deployerWallet.address,
      data: deploymentTx.data,
    });
    const gasPrice = await this.getProvider(chainName).getFeeData();
    if (!gasPrice.gasPrice) {
      throw new Error('Gas price not available');
    }
    const totalPrice = gasEstimate.mul(gasPrice.gasPrice);
    const totalPriceInEther = ethers.utils.formatEther(totalPrice);
    this.logger.debug(
      `Gas Amount: ${gasEstimate}, Gas Price: ${gasPrice.gasPrice}, Total Price: ${totalPriceInEther} ETH`,
    );

    // Deploy the contract with constructor arguments and gas settings
    const contract = await contractFactory.deploy(...args, {
      gasLimit: gasEstimate,
      gasPrice: gasPrice.gasPrice,
    });

    // Wait for deployment to complete to get transaction hash
    const deployedContract = await contract.deployed();
    deployedContract.address;
    this.logger.debug('Contract deployed at:', deployedContract.target);
    this.logger.debug('Transaction hash:', deployedContract);

    return {
      contract,
      address: deployedContract.address as string,
    };
  }

  public getContract<T extends BaseContract>(
    chainName: ChainNames,
    address: string,
    abi: ethers.ContractInterface,
    signer?: ethers.Signer,
  ): T {
    return new ethers.Contract(address, abi, signer || this.getProvider(chainName)) as unknown as T;
  }

  public async getInterface(abi: ethers.ContractInterface): Promise<ethers.utils.Interface> {
    return new ethers.utils.Interface(JSON.stringify(abi));
  }

  public async getBalanceERC20(chainName: ChainNames, address: string, contractAddress: string): Promise<string> {
    const contract = await this.getContract<ERC20Abi>(chainName, contractAddress, getContractAbi(ContractType.ERC20));
    const balance: BigNumber = await contract.balanceOf(address);
    return balance.toString();
  }

  public async getBalanceNative(chainName: ChainNames, address: string): Promise<string> {
    const provider = this.getProvider(chainName);
    const balance = await provider.getBalance(address);
    return balance.toString();
  }

  public async getTokenMetadata(chainName: ChainNames, contractAddress: string): Promise<TokenMetadataDto> {
    const contract = await this.getContract<ERC20Abi>(chainName, contractAddress, getContractAbi(ContractType.ERC20));
    const metadata: TokenMetadataDto = {
      name: await contract.name(),
      symbol: await contract.symbol(),
      address: contractAddress,
    };
    return metadata;
  }

  public async sendNative(args: { wallet: ethers.Wallet; to: string; amount: string, taxable: boolean }): Promise<string> {
    const { wallet, to, amount, taxable } = args;
    const chainId = await wallet.getChainId();
    const chainName = getChainNameById(chainId);
    const value = taxable ? this.toWei(await this.feeService!.payFee(chainName, amount, '0x', true, wallet, Ops.TRANSFER)) : this.toWei(amount);

    const gasPrice = await wallet.getGasPrice();
    const gasLimit = await wallet.estimateGas({
      to,
      value,
    });



    const tx = await wallet.sendTransaction({
      to,
      value,
      gasLimit,
      gasPrice,
    });
    return tx.hash;
  }

  public async sendERC20(args: {
    wallet: ethers.Wallet;
    chainName: ChainNames;
    to: string;
    amount: string;
    contractAddress: string;
    taxable: boolean;
  }): Promise<string> {
    const { wallet, to, amount, chainName, contractAddress, taxable } = args;
    const contract = this.getContract<ERC20Abi>(
      args.chainName,
      args.contractAddress,
      getContractAbi(ContractType.ERC20),
      wallet,
    );
    const decimals = await this.getErc20Decimals(chainName, args.contractAddress);

    const amountInWei = taxable ? this.toWei(await this.feeService!.payFee(chainName, amount, contractAddress, false, wallet, Ops.TRANSFER), decimals) : this.toWei(amount, decimals)
    const txData = await contract.populateTransaction.transfer(to, amountInWei);
    const gasLimit = await wallet.estimateGas(txData);
    const gasPrice = await wallet.getGasPrice();
    const tx = await wallet.sendTransaction({
      to: contractAddress,
      data: txData.data,
      gasLimit,
      gasPrice,
    });

    return tx.hash;
  }

  public toEth(wei: ethers.BigNumberish, decimals: number = 18): string {
    return ethers.utils.formatUnits(wei, decimals);
  }

  public toWei(eth: string, decimals: number = 18): string {
    const fixed = parseFloat(eth).toFixed(decimals);
    return ethers.utils.parseUnits(fixed, decimals).toString();
  }

  public async generateAccount(): Promise<{ privateKey: string; address: string }> {
    const wallet = ethers.Wallet.createRandom();
    return {
      privateKey: wallet.privateKey,
      address: wallet.address,
    };
  }

  public async getErc20Decimals(chainName: ChainNames, contractAddress: string): Promise<number> {
    const contract = this.getContract<ERC20Abi>(chainName, contractAddress, getContractAbi(ContractType.ERC20));
    const decimals = await contract.decimals();
    return Number(decimals);
  }

  public async getErc20FullDetails(
    chainName: ChainNames,
    contractAddress: string,
  ): Promise<{
    decimals: number;
    name: string;
    symbol: string;
  }> {
    const contract = await this.getContract<ERC20Abi>(chainName, contractAddress, getContractAbi(ContractType.ERC20));
    const [decimals, name, symbol] = await Promise.all([contract.decimals(), contract.name(), contract.symbol()]);
    return { decimals, name, symbol };
  }

  public async getTransactionByHash(
    chainName: ChainNames,
    hash: string,
  ): Promise<ethers.providers.TransactionReceipt | null> {
    return this.getProvider(chainName).getTransactionReceipt(hash);
  }

  public async getTransactionReceipt(
    chainName: ChainNames,
    hash: string,
  ): Promise<ethers.providers.TransactionReceipt | null> {
    return this.getProvider(chainName).getTransactionReceipt(hash);
  }

  public explorerUrlForTx(chainName: ChainNames, txHash: string): string {
    return `${this.settingsService.getSettings().blockchain.chains[chainName].blockExplorerUrl}/tx/${txHash}`;
  }

  public explorerUrlForAddress(chainName: ChainNames, address: string): string {
    return `${this.settingsService.getSettings().blockchain.chains[chainName].blockExplorerUrl}/address/${address}`;
  }

  public async resolveENS(params: ResolveENSParams): Promise<string | null> {
    const availableChains = [ChainNames.ETHEREUM, ChainNames.BASE, ChainNames.ARBITRUM, ChainNames.OPTIMISM];

    let resolved: string | null = null;
    for (const chain of availableChains) {
      const provider = this.getProvider(chain);
      const resolverEns = await provider.resolveName(params.ENS);
      if (resolverEns) {
        resolved = resolverEns;
        break;
      }
    }
    return resolved;
  }

  public isEvmWalletAddress(address: string): boolean {
    return address.startsWith('0x');
  }

  public async ensureSufficientBalanceAndAllowance(
    chainName: ChainNames,
    tokenAddress: string,
    signer: ethers.Signer,
    routerAddress: string,
    amount: string,
    isNative: boolean,
  ): Promise<ethers.BigNumber> {
    if (isNative) {
      const amountInRaw = ethers.utils.parseUnits(amount, 18);
      const nativeBalance = await signer.getBalance();
      if (nativeBalance.lt(amountInRaw)) {
        this.logger.error(
          `Insufficient native balance. Required: ${amountInRaw.toString()}, Available: ${nativeBalance.toString()}`,
        );
        throw new Error('Insufficient native balance to proceed with the swap.');
      }
      return amountInRaw;
    } else {
      const tokenContract = await this.getContract<ERC20Abi>(
        chainName,
        tokenAddress,
        getContractAbi(ContractType.ERC20),
        signer,
      );

      const decimals = await tokenContract.decimals();
      const amountInRaw = ethers.utils.parseUnits(amount, decimals);
      const allowance = await tokenContract.allowance(await signer.getAddress(), routerAddress);
      if (allowance.lt(amountInRaw)) {
        const balance = await tokenContract.balanceOf(await signer.getAddress());
        if (balance.lt(amountInRaw)) {
          this.logger.error(
            `Insufficient token balance. Required: ${amountInRaw.toString()}, Available: ${balance.toString()}, token: ${tokenAddress}`,
          );
          throw new Error('Insufficient token balance to proceed with the swap.');
        }
        this.logger.log('Approving TokenIn for router...');
        const approveTx = await tokenContract.approve(routerAddress, ethers.constants.MaxUint256);
        await approveTx.wait();
      } else {
        this.logger.log('Sufficient TokenIn allowance already exists.');
      }
      return amountInRaw;
    }
  }
}
