import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
import { Column, Entity } from 'typeorm';

import { ChainNames } from '../../modules/blockchain/constants';

import { BaseEntity } from './base.entity';

@Entity()
export class Erc20 extends BaseEntity {
  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'Address',
  })
  @IsString()
  @Column()
  address: string;

  @ApiProperty({
    example: 'Wrapped Ether',
    description: 'Name',
  })
  @IsString()
  @Column()
  name: string;

  @ApiProperty({
    example: 'WETH',
    description: 'Symbol',
  })
  @IsString()
  @Column()
  symbol: string;

  @ApiProperty({
    example: 18,
    description: 'Decimals',
  })
  @IsNumber()
  @Column()
  decimals: number;

  @ApiProperty({
    example: 'Ethereum',
    description: 'Chain name',
  })
  @IsString()
  @Column()
  chainName: ChainNames;

  @ApiProperty({
    example: 1,
    description: 'Chain ID',
  })
  @IsNumber()
  @Column()
  chainId: number;

  @ApiProperty({
    example: true,
    description: 'Is verified',
  })
  @IsBoolean()
  @Column({ nullable: true })
  verified: boolean;
}
