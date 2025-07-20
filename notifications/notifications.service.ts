import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationRepository } from '../database/repository/notification.repository';
import { UserService } from '../modules/user/user.service';
import { Notification } from '../database/entities/notification.entity';
import { User } from '../database/entities/user.entity';
import { 
  IncomingTransferNotificationDto,
  CloseOrderNotificationDto,
  DcaBuyDto,
  PriceAlertNotificationDto,
  SystemNotificationDto
} from '../modules/notifications/dto/notifications.dto';

export interface NotificationResponseDto {
  id: string;
  userId: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationListResponseDto {
  notifications: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateNotificationDto {
  userId: string;
  data: any;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly userService: UserService,
  ) {}

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<NotificationResponseDto> {
    // Verify user exists
    await this.userService.getUserById(createNotificationDto.userId);

    const notification = await this.notificationRepository.saveNotification(
      createNotificationDto.userId,
      JSON.stringify(createNotificationDto.data)
    );

    if (!notification) {
      throw new BadRequestException('Failed to create notification');
    }

    return {
      id: notification.id,
      userId: notification.userId,
      data: notification.data,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  async createIncomingTransferNotification(dto: IncomingTransferNotificationDto): Promise<NotificationResponseDto> {
    return await this.createNotification({
      userId: dto.userId,
      data: {
        type: 'incoming_transfer',
        fromAddress: dto.fromAddress,
        toAddress: dto.toAddress,
        amount: dto.amount,
        tokenSymbol: dto.tokenSymbol,
        tokenAddress: dto.tokenAddress,
        transactionHash: dto.transactionHash,
        chainName: dto.chainName,
        blockNumber: dto.blockNumber,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async createCloseOrderNotification(dto: CloseOrderNotificationDto): Promise<NotificationResponseDto> {
    return await this.createNotification({
      userId: dto.userId,
      data: {
        type: 'close_order',
        orderId: dto.orderId,
        orderType: dto.orderType,
        status: dto.status,
        fromToken: dto.fromToken,
        toToken: dto.toToken,
        amount: dto.amount,
        chainName: dto.chainName,
        transactionHash: dto.transactionHash,
        error: dto.error,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async createDcaBuyNotification(dto: DcaBuyDto): Promise<NotificationResponseDto> {
    return await this.createNotification({
      userId: dto.userId,
      data: {
        type: 'dca_buy',
        dcaId: dto.dcaId,
        amount: dto.amount,
        tokenIn: dto.tokenIn,
        tokenOut: dto.tokenOut,
        chainName: dto.chainName,
        transactionHash: dto.transactionHash,
        executionCount: dto.executionCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async createPriceAlertNotification(dto: PriceAlertNotificationDto): Promise<NotificationResponseDto> {
    return await this.createNotification({
      userId: dto.userId,
      data: {
        type: 'price_alert',
        tokenSymbol: dto.tokenSymbol,
        tokenAddress: dto.tokenAddress,
        currentPrice: dto.currentPrice,
        targetPrice: dto.targetPrice,
        alertType: dto.alertType,
        chainName: dto.chainName,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async createSystemNotification(dto: SystemNotificationDto): Promise<NotificationResponseDto> {
    return await this.createNotification({
      userId: dto.userId,
      data: {
        type: 'system',
        title: dto.title,
        message: dto.message,
        notificationType: dto.type,
        actionUrl: dto.actionUrl,
        persistent: dto.persistent || false,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: string,
  ): Promise<NotificationListResponseDto> {
    // Verify user exists
    await this.userService.getUserById(userId);

    const skip = (page - 1) * limit;
    
    const query = this.notificationRepository.createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (type) {
      query.andWhere("notification.data::jsonb->>'type' = :type", { type });
    }

    const [notifications, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      notifications: notifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        data: notification.data,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  async getNotificationById(notificationId: string, userId: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return {
      id: notification.id,
      userId: notification.userId,
      data: notification.data,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.remove(notification);
  }

  async deleteAllUserNotifications(userId: string): Promise<void> {
    // Verify user exists
    await this.userService.getUserById(userId);

    const notifications = await this.notificationRepository.find({
      where: { userId },
    });

    if (notifications.length > 0) {
      await this.notificationRepository.remove(notifications);
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Update the notification data to mark it as read
    const data = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : notification.data;
    
    data.read = true;
    data.readAt = new Date().toISOString();

    notification.data = data;
    await this.notificationRepository.save(notification);

    return {
      id: notification.id,
      userId: notification.userId,
      data: notification.data,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    // Verify user exists
    await this.userService.getUserById(userId);

    const count = await this.notificationRepository.createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere("notification.data::jsonb->>'read' IS NULL OR notification.data::jsonb->>'read' = false")
      .getCount();

    return { count };
  }

  async markAllAsRead(userId: string): Promise<void> {
    // Verify user exists
    await this.userService.getUserById(userId);

    const notifications = await this.notificationRepository.find({
      where: { userId },
    });

    for (const notification of notifications) {
      const data = typeof notification.data === 'string' 
        ? JSON.parse(notification.data) 
        : notification.data;
      
      if (!data.read) {
        data.read = true;
        data.readAt = new Date().toISOString();
        notification.data = data;
        await this.notificationRepository.save(notification);
      }
    }
  }
} 