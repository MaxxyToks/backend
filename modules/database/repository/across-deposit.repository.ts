import { EntityRepository, Repository } from 'typeorm';
import { AcrossDeposit } from '../entities/across-deposit.entity';

@EntityRepository(AcrossDeposit)
export class AcrossDepositRepository extends Repository<AcrossDeposit> {} 