import { EntityRepository, Repository } from 'typeorm';
import { Observation } from '../entities/observation.entity';

@EntityRepository(Observation)
export class ObservationRepository extends Repository<Observation> {} 