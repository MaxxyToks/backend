import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Column, Entity } from 'typeorm';

import { ChainNames } from 'modules/blockchain/constants';

import { BaseEntity } from './base.entity';

@Entity()
export class AcrossDeposit extends BaseEntity {
  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'Origin spoke contract',
  })
  @IsString()
  @Column()
  originSpokeContract: string;

  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'Public address',
  })
  @IsString()
  @Column()
  fromAddress: string;

  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'Public address',
  })
  @IsString()
  @Column()
  toAddress: string;

  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'Input token',
  })
  @IsString()
  @Column()
  inputToken: string;

  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'Output token',
  })
  @IsString()
  @Column()
  outputToken: string;

  @ApiProperty({
    example: '1000000000000000000',
    description: 'Input amount',
  })
  @IsString()
  @Column()
  inputAmount: string;

  @ApiPropertyOptional({
    example: '1000000000000000000',
    description: 'Output amount',
  })
  @IsString()
  @IsOptional()
  @Column({ nullable: true })
  outputAmount?: string;

  @ApiProperty({
    example: 'ETH',
    description: 'Origin chain name',
  })
  @IsString()
  @Column()
  originChainName: ChainNames;

  @ApiProperty({
    example: 'ETH',
    description: 'Destination chain name',
  })
  @IsString()
  @Column()
  destinationChainName: ChainNames;

  @ApiProperty({
    example: 1,
    description: 'Origin chain id',
  })
  @IsNumber()
  @Column()
  originalChainId: number;

  @ApiProperty({
    example: 1,
    description: 'Destination chain id',
  })
  @IsNumber()
  @Column()
  destinationChainId: number;

  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'Deposit transaction hash',
  })
  @IsString()
  @Column()
  depositTx: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Deposit id',
  })
  @IsNumber()
  @IsOptional()
  @Column({ nullable: true })
  depositId?: number;

  @ApiPropertyOptional({
    example: '0x1234567890',
    description: 'Deposit fill tx',
  })
  @IsString()
  @IsOptional()
  @Column({ nullable: true })
  depositFillTx?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Is deposit completed',
  })
  @IsBoolean()
  @IsOptional()
  @Column({ nullable: true })
  isDepositCompleted?: boolean;
}
