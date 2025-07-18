import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class IncomingTransferNotificationDto {
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
  amount: string;

  @ApiProperty()
  @IsString()
  tokenSymbol: string;

  @ApiProperty()
  @IsString()
  tokenAddress: string;

  @ApiProperty()
  @IsString()
  transactionHash: string;

  @ApiProperty()
  @IsString()
  chainName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  blockNumber?: string;
}

export class CloseOrderNotificationDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsString()
  orderType: string; // 'swap' | 'limit' | 'dca'

  @ApiProperty()
  @IsString()
  status: string; // 'completed' | 'failed' | 'cancelled'

  @ApiProperty()
  @IsString()
  fromToken: string;

  @ApiProperty()
  @IsString()
  toToken: string;

  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty()
  @IsString()
  chainName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transactionHash?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  error?: string;
}

export class DcaBuyDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  dcaId: string;

  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty()
  @IsString()
  tokenIn: string;

  @ApiProperty()
  @IsString()
  tokenOut: string;

  @ApiProperty()
  @IsString()
  chainName: string;

  @ApiProperty()
  @IsString()
  transactionHash: string;

  @ApiProperty()
  @IsNumber()
  executionCount: number;
}

export class PriceAlertNotificationDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  tokenSymbol: string;

  @ApiProperty()
  @IsString()
  tokenAddress: string;

  @ApiProperty()
  @IsString()
  currentPrice: string;

  @ApiProperty()
  @IsString()
  targetPrice: string;

  @ApiProperty()
  @IsString()
  alertType: string; // 'above' | 'below'

  @ApiProperty()
  @IsString()
  chainName: string;
}

export class SystemNotificationDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsString()
  type: string; // 'info' | 'warning' | 'error' | 'success'

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  persistent?: boolean;
} 