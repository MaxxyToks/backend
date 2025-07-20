import { Entity, Column, OneToOne } from 'typeorm';

import { Account } from '../../database/entities/account.entity';
import { BaseEntity } from '../../database/entities/base.entity';

@Entity()
export class AccountSettings extends BaseEntity {
  @OneToOne(() => Account, (account) => account.settings)
  account: Account;

  @Column({ default: 100 })
  ethereum_slippage: number;

  @Column({ default: 100 })
  arbitrum_slippage: number;

  @Column({ default: 100 })
  base_slippage: number;

  @Column({ default: 100 })
  optimism_slippage: number;

  @Column({ default: 100 })
  zksync_slippage: number;

  @Column({ default: 100 })
  polygon_slippage: number;

  @Column({ default: 100 })
  scroll_slippage: number;

  @Column({ default: 100 })
  gnosis_slippage: number;

  @Column({ default: 100 })
  bsc_slippage: number;

  @Column({ default: 100 })
  avalanche_slippage: number;

  @Column({ default: 100 })
  fantom_slippage: number;

  @Column({ default: 100 })
  aurora_slippage: number;

  @Column({ default: 100 })
  solana_slippage: number;
} 