import { EntityRepository, Repository } from 'typeorm';
import { Erc20 } from '../entities/erc20.entity';

@EntityRepository(Erc20)
export class Erc20Repository extends Repository<Erc20> {} 