import { ChainNames, ChainType } from 'modules/blockchain/constants';

export interface SettingsIface {
  env: {
    isTest: boolean;
    isLocal: boolean;
    isDev: boolean;
    isProd: boolean;
  };
  app: {
    nodeEnv: string;
    appPort: number;
    appUrl: string;
    swaggerPrefix: string;
    corsOrigins: string[];
    url: string;
  };
  database: {
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
    rejectUnauthorized: boolean;
  };
  blockchain: {
    mode: ChainType;
    chains: {
      [key in ChainNames]: {
        rpcUrl: string;
        blockExplorerUrl: string;
      };
    };
  };
  keys: {
    jwtSecret: string;
    openaiApiKey: string;
    deepSeekApiKey?: string;
    telegramBotToken: string;
    qdrantApiKey?: string;
    dexTools: string;
  };
  kms: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    keyId: string;
  };
  across: {
    apiUrl: string;
  };
  redis: {
    host: string;
    port: number | undefined;
    password: string;
    url: string;
  };
  gpt: {
    model: string;
    historyMessages: number;
  };
  logger: {
    noColor: boolean;
  };
  oneinch: {
    apiUrl: string;
    apiKey: string;
  };
  qdrant: {
    url?: string;
  };
  moralis: {
    apiKey: string;
  };
  alchemy: {
    apiKey: string;
  };
  helius: {
    apiKey: string;
  };
  dextools: {
    url: string;
  };
  solana: {
    rpc: string;
  };
  feeConfig: {
    swapFee: string;
    transferFee: string;
    bridgeFee: string;
    evmTreasury: string;
    solanaTreasury: string;
  };
}
