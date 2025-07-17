import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';
import { Account } from '../entities/account.entity';
import { UserChannel } from '../entities/user-channel.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class UserChannelRepository extends BaseRepository<UserChannel> {
  constructor(
    @InjectRepository(UserChannel)
    repository: Repository<UserChannel>,
  ) {
    super(repository);
  }

  public async createNewUserChannel(account: Account, channelAddress: string): Promise<UserChannel> {
    const userChannel = new UserChannel();
    userChannel.user = account.user;
    userChannel.userAddress = account.address;
    userChannel.channelAddress = channelAddress;
    return this.save(userChannel);
  }

  public async setLastSeenNotification(userChannel: UserChannel): Promise<void> {
    userChannel.lastSeenAt = new Date();
    await this.save(userChannel);
  }

  public async getAllUserChannelsWithAccounts(): Promise<[UserChannel[], number]> {
    return this.findAndCount({ relations: ['user'] });
  }

  public async getUserChannels(user: User): Promise<UserChannel[]> {
    return this.find({ where: { user } });
  }

  public async getUserChannel(user: User, channelAddress: string): Promise<UserChannel | null> {
    return this.findOne({ where: { user, channelAddress } });
  }
}
