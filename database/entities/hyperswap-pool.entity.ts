import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'pools' })
export class Pool {
  @PrimaryColumn()
  pairAddress: string;

  @Column()
  token0Address: string;

  @Column()
  token0Name: string;

  @Column()
  token0Symbol: string;

  @Column({ type: 'int', nullable: true })
  token0Decimals: number;

  @Column()
  token1Address: string;

  @Column()
  token1Name: string;

  @Column()
  token1Symbol: string;

  @Column({ type: 'int', nullable: true })
  token1Decimals: number;

  // Reserves are stored as string to maintain precision
  @Column({ type: 'varchar', length: 255 })
  reserve0: string;

  @Column({ type: 'varchar', length: 255 })
  reserve1: string;

  @Column()
  version: string;

  @Column({ type: 'int' })
  fee: number;

  @Column()
  display: boolean;
}
