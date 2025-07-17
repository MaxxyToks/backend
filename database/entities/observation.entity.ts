import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Column, Entity, ManyToOne } from 'typeorm';

import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class Observation extends BaseEntity {
  @ManyToOne(() => User, (user) => user.observations, {
    onDelete: 'CASCADE',
    eager: true,
  })
  user: User;

  @Column()
  @ApiProperty({
    example: 'userId',
    description: 'User ID',
  })
  @IsString()
  userId: string;

  @Column()
  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'User Address',
  })
  @IsString()
  observedAddress: string;

  @Column()
  @ApiProperty({
    example: 'USDC',
    description: 'Token Symbol',
  })
  @IsString()
  tokenSymbol: string;

  @Column()
  @ApiProperty({
    example: 'Ethereum',
    description: 'Chain Name',
  })
  @IsString()
  chainName: string;
}
