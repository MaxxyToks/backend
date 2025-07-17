import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Account } from '../entities/account.entity';
import { User } from '../entities/user.entity';
import { AccountRepository } from './account.repository';
import { BaseRepository } from './base.repository';

interface CreateNewUserParams {
  telegramId?: string;
  email?: string;
  walletAddress?: string;
}

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
    private readonly accountRepository: AccountRepository,
  ) {
    super(repository);
  }

  public async createOrGetUserByAddress(address: string): Promise<User> {
    const user = await this.findOne({ where: { walletAddress: address } });
    if (!user) {
      return await this.createNewUser({ walletAddress: address });
    }
    return user;
  }

  public async createNewUser(params?: CreateNewUserParams): Promise<User> {
    const user = new User();
    if (params?.telegramId) {
      user.telegramID = params.telegramId;
    }
    if (params?.email) {
      user.email = params.email;
    }
    if (params?.walletAddress) {
      user.walletAddress = params.walletAddress;
    }
    return await this.save(user);
  }

  public async getUserById(userId: string): Promise<User | null> {
    return this.findOne({ where: { id: userId } });
  }

  public async getUserIdByAddress(address: string): Promise<string | null> {
    const user = await this.findOne({ where: { walletAddress: address.toLowerCase() } });
    if (!user) {
      return null;
    }
    return user.id;
  }

  public async getUserByTelegramId(telegramId: string): Promise<User | null> {
    return this.findOne({ where: { telegramID: telegramId } });
  }

  public async getUserAccount(userId: string, address: string): Promise<Account> {
    const user = await this.findOne({ where: { id: userId }, relations: ['accounts'] });
    const account = user?.accounts.find((account) => account.address.toLowerCase() == address.toLowerCase());

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  public async getUserEncryptedPolymarketApiKey(userId: string, address: string): Promise<string | null> {
    const user = await this.findOne({ where: { id: userId }, relations: ['accounts'] });
    const account = user?.accounts.find((account) => account.address === address.toLowerCase());
    if (!account) {
      throw new Error('Account not found');
    }
    if (!account.polymarketApiKeyObject) {
      return null;
    }
    return account.polymarketApiKeyObject;
  }

  public async saveUserEncryptedPolymarketApiKey(userId: string, address: string, creds: string): Promise<void> {
    const user = await this.findOne({ where: { id: userId }, relations: ['accounts'] });
    const account = user?.accounts.find((account) => account.address === address.toLowerCase());
    if (!account) {
      throw new Error('Account not found');
    }
    account.polymarketApiKeyObject = creds;
    await this.accountRepository.save(account);
  }
}
