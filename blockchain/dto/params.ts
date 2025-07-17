
import { TokenMetadataDto } from 'modules/swap-orders/dto/order.dto';
import { ChainNames } from '../constants';

export class GetBalanceERC20Params {
  chainName: ChainNames;
  userAddress: string;
  contractAddressOrTokenSymbol: string;
  userId: string;
}

export class GetBalanceNativeParams {
  chainName: ChainNames;
  address: string;
  userId: string;
}

export class DeployERC20Params {
  chainName: ChainNames;
  name: string;
  symbol: string;
  initialSupplyInWei: string;
  userAddress: string;
  userId: string;
}

export class MerchantMetadata {
  chain_id: number;
  contract_address: string;
  sender: string;
}

export class DeployERC721Params {
  chainName: ChainNames;
  name: string;
  symbol: string;
  baseURI: string;
  userAddress: string;
  userId: string;
}

export class TransferNativeParams {
  chainName: ChainNames;
  destination_address: string;
  amount: string;
  fromAddress: string;
  userId: string;
}

export class TransferERC20Params {
  chainName: ChainNames;
  destination_address: string;
  contractAddressOrTokenSymbol: string;
  amount: string;
  fromAddress: string;
  userId: string;
}

export class ResolveENSParams {
  ENS: string;
}

export class BridgeToL2WithL1SLOAD {
  chainName: ChainNames;
  token: string;
  amount: string;
  fromAddress: string;
  userId: string;
}

export class CreateSwapOrderParams {
  chainName: string;
  userId: string;
  fromAddress: string;
  tokenMetadataFrom: TokenMetadataDto;
  tokenMetadataTo: TokenMetadataDto;
  amount: string;
  slippageBps?: number;
  expiration?: string;
}


export class SaveSlippageParams {
  userId: string;
  userAddress: string;
  chainName: string;
  slippage: number;
}

export class GetSlippageParams {
  userId: string;
  userAddress: string;
  chainName: string;
  slippage: number;
}

export class GetBoostedAssetsWithMetadata {
  chainName: ChainNames;
  numberOfAssets: number;
}

export class UnifiedSwapDto {
  chainName: ChainNames;
  destinationChainName?: ChainNames;
  userId: string;
  userAddress: string;
  tokenSymbolFrom: string;
  tokenSymbolTo: string;
  amount: string;
}


export class ExecuteSwapDto {
  chainName?: ChainNames;
  userId: string;
  userAddress: string;
  tokenSymbolFrom: string;
  tokenSymbolTo: string;
  amountIn: string;
  amountOutMinimum?: string = '0';
}

export class ExecuteLimitOrderDto {
  chainName: ChainNames;
  userId: string;
  userAddress: string;
  tokenSymbolFrom: string;
  tokenSymbolTo: string;
  amount: string;
  threshold
  expiration: string;
}

export class CloseOrderExtDto {
  orderId: string;
  userId: string;
  userAddress: string;
  chainName: ChainNames;
}
