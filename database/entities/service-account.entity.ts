import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Entity, Column } from 'typeorm';

import { BaseEntity } from './base.entity';

@Entity()
export class ServiceAccount extends BaseEntity {
  @Column({ unique: true })
  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'Public address',
  })
  @IsString()
  address: string;

  @Column()
  @ApiProperty({
    example: 'Encrypted key',
    description: 'Encrypted key',
  })
  @IsString()
  encryptedKey: string;
}
