import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Entity, Column, ManyToOne } from 'typeorm';

import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class Notification extends BaseEntity {
  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE', eager: true })
  user: User;

  @Column()
  @ApiProperty({
    example: 'userId',
    description: 'User ID',
  })
  @IsString()
  userId: string;

  @Column('json')
  @ApiProperty({
    example:
      '[{"transactionHash":"0x8f7f9ec9ce5560929611f1807bb4d6f94cfde0fd0188ce7b919d3f1c2eb6bbd7","logIndex":"59","contract":"0x0b2c639c533813f4aa9d7837caf62653d097ff85","triggered_by":["0x315dfefe2142636d4fd99a85533d81ff242a6d40","0x84c34a1cad9f47485f05d718c8215d472226f833"],"from":"0x315dfefe2142636d4fd99a85533d81ff242a6d40","to":"0x84c34a1cad9f47485f05d718c8215d472226f833","value":"5000","tokenName":"USD Coin","tokenSymbol":"USDC","tokenDecimals":"6","possibleSpam":false,"valueWithDecimals":"0.005"}]',
    description: 'Notification data',
  })
  data: any;
}
