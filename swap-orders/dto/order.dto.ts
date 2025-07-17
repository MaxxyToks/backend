// src/orders/dto/create-order.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

import { ChainNames } from 'modules/blockchain/constants';

export enum OrderStatus {
  EXPIRED = 'Order expired',
  BREAKS = 'Price breaks threshold percentage',
  NORMAL = 'Price is within threshold percentage',
}

export class TokenMetadataDto {
  @ApiProperty({
    description: 'Token address',
    example: '0xBaseTokenAddress...',
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Token name',
    example: 'Sillybird',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Token symbol',
    example: 'SIB',
  })
  @IsString()
  symbol: string;
}

export class CreateOrderDto {

  @ApiProperty({
    example: 'orderId',
    description: 'Order ID',
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    example: 'userId',
    description: 'User ID',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    example: 'telegramId',
    description: 'Telegram ID',
  })
  @IsString()
  telegramId?: string;

  @ApiProperty({
    description: 'Chain name',
  })
  @IsString()
  chainName: ChainNames;

  @ApiProperty({
    description: 'Wallet address with which the user logged',
    example: '0x1234567890abcdef...',
  })
  @IsString()
  walletAddress: string;

  @ApiProperty({
    description: 'Dex name',
    example: 'raydium',
  })
  @IsString()
  dex: string;

  @ApiProperty({
    description: 'Base token metadata',
  })
  tokenIn: TokenMetadataDto;

  @ApiProperty({
    description: 'Quote token metadata',
  })
  tokenOut: TokenMetadataDto;

  @ApiProperty({
    description: 'Amount of the token',
    example: '100',
  })
  @IsString()
  amount: string;

  @IsString()
  buyPrice: string;

  @ApiProperty({
    description: 'Token pric snapshot when sell performed',
  })
  @IsString()
  sellPrice: string;

  @ApiProperty({
    description: 'Token price threshold',
  })
  @IsString()
  threshold: string;

  @ApiProperty({
    description: 'Timestamp of the order creation',
  })
  creationTimestamp: string;


  @ApiProperty({
    description: 'Expiration timestamp of the order',
  })
  expirationTimestamp: string;

  @IsBoolean()
  @ApiProperty({
    description: 'Whether the order is active',
  })
  isActive: boolean;
}

export interface OrderStatusDto {
  orderId: string;
  orderPrice: number;
  currentPrice: number;
  expectedPrice: number;
  change: number;
  tokenIn: string;
  tokenOut: string;
  amount: string;
  timestamp: string;
  status?: OrderStatus;
  expirationTimestamp?: string;
}

export interface PriceChangeDto {
  currentPrice: number;
  orderPrice: number;
  change: number;
  tokenIn: TokenMetadataDto;
  timestamp: string;
}

export class GroupedPnlDto {
  @ApiProperty({
    description: 'Time group label (for example, "2023 Q1", "2023-03", or "2023 W07")',
    example: '2023 Q1',
  })
  group: string;

  @ApiProperty({
    description: 'Realized profit and loss for this group',
    example: 100.0,
  })
  realizedPnl: string;

  @ApiProperty({
    description: 'Unrealized profit and loss for this group',
    example: 50.0,
  })
  unrealizedPnl: string;

  @ApiProperty({
    description: 'Total profit and loss for this group',
    example: 150.0,
  })
  totalPnl: string;
}

export class UserGroupedPnlDto {
  @ApiProperty({
    description: 'Token metadata for which the PnL is calculated',
  })
  token: TokenMetadataDto;

  @ApiProperty({
    description: 'Array of grouped PnL results',
    type: [GroupedPnlDto],
  })
  groupedPnl: GroupedPnlDto[];
}