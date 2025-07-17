import { ethers } from 'ethers';

export interface ContractDeploymentIface {
  contract: ethers.BaseContract;
  address: string;
}

export interface ResponseWithTransactionHash {
  transactionHash: string;
  explorerUrl: string;
}

export interface ResponseWithAddressUrl {
  address: string;
  explorerUrl: string;
}

export type AddressOrAlias = string;
