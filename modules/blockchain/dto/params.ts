import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteSwapDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  userAddress: string;

  @ApiProperty()
  @IsString()
  tokenSymbolFrom: string;

  @ApiProperty()
  @IsString()
  tokenSymbolTo: string;

  @ApiProperty()
  @IsString()
  amountIn: string;

  @ApiProperty()
  @IsString()
  amountOutMinimum: string;

  @ApiProperty()
  @IsString()
  chainName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slippage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deadline?: string;
}

export class ExecuteLimitOrderDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  userAddress: string;

  @ApiProperty()
  @IsString()
  tokenSymbolFrom: string;

  @ApiProperty()
  @IsString()
  tokenSymbolTo: string;

  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty()
  @IsString()
  threshold: string;

  @ApiProperty()
  @IsString()
  chainName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expiration?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  fillOrKill?: boolean;
}

export class TransferTokenDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  fromAddress: string;

  @ApiProperty()
  @IsString()
  toAddress: string;

  @ApiProperty()
  @IsString()
  tokenAddress: string;

  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty()
  @IsString()
  chainName: string;
}

export class GetBalanceDto {
  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  chainName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tokenAddress?: string;
}

export class EstimateGasDto {
  @ApiProperty()
  @IsString()
  from: string;

  @ApiProperty()
  @IsString()
  to: string;

  @ApiProperty()
  @IsString()
  value: string;

  @ApiProperty()
  @IsString()
  data: string;

  @ApiProperty()
  @IsString()
  chainName: string;
}

export class CreateWalletDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  chainName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alias?: string;
} 