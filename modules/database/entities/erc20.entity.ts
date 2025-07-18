import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('erc20')
export class Erc20 {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  address: string;

  @Column()
  symbol: string;

  @Column()
  decimals: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  chainId: number;
} 