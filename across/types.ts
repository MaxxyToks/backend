export interface AcrossSuggestedFeesResponse {
  totalRelayFee: {
    pct: string;
    total: string;
  };
  relayerCapitalFee: {
    pct: string;
    total: string;
  };
  relayerGasFee: {
    pct: string;
    total: string;
  };
  lpFee: {
    pct: string;
    total: string;
  };
  timestamp: string;
  isAmountTooLow: boolean;
  quoteBlock: string;
  spokePoolAddress: string;
  exclusiveRelayer: string;
  exclusivityDeadline: string;
  expectedFillTimeSec: string;
  limits: {
    minDeposit: number;
    maxDeposit: number;
    maxDepositInstant: number;
    maxDepositShortDelay: number;
    recommendedDepositInstant: number;
  };
}

export interface AcrossRoute {
  originChainId: number;
  originToken: string;
  destinationChainId: number;
  destinationToken: string;
  originTokenSymbol: string;
  destinationTokenSymbol: string;
  isNative: boolean;
}
