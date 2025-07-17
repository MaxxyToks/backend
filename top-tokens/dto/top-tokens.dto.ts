import {ChainNames} from "../../blockchain/constants";

export class GetTopTokens {
  chainName: ChainNames;
  numberOfAssets: number;
}

export type TopTokensDto = TopTokensResponseItem & {
  tokenName?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  price?: number;
  liquidity?: number;
  volume24h?: number;
  organicScore?: number;
  buyOrganicVolume24h?: number;
  sellOrganicVolume24h?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  mcap?: number;
  fdv?: number;
  holders?: number;
  transactions?: number;
};


export interface TopTokensResponseItem {
  chain?:string;
}