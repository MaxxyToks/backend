import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

import { AccountSettings } from '../../database/entities/account-settings.entity';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../database/entities/user.entity';

@Entity()
export class Account extends BaseEntity {
  @ManyToOne(() => User, (user) => user.accounts, { onDelete: 'CASCADE', eager: true })
  user: User;

  @OneToOne(() => AccountSettings, (settings) => settings.account, { onDelete: 'CASCADE', eager: true })
  @JoinColumn()
  settings: AccountSettings;

  @Column()
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

  @Column()
  @ApiProperty({
    example: 'true',
    description: 'Notifications enabled',
  })
  @IsString()
  notificationsEnabled: string;

  @ApiProperty({
    example: 'Alias',
    description: 'Alias',
  })
  @IsString()
  @Column({ nullable: true })
  alias: string;

  @Column({ nullable: true })
  polymarketApiKeyObject: string;
} 