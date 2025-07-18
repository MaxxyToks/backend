import { ApiProperty } from '@nestjs/swagger';

export class SwapResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  transactionHash?: string;

  @ApiProperty()
  error?: string;

  @ApiProperty()
  estimatedGas?: string;

  @ApiProperty()
  gasPrice?: string;

  @ApiProperty()
  chainName: string;

  @ApiProperty()
  fromToken: string;

  @ApiProperty()
  toToken: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  estimatedOutput?: string;
}

export class BasicBlockchainResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data?: any;

  @ApiProperty()
  error?: string;

  @ApiProperty()
  transactionHash?: string;

  @ApiProperty()
  chainName?: string;
}

export class BalanceResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  balance?: string;

  @ApiProperty()
  symbol?: string;

  @ApiProperty()
  decimals?: number;

  @ApiProperty()
  address: string;

  @ApiProperty()
  chainName: string;

  @ApiProperty()
  error?: string;
}

export class TransactionStatusResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  status?: string;

  @ApiProperty()
  confirmations?: number;

  @ApiProperty()
  blockNumber?: number;

  @ApiProperty()
  transactionHash: string;

  @ApiProperty()
  chainName: string;

  @ApiProperty()
  error?: string;
}

export class GasEstimateResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  gasEstimate?: string;

  @ApiProperty()
  gasPrice?: string;

  @ApiProperty()
  totalCost?: string;

  @ApiProperty()
  chainName: string;

  @ApiProperty()
  error?: string;
}

export class WalletResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  address?: string;

  @ApiProperty()
  chainName?: string;

  @ApiProperty()
  alias?: string;

  @ApiProperty()
  error?: string;
} 