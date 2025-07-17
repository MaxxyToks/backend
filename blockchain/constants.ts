import { config } from 'dotenv';
import { ethers } from 'ethers';

import CTF from './contracts/CTF.abi.json';
import ERC20Abi from './contracts/ERC20.abi.json';
import ERC20Bytecode from './contracts/ERC20.bytecode.json';
import ERC721Abi from './contracts/ERC721.abi.json';
import ERC721Bytecode from './contracts/ERC721.bytecode.json';
import FaucetAbi from './contracts/Faucet.abi.json';
import PolyExchangeAbi from './contracts/PolyExchange.abi.json';
import PoolAbi from './contracts/Pool.abi.json';
import PoolBytecode from './contracts/Pool.bytecode.json';
import SpokePoolAbi from './contracts/SpokePool.abi.json';
import TransfersAbi from './contracts/Transfers.abi.json';

config();

export enum ContractType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  Faucet = 'Faucet',
  SpokePool = 'SpokePool',
  CTF = 'CTF',
  PolyExchange = 'PolyExchange',
  Transfers = 'Transfers',
  Pool = 'Pool',
}

const contractAbi = {
  [ContractType.ERC20]: ERC20Abi as ethers.ContractInterface,
  [ContractType.ERC721]: ERC721Abi as ethers.ContractInterface,
  [ContractType.Faucet]: FaucetAbi as ethers.ContractInterface,
  [ContractType.SpokePool]: SpokePoolAbi as ethers.ContractInterface,
  [ContractType.Transfers]: TransfersAbi as ethers.ContractInterface,
  [ContractType.CTF]: CTF as ethers.ContractInterface,
  [ContractType.PolyExchange]: PolyExchangeAbi as ethers.ContractInterface,
  [ContractType.Pool]: PoolAbi as ethers.ContractInterface,
};

const contractBytecode = {
  [ContractType.ERC20]: ERC20Bytecode.bytecode,
  [ContractType.ERC721]: ERC721Bytecode.bytecode,
  [ContractType.Pool]: PoolBytecode.bytecode,
};

export const getContractAbi = (contractType: ContractType): ethers.ContractInterface => {
  return contractAbi[contractType];
};

export const getContractBytecode = (contractType: ContractType): string => {
  return contractBytecode[contractType];
};

export const getContractAbiAndBytecode = (
  contractType: ContractType,
): { abi: ethers.ContractInterface; bytecode: string } => {
  const abi = contractAbi[contractType];
  const bytecode = contractBytecode[contractType];
  return { abi, bytecode };
};

export enum ChainNames {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  BASE = 'base',
  OPTIMISM = 'optimism',
  ZKSYNC = 'zksync',
  POLYGON = 'polygon',
  SCROLL = 'scroll',
  SOLANA = 'solana',
  BSC = 'bsc',
  GNOSIS = 'gnosis',
  AVALANCHE = 'avalanche',
  FANTOM = 'fantom',
  AURORA = 'aurora',
  HYPER = 'hyper',
  SONIC = 'sonic',
}

export enum ChainType {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
}

const mainnetChainIds = {
  [ChainNames.ETHEREUM]: 1,
  [ChainNames.ARBITRUM]: 42161,
  [ChainNames.BASE]: 8453,
  [ChainNames.OPTIMISM]: 10,
  [ChainNames.ZKSYNC]: 324,
  [ChainNames.POLYGON]: 137,
  [ChainNames.SCROLL]: 534352,
  [ChainNames.BSC]: 56,
  [ChainNames.GNOSIS]: 100,
  [ChainNames.AVALANCHE]: 43114,
  [ChainNames.FANTOM]: 250,
  [ChainNames.AURORA]: 1313161554,
  [ChainNames.HYPER]: 999,
  [ChainNames.SONIC]: 146,
  [ChainNames.SOLANA]: 0,
};

export const mainnetChainIdsHex = {
  [ChainNames.ETHEREUM]: '0x1',
  [ChainNames.ARBITRUM]: '0xa4b1',
  [ChainNames.BASE]: '0x2105',
  [ChainNames.OPTIMISM]: '0xa',
  [ChainNames.ZKSYNC]: '0x144',
  [ChainNames.POLYGON]: '0x89',
  [ChainNames.SCROLL]: '0x82750',
  [ChainNames.BSC]: '0x38',
  [ChainNames.GNOSIS]: '0x64',
  [ChainNames.AVALANCHE]: '0xa86a',
  [ChainNames.FANTOM]: '0xfa',
  [ChainNames.AURORA]: '0x4e454152',
  [ChainNames.HYPER]: '0x3e7',
  [ChainNames.SONIC]: '0x92',
  [ChainNames.SOLANA]: '0x0',
};
const testnetChainIds = {
  [ChainNames.ETHEREUM]: 11155111,
  [ChainNames.ARBITRUM]: 421614,
  [ChainNames.BASE]: 8453,
  [ChainNames.OPTIMISM]: 11155420,
  [ChainNames.POLYGON]: 80002,
  [ChainNames.SCROLL]: 2227728, // l1sload devnet, not actual Scroll testnet
  [ChainNames.BSC]: 97,
  [ChainNames.GNOSIS]: 10200,
  [ChainNames.AVALANCHE]: 43113,
  [ChainNames.FANTOM]: 4002,
  [ChainNames.AURORA]: 1313161555,
  [ChainNames.SOLANA]: 0,
};

export const ChainId = process.env.BLOCKCHAIN_MODE === ChainType.MAINNET ? mainnetChainIds : testnetChainIds;

export const getChainIdByName = (chainName: ChainNames): number => {
  return ChainId[chainName];
};

export const getChainNameById = (chainId: number): ChainNames => {
  const result = Object.values(ChainNames).find((chainName) => ChainId[chainName] === chainId);
  if (!result) {
    throw new Error(`ChainId ${chainId} not found`);
  }
  return result;
};

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ZERO_BNB_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
export const ZERO_ARB_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
export const ZERO_HYPER_ADDRESS = '0x5555555555555555555555555555555555555555';
export const ZERO_SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
export const NATIVE_TOKEN_ADDRESS = '0x4200000000000000000000000000000000000006';
