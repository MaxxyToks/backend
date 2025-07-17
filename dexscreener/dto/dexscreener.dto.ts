export interface BoostedAsset {
  url: string;
  chainId: string;
  tokenAddress: string;
  amount: number;
  totalAmount: number;
  icon: string;
  header: string;
  description: string;
  links: Array<{
    type: string;
    label: string;
    url: string;
  }>;
  message?: string;
}

export type MinimalBoostedAsset = Pick<BoostedAsset, 'url' | 'chainId' | 'description' | 'tokenAddress' | 'message'>;

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
}

export interface Liquidity {
  usd: number;
  base: number;
  quote: number;
}

export interface Info {
  imageUrl: string;
  websites: { url: string }[];
  socials: { platform: string; handle: string }[];
}

export interface Boosts {
  active: number;
}

export interface PoolResponse {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels: string[];
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  priceNative: string;
  priceUsd: string;
  liquidity: Liquidity;
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  info: Info;
  boosts: Boosts;
}
