import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Column, Entity } from 'typeorm';

import { ChainNames } from '../../modules/blockchain/constants';

import { BaseEntity } from './base.entity';
import { TokenMetadata } from './swap-order.entity';

@Entity()
export class DcaSubscription extends BaseEntity {
    @ApiProperty({
        example: 'Ethereum',
        description: 'Chain name',
    })
    @IsString()
    @Column()
    chainName: ChainNames;

    @ApiProperty({
        example: 'user123',
        description: 'User ID',
    })
    @IsString()
    @Column()
    userId: string;

    @ApiProperty({
        description: 'Subscription ID',
    })
    @IsString()
    @Column()
    dcaKey: string;

    @ApiProperty({
        example: '0x1234567890123456789012345678901234567890',
        description: 'User Address',
    })
    @IsString()
    @Column()
    userAddress: string;

    @ApiProperty({
        example: 'Uniswap V3',
        description: 'Dex Name',
    })
    @IsString()
    @Column()
    dex: string;

    @Column({ type: 'jsonb', nullable: false })
    @ApiProperty({
        description: 'Base token metadata',
    })
    tokenIn: TokenMetadata;


    @Column({ type: 'jsonb', nullable: false })
    @ApiProperty({
        description: 'Quote token metadata',
    })
    tokenOut: TokenMetadata;

    @ApiProperty({
        example: '100',
        description: 'Amount',
    })
    @IsString()
    @Column()
    amount: string;

    @Column()
    @ApiProperty({
        description: 'Next trigger timestamp of the order',
    })
    cycles: string;

    @ApiProperty({
        example: '10',
        description: 'Amount Per Cycle',
    })
    @IsString()
    @Column()
    amountPerCycle: string;

    @ApiProperty({
        example: '7d',
        description: 'Cycle Interval',
    })
    @IsString()
    @Column()
    cycleInterval: string;

    @Column()
    @ApiProperty({
        description: 'Last trigger timestamp of the order',
    })
    lastTriggerTimestamp: string;


    @ApiProperty({
        description: 'Cycles left',
    })
    @IsString()
    @Column()
    cyclesLeft: string;

    @ApiProperty({
        description: 'Amount left',
    })
    @IsString()
    @Column()
    amountLeft: string;
}