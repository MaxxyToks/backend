import { IsDate, IsString } from 'class-validator';
import { Entity, Column, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
@Unique(['userAddress', 'channelAddress'])
export class UserChannel extends BaseEntity {
  @ManyToOne(() => User, (user) => user.channels, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  @IsString()
  userAddress: string;

  @Column()
  @IsString()
  channelAddress: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsDate()
  lastSeenAt: Date;
}
