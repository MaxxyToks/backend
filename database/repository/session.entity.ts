import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';
import { Session } from '../entities/session.entity';

@Injectable()
export class SessionRepository extends BaseRepository<Session> {
  constructor(
    @InjectRepository(Session)
    repository: Repository<Session>,
  ) {
    super(repository);
  }
}
