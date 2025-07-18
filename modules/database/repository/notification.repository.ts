import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository extends BaseRepository<Notification> {
  constructor(
    @InjectRepository(Notification)
    repository: Repository<Notification>,
  ) {
    super(repository);
  }

  public async saveNotification(userId: string, data: string): Promise<Notification | null> {
    const newNotification = new Notification();
    newNotification.userId = userId;
    newNotification.data = data;
    return this.save(newNotification);
  }
} 