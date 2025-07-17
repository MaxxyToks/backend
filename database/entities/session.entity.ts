import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsString } from 'class-validator';
import { Entity, Column, ManyToOne } from 'typeorm';

import { BaseEntity } from './base.entity';
import { User } from './user.entity';
@Entity()
export class Session extends BaseEntity {
  @Column()
  @ApiProperty({
    example: 'qwe.asd.zxc',
    description: 'user jwt token',
  })
  @IsString()
  jwtToken: string;

  @Column()
  @ApiProperty({
    example: 'qwe.asd.zxc',
    description: 'user refresh token',
  })
  @IsString()
  refreshToken: string;

  @Column()
  @ApiProperty({
    example: '2021-01-01T00:00:00.000Z',
    description: 'expiration date of the session',
  })
  @IsDate()
  expirationDate: Date;

  // Relation to User entity
  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  user: User;
}
