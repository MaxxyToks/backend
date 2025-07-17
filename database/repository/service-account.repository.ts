import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SettingsService } from 'modules/settings/settings.service';

import { BaseRepository } from './base.repository';
import { ServiceAccount } from '../entities/service-account.entity';

@Injectable()
export class ServiceAccountRepository extends BaseRepository<ServiceAccount> {
  constructor(
    @InjectRepository(ServiceAccount)
    repository: Repository<ServiceAccount>,
    private readonly settingsService: SettingsService,
  ) {
    super(repository);
  }

  async getEncryptedServiceKey(): Promise<string> {
    const serviceAccount = await this.findOne({ where: {} });
    if (!serviceAccount) {
      throw new Error('Service account not found');
    }

    return serviceAccount.encryptedKey;
  }
}
