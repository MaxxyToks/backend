import { config } from 'dotenv';

import { ChainNames, ChainType, getChainIdByName, ZERO_ADDRESS } from 'modules/blockchain/constants';
config();

interface AcrossConfigInterface {
  name: ChainNames;
  chainId: number;
  spokePoolContract: string;
  wethAddress: string;
  nativeTransferImpossible?: boolean;
  anyTransferImpossible?: boolean;
}

export const AcrossConfig: Record<ChainType, Partial<Record<ChainNames, AcrossConfigInterface>>> = {
  [ChainType.MAINNET]: {
    [ChainNames.ARBITRUM]: {
      name: ChainNames.ARBITRUM,
      chainId: getChainIdByName(ChainNames.ARBITRUM),
      spokePoolContract: '0xe35e9842fceaca96570b734083f4a58e8f7c5f2a',
      wethAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    },
    [ChainNames.BASE]: {
      name: ChainNames.BASE,
      chainId: getChainIdByName(ChainNames.BASE),
      spokePoolContract: '0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64',
      wethAddress: '0x4200000000000000000000000000000000000006',
    },

    [ChainNames.ETHEREUM]: {
      name: ChainNames.ETHEREUM,
      chainId: getChainIdByName(ChainNames.ETHEREUM),
      spokePoolContract: '0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5',
      wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    [ChainNames.OPTIMISM]: {
      name: ChainNames.OPTIMISM,
      chainId: getChainIdByName(ChainNames.OPTIMISM),
      spokePoolContract: '0x6f26Bf09B1C792e3228e5467807a900A503c0281',
      wethAddress: '0x4200000000000000000000000000000000000006',
    },
    [ChainNames.POLYGON]: {
      name: ChainNames.POLYGON,
      chainId: getChainIdByName(ChainNames.POLYGON),
      spokePoolContract: '0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096',
      wethAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      nativeTransferImpossible: true,
    },
    [ChainNames.ZKSYNC]: {
      name: ChainNames.ZKSYNC,
      chainId: getChainIdByName(ChainNames.ZKSYNC),
      spokePoolContract: '0xE0B015E54d54fc84a6cB9B666099c46adE9335FF',
      wethAddress: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91',
    },
    [ChainNames.SCROLL]: {
      name: ChainNames.SCROLL,
      chainId: getChainIdByName(ChainNames.SCROLL),
      spokePoolContract: '0x3bad7ad0728f9917d1bf08af5782dcbd516cdd96',
      wethAddress: '0x5300000000000000000000000000000000000004',
    },
  },
  [ChainType.TESTNET]: {
    [ChainNames.ARBITRUM]: {
      name: ChainNames.ARBITRUM,
      chainId: getChainIdByName(ChainNames.ARBITRUM),
      spokePoolContract: '0x7E63A5f1a8F0B4d0934B2f2327DAED3F6bb2ee75',
      wethAddress: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    },
    [ChainNames.BASE]: {
      name: ChainNames.BASE,
      chainId: getChainIdByName(ChainNames.BASE),
      spokePoolContract: '0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64',
      wethAddress: '0x4200000000000000000000000000000000000006',
    },
    [ChainNames.ETHEREUM]: {
      name: ChainNames.ETHEREUM,
      chainId: getChainIdByName(ChainNames.ETHEREUM),
      spokePoolContract: '0x5ef6C01E11889d86803e0B23e3cB3F9E9d97B662',
      wethAddress: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    },
    [ChainNames.OPTIMISM]: {
      name: ChainNames.OPTIMISM,
      chainId: getChainIdByName(ChainNames.OPTIMISM),
      spokePoolContract: '0x6f26Bf09B1C792e3228e5467807a900A503c0281',
      wethAddress: ZERO_ADDRESS,
      nativeTransferImpossible: true,
      anyTransferImpossible: true,
    },
    [ChainNames.POLYGON]: {
      name: ChainNames.POLYGON,
      chainId: getChainIdByName(ChainNames.POLYGON),
      spokePoolContract: '0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096',
      wethAddress: '0x52eF3d68BaB452a294342DC3e5f464d7f610f72E',
      nativeTransferImpossible: true,
    },
    [ChainNames.ZKSYNC]: {
      name: ChainNames.ZKSYNC,
      chainId: getChainIdByName(ChainNames.ZKSYNC),
      spokePoolContract: '0xE0B015E54d54fc84a6cB9B666099c46adE9335FF',
      wethAddress: ZERO_ADDRESS,
      nativeTransferImpossible: true,
      anyTransferImpossible: true,
    },
  },
};

export const getAcrossChainConfig = (chainName: ChainNames): AcrossConfigInterface => {
  const mode = process.env.BLOCKCHAIN_MODE as ChainType;
  const config = AcrossConfig[mode][chainName];
  if (!config) {
    throw new Error(`Across config for ${chainName} not found`);
  }
  return config;
};
