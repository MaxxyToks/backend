import { ChainNames } from '../../modules/blockchain/constants';

export class ChainNameParam {
  chainName: ChainNames;
}

export class ChainNameAndSymbolParam {
  chainName: ChainNames;
  symbol: string;
}

export class RunBridgeParams {
  userAddress: string;
  originalChainName: ChainNames;
  destinationChainName: ChainNames;
  tokenSymbolFrom: string;
  tokenSymbolTo: string;
  amount: string;
  userId: string;
}

export class AddressParam {
  address: string;
}

export class HashParam {
  chainName: ChainNames;
  hash: string;
}
