import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from '../database/entities/notification.entity';
import { NotificationRepository } from '../database/repository/notification.repository';
import { UserModule } from '../user/user.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    UserModule,
    DatabaseModule,
  ],
  providers: [NotificationsService, NotificationRepository],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {} 