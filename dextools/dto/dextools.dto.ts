export interface ApiResponse {
  code: string;
  data: TokenPairData[];
}

export interface TokenPairData {
  _id: {
    chain: string;
    exchange: string;
    pair: string;
    token: string;
    tokenRef: string;
  };
  token: Token;
  pair: Pair;
  price: number;
  priceInterval: number;
  priceDiff: number;
  volume: number;
  swaps: number;
}

export interface Token {
  audit: {
    is_contract_renounced: boolean;
    url: string;
  };
  decimals: number;
  locks: any[];
  name: string;
  symbol: string;
  totalSupply: string;
  creationBlock: any;
  creationTime: string;
  metrics: {
    circulatingSupply: number | null;
    maxSupply: number;
    totalSupply: number;
    holders: number;
    fdv: number;
  };
  banner: string;
  categories: any[];
  info: {
    blueCheckmark: any;
    cmc: string;
    coingecko: string;
    description: string;
    dextools: boolean;
    dextoolsUpdatedAt: any;
    email: string;
    extraInfo: string;
    nftCollection: string;
    ventures: boolean;
  };
  links: any;
  logo: string;
  reprPair: any;
}

export interface Pair {
  _id: string;
  id: {
    chain: string;
    exchange: string;
    pair: string;
    token: string;
    tokenRef: string;
  };
  creationBlock: number;
  creationTime: string;
  creationTransaction: string;
  dextScore: {
    information: number;
    holders: number;
    pool: number;
    transactions: number;
    creation: number;
    total: number;
  };
  firstSwapTimestamp?: string;
  locks: any[];
  metrics: {
    liquidity: number;
    txCount: number;
    balanceLpToken: number;
    initialLiquidity?: number;
    initialLiquidityUpdatedAt?: string;
    initialReserve?: number;
    initialReserveRef?: number;
    liquidityUpdatedAt?: string;
    reserve?: number;
    reserveRef?: number;
  };
  name: string;
  nameRef?: string;
  symbol: string;
  symbolRef?: string;
  team: {
    wallet: string;
  };
  type: string;
  periodStats: {
    "5m": PeriodStats;
    "6h": PeriodStats;
    "1h": PeriodStats;
    "24h": PeriodStats;
  };
}

export interface PeriodStats {
  volume: {
    total: number;
    buys: number;
    sells: number;
  };
  swaps: {
    total: number;
    buys: number;
    sells: number;
  };
  price: {
    usd: {
      first: number;
      last: number;
      min: number;
      max: number;
      diff: number;
    };
    chain: {
      first: number;
      last: number;
      min: number;
      max: number;
      diff: number;
    };
  };
  liquidity: {
    usd: {
      first: number;
      last: number;
      min: number;
      max: number;
      diff: number;
    };
  };
  makers: number;
  volatility?: number;
  updatedAt: string;
}

/**
 * Interface for the "mainToken" or "sideToken" data.
 */
export interface DexToolsToken {
  address: string;
  symbol: string;
  name: string;
}

/**
 * Interface for the pool description response (GET /v2/pool/{chain}/{address}).
 */
export interface DexToolsPoolDetails {
  exchangeName: string;
  exchangeFactory: string;
  creationTime: string; // ISO date string
  creationBlock: number;
  mainToken: DexToolsToken;
  sideToken: DexToolsToken;
  fee: number;
}

/**
 * Interface for the liquidity response (GET /v2/pool/{chain}/{address}/liquidity).
 */
export interface DexToolsPoolLiquidity {
  reserves: {
    mainToken: number;
    sideToken: number;
  };
  liquidity: number;
}

/**
 * Interface for the price response (GET /v2/pool/{chain}/{address}/price).
 * Здесь много полей, повторяющих похожие структуры, поэтому можно оставить так:
 */
export interface DexToolsPoolPrice {
  price: number;
  priceChain: number;
  price5m: number;
  priceChain5m: number;
  volume5m: number;
  sells5m: number;
  buys5m: number;
  sellVolume5m: number;
  buyVolume5m: number;
  variation5m: number;
  variationChain5m: number;
  price1h: number;
  priceChain1h: number;
  volume1h: number;
  sells1h: number;
  buys1h: number;
  sellVolume1h: number;
  buyVolume1h: number;
  variation1h: number;
  variationChain1h: number;
  price6h: number;
  priceChain6h: number;
  volume6h: number;
  sells6h: number;
  buys6h: number;
  sellVolume6h: number;
  buyVolume6h: number;
  variation6h: number;
  variationChain6h: number;
  price24h: number;
  priceChain24h: number;
  volume24h: number;
  sells24h: number;
  buys24h: number;
  sellVolume24h: number;
  buyVolume24h: number;
  variation24h: number;
  variationChain24h: number;
}

/**
 * Interface describing the base token information from the "results" array.
 */
export interface DexToolsTokenDetails {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  socialInfo: any; // Could be refined if the structure of socialInfo is known
  creationTime: string; // ISO date string
  creationBlock: number;
}

/**
 * Response structure for a paginated token list (GET /v2/token/{chain}).
 */
export interface DexToolsTokenListResponse {
  totalPages: number;
  page: number;
  pageSize: number;
  tokens: DexToolsTokenDetails[];
}

/**
 * Additional token financial info (GET /v2/token/{chain}/{address}/info).
 */
export interface DexToolsTokenFinancialInfo {
  circulatingSupply: number;
  totalSupply: number;
  mcap: number;
  fdv: number;
  holders: number;
  transactions: number;
}

/**
 * Interface for a single pool in the token's pools list.
 */
interface DexToolsPoolTokenPart {
  address: string;
  symbol: string;
  name: string;
}

/**
 * Interface for a single pool entry (GET /v2/token/{chain}/{address}/pools).
 */
export interface DexToolsTokenPool {
  exchangeName: string;
  exchangeFactory: string;
  creationTime: string;
  creationBlock: number;
  mainToken: DexToolsPoolTokenPart;
  sideToken: DexToolsPoolTokenPart;
  fee: number;
  address: string;
}

/**
 * Response structure for a paginated list of pools associated with the token.
 */
export interface DexToolsTokenPoolListResponse {
  totalPages: number;
  page: number;
  pageSize: number;
  results: DexToolsTokenPool[];
}

/**
 * Interface for token price data (GET /v2/token/{chain}/{address}/price).
 */
export interface DexToolsTokenPrice {
  price: number;
  priceChain: number;
  price5m: number;
  priceChain5m: number;
  variation5m: number;
  price1h: number;
  priceChain1h: number;
  variation1h: number;
  price6h: number;
  priceChain6h: number;
  variation6h: number;
  price24h: number;
  priceChain24h: number;
  variation24h: number;
}

/**
 * Interface for token score data (GET /v2/token/{chain}/{address}/score).
 */
export interface DexToolsTokenScore {
  dextScore: {
    information: number;
    pool: number;
    holders: number;
    transactions: number;
    creation: number;
    total: number;
  };
  votes: {
    upvotes: number;
    downvotes: number;
  };
}

/**
 * Interface for the score response (GET /v2/pool/{chain}/{address}/score).
 */
export interface DexToolsPoolScore {
  dextScore: {
    information: number;
    pool: number;
    holders: number;
    transactions: number;
    creation: number;
    total: number;
  };
  votes: {
    upvotes: number;
    downvotes: number;
  };
}

/**
 * Interface describing a single pool entry from ranking endpoints
 * such as "gainers", "losers", or "hotpools".
 */
export interface DexToolsRankingPool {
  exchange: {
    name: string;
    factory: string;
  }
  creationTime: string; // ISO date string
  creationBlock: number;
  mainToken: {
    address: string;
    symbol: string;
    name: string;
  };
  sideToken: {
    address: string;
    symbol: string;
    name: string;
  };
  fee: number;
  rank: number;
  price?: number;
  price24h?: number;
  variation24h?: number;
}

/**
 * Interface describing the DEX item in the "Exchange" endpoints response.
 */
export interface DexToolsExchangeItem {
  factory: string;
  name: string;
  website: string;
  pools: number;
  volume24h: number;
  swaps24h: number;
}

/**
 * Response structure for a paginated DEX list (GET /v2/dex/{chain}).
 */
export interface DexToolsExchangeListResponse {
  totalPages: number;
  page: number;
  pageSize: number;
  results: DexToolsExchangeItem[];
}
