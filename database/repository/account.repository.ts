import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ChainNames } from '../../modules/blockchain/constants';

import { AccountSettings } from '../entities/account-settings.entity';
import { Account } from '../entities/account.entity';
import { AccountSettingsRepository } from './account-settings.repository';
import { BaseRepository } from './base.repository';

@Injectable()
export class AccountRepository extends BaseRepository<Account> {
  constructor(
    @InjectRepository(Account)
    repository: Repository<Account>,
    private readonly accountSettingsRepository: AccountSettingsRepository,
  ) {
    super(repository);
  }

  public async findByIds(ids: string[]): Promise<Account[]> {
    return this.find({ where: { id: In(ids) } });
  }

  public async getAccountByAddress(address: string): Promise<Account | null> {
    return this.findOne({ where: { address: address.toLowerCase() } });
  }

  public async saveAccountIfNotExists(address: string, encryptedKey: string): Promise<Account | null> {
    const existingAccount = await this.getAccountByAddress(address);
    if (existingAccount) {
      return null;
    }
    const newAccount = new Account();
    newAccount.address = address.toLowerCase();
    newAccount.encryptedKey = encryptedKey;
    return this.save(newAccount);
  }

  public async getAllAddresses(): Promise<string[]> {
    const accounts = await this.find({ select: ['address'] });

    return accounts.map((account) => account.address);
  }

  // ========= Account Settings helpers
  async getAccountSettings(userId: string, userAddress: string): Promise<AccountSettings | null> {
    // Get real user address. Lowercase it if its EVM address.
    const realUserAddress = userAddress.startsWith('0x') ? userAddress.toLowerCase() : userAddress;

    const accountWithSettings = await this.findOne({
      where: { address: realUserAddress, user: { id: userId } },
      relations: ['user', 'settings'],
    });

    if (!accountWithSettings) {
      throw new Error('Account not found');
    }

    if (!accountWithSettings.settings) {
      // Create new settings for this account.
      const newSettings = new AccountSettings();
      newSettings.account = accountWithSettings;
      await this.accountSettingsRepository.save(newSettings);
      return newSettings;
    }

    return accountWithSettings.settings;
  }

  async getSlippageForChain(userId: string, userAddress: string, chain: ChainNames): Promise<number> {
    const settings = await this.getAccountSettings(userId, userAddress);
    if (!settings) {
      throw new Error('Account settings not found');
    }

    const result = settings[`${chain}_slippage`];
    if (!result) {
      throw new Error(`Slippage for chain ${chain} not found`);
    }
    return result;
  }

  async saveSlippageForChain(userId: string, userAddress: string, chain: ChainNames, slippage: number): Promise<void> {
    const settings = await this.getAccountSettings(userId, userAddress);
    if (!settings) {
      throw new Error('Account settings not found');
    }
    settings[`${chain}_slippage`] = slippage;
    await this.accountSettingsRepository.save(settings);
  }
}
