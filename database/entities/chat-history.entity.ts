import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { Entity, Column, ManyToOne } from 'typeorm';

import { GptRoles } from 'modules/constants';

import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class ChatHistory extends BaseEntity {
  @ManyToOne(() => User, (user) => user.chatHistory, { onDelete: 'CASCADE', eager: true })
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
    example: GptRoles.USER,
    description: 'Role',
  })
  @IsEnum(GptRoles)
  role: GptRoles;

  @Column('jsonb')
  @ApiProperty({
    example: { messages: [] },
    description: 'Chat history in JSONB format',
  })
  message: Record<string, any>;

  @Column({ type: 'timestamptz' })
  savedAt: Date;
}
