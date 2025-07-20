import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsString } from 'class-validator';
import { Column, Entity, ManyToOne } from 'typeorm';

import { ChainNames } from '../../blockchain/constants';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../database/entities/user.entity';

export class TokenMetadata {
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

@Entity()
export class SwapOrder extends BaseEntity {
  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE', eager: true })
  user: User;

  @Column()
  @ApiProperty({
    example: 'orderId',
    description: 'Order ID',
  })
  @IsString()
  orderId: string;

  @Column()
  @ApiProperty({
    example: 'userId',
    description: 'User ID',
  })
  @IsString()
  userId: string;

  @Column({ nullable: true })
  @ApiProperty({
    example: 'telegramId',
    description: 'Telegram ID',
  })
  @IsString()
  telegramId?: string;

  @Column()
  @ApiProperty({
    description: 'Chain name',
  })
  @IsString()
  chainName: ChainNames;

  @Column()
  @ApiProperty({
    description: 'Wallet address with which the user logged',
    example: '0x1234567890abcdef...',
  })
  @IsString()
  walletAddress: string;

  @Column()
  @ApiProperty({
    description: 'Dex name',
    example: 'raydium',
  })
  @IsString()
  dex: string;

  @Column({ type: 'jsonb', nullable: false })
  @ApiProperty({
    description: 'Base token metadata',
  })
  tokenIn: TokenMetadata;

  @Column({ type: 'jsonb', nullable: false })
  @ApiProperty({
    description: 'Quote token metadata',
  })
  tokenOut: TokenMetadata;

  @Column()
  @ApiProperty({
    description: 'Amount of the token',
    example: '100',
  })
  @IsString()
  amount: string;

  @Column()
  @IsString()
  buyPrice: string;

  @Column()
  @ApiProperty({
    description: 'Token price USD snapshot when sell performed',
  })
  @IsString()
  sellPrice: string;

  @Column()
  @ApiProperty({
    description: 'Token price USD lower threshold',
  })
  @IsString()
  threshold: string;

  @Column()
  @ApiProperty({
    description: 'Timestamp of the order creation',
  })
  @IsDate()
  creationTimestamp: string;

  @Column()
  @ApiProperty({
    description: 'Expiration timestamp of the order',
  })
  @IsDate()
  expirationTimestamp: string;

  @Column()
  @IsBoolean()
  @ApiProperty({
    description: 'Whether the order is active',
  })
  isActive: boolean;
} 