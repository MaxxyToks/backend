import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Column, Entity, OneToMany } from 'typeorm';

import { Account } from './account.entity';
import { BaseEntity } from './base.entity';
import { ChatHistory } from './chat-history.entity';
import { Notification } from './notification.entity';
import { Observation } from './observation.entity';
import { Session } from './session.entity';
import { SwapOrder } from './swap-order.entity';
import { UserChannel } from './user-channel.entity';

@Entity()
export class User extends BaseEntity {
  @OneToMany(() => Account, (account) => account.user, { cascade: true, onDelete: 'CASCADE' })
  accounts: Account[];

  @OneToMany(() => Notification, (notification) => notification.user, { cascade: true, onDelete: 'CASCADE' })
  notifications: Notification[];

  @OneToMany(() => Observation, (observation) => observation.user, { cascade: true, onDelete: 'CASCADE' })
  observations: Observation[];

  @OneToMany(() => ChatHistory, (chatHistory) => chatHistory.user)
  chatHistory: ChatHistory[];

  @OneToMany(() => SwapOrder, (order) => order.user)
  orders: SwapOrder[];

  @OneToMany(() => UserChannel, (channel) => channel.user, { cascade: true, onDelete: 'CASCADE' })
  channels: UserChannel[];

  @Column({ nullable: true })
  @ApiPropertyOptional({
    example: '0x1234567890',
    description: 'Wallet address with which the user logged',
  })
  @IsString()
  @IsOptional()
  walletAddress?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Telegram ID',
  })
  @IsString()
  @IsOptional()
  telegramID?: string;

  @Column({ nullable: true })
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'user dynamic email',
  })
  @IsString()
  @IsOptional()
  email?: string;

  @OneToMany(() => Session, (session) => session.user, { cascade: true, onDelete: 'CASCADE' })
  sessions: Session[];
}
