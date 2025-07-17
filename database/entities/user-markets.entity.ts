import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Column, Entity } from 'typeorm';

import { BaseEntity } from './base.entity';

@Entity()
export class UserMarkets extends BaseEntity {
  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'User address',
  })
  @IsString()
  @Column()
  address: string;

  @ApiProperty({
    example: '0x7e3edb566cb4dfdfb1cb682c9af88b7535cb6260b981168630ef34cfa2cc2e25',
    description: 'Market ID',
  })
  @IsString()
  @Column()
  marketId: string;
}
