import { ChainNames } from '../../modules/blockchain/constants';

export class SubscribeToDcaDto {
  chainName: ChainNames;
  userId: string;
  userAddress: string;
  tokenFrom: string;
  tokenTo: string;
  amount: string;
  amountPerCycle: string;
  cycleInterval: string;
}

export class CloseDcaDto {
  chainName: ChainNames;
  userId: string;
  userAddress: string;
  index?: number;
  dcaKey?: string;
}

export class GetDcaDto {
  chainName: ChainNames;
  userId: string;
  userAddress: string;
}