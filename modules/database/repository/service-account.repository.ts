import { EntityRepository, Repository } from 'typeorm';
import { ServiceAccount } from '../entities/service-account.entity';

@EntityRepository(ServiceAccount)
export class ServiceAccountRepository extends Repository<ServiceAccount> {} 