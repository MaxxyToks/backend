import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';
import { AccountSettings } from '../entities/account-settings.entity';

@Injectable()
export class AccountSettingsRepository extends BaseRepository<AccountSettings> {
  constructor(
    @InjectRepository(AccountSettings)
    repository: Repository<AccountSettings>,
  ) {
    super(repository);
  }
}
