import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtGuard } from '../modules/auth/guards/jwt.guard';
import { UserSession } from '../common/decorators/user-session.decorator';
import { User } from '../database/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { 
  NotificationResponseDto,
  NotificationListResponseDto
} from './notifications.service';
import { 
  IncomingTransferNotificationDto,
  CloseOrderNotificationDto,
  DcaBuyDto,
  PriceAlertNotificationDto,
  SystemNotificationDto
} from '../modules/notifications/dto/notifications.dto';
import { 
  CreateNotificationRequestDto,
  NotificationResponseDto as NotificationResponseDtoClass,
  NotificationListResponseDto as NotificationListResponseDtoClass,
  UnreadCountResponseDto
} from './dto/notifications.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a custom notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
    type: NotificationResponseDtoClass,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async createNotification(
    @Body() createNotificationDto: CreateNotificationRequestDto,
    @UserSession() user: User,
  ): Promise<NotificationResponseDto> {
    return await this.notificationsService.createNotification({
      userId: user.id,
      data: createNotificationDto.data,
    });
  }

  @Post('incoming-transfer')
  @ApiOperation({ summary: 'Create incoming transfer notification' })
  @ApiResponse({
    status: 201,
    description: 'Incoming transfer notification created successfully',
    type: NotificationResponseDtoClass,
  })
  async createIncomingTransferNotification(
    @Body() dto: IncomingTransferNotificationDto,
  ): Promise<NotificationResponseDto> {
    return await this.notificationsService.createIncomingTransferNotification(dto);
  }

  @Post('close-order')
  @ApiOperation({ summary: 'Create close order notification' })
  @ApiResponse({
    status: 201,
    description: 'Close order notification created successfully',
    type: NotificationResponseDtoClass,
  })
  async createCloseOrderNotification(
    @Body() dto: CloseOrderNotificationDto,
  ): Promise<NotificationResponseDto> {
    return await this.notificationsService.createCloseOrderNotification(dto);
  }

  @Post('dca-buy')
  @ApiOperation({ summary: 'Create DCA buy notification' })
  @ApiResponse({
    status: 201,
    description: 'DCA buy notification created successfully',
    type: NotificationResponseDtoClass,
  })
  async createDcaBuyNotification(
    @Body() dto: DcaBuyDto,
  ): Promise<NotificationResponseDto> {
    return await this.notificationsService.createDcaBuyNotification(dto);
  }

  @Post('price-alert')
  @ApiOperation({ summary: 'Create price alert notification' })
  @ApiResponse({
    status: 201,
    description: 'Price alert notification created successfully',
    type: NotificationResponseDtoClass,
  })
  async createPriceAlertNotification(
    @Body() dto: PriceAlertNotificationDto,
  ): Promise<NotificationResponseDto> {
    return await this.notificationsService.createPriceAlertNotification(dto);
  }

  @Post('system')
  @ApiOperation({ summary: 'Create system notification' })
  @ApiResponse({
    status: 201,
    description: 'System notification created successfully',
    type: NotificationResponseDtoClass,
  })
  async createSystemNotification(
    @Body() dto: SystemNotificationDto,
  ): Promise<NotificationResponseDto> {
    return await this.notificationsService.createSystemNotification(dto);
  }

  @Get()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by notification type' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: NotificationListResponseDtoClass,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getUserNotifications(
    @UserSession() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: string,
  ): Promise<NotificationListResponseDto> {
    return await this.notificationsService.getUserNotifications(user.id, page, limit, type);
  }

  @Get('unread-count')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    type: UnreadCountResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getUnreadCount(@UserSession() user: User): Promise<UnreadCountResponseDto> {
    return await this.notificationsService.getUnreadCount(user.id);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification retrieved successfully',
    type: NotificationResponseDtoClass,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async getNotificationById(
    @Param('id') id: string,
    @UserSession() user: User,
  ): Promise<NotificationResponseDto> {
    return await this.notificationsService.getNotificationById(id, user.id);
  }

  @Post(':id/read')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
    type: NotificationResponseDtoClass,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async markNotificationAsRead(
    @Param('id') id: string,
    @UserSession() user: User,
  ): Promise<NotificationResponseDto> {
    return await this.notificationsService.markNotificationAsRead(id, user.id);
  }

  @Post('mark-all-read')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 204,
    description: 'All notifications marked as read successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async markAllAsRead(@UserSession() user: User): Promise<void> {
    await this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({
    status: 204,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async deleteNotification(
    @Param('id') id: string,
    @UserSession() user: User,
  ): Promise<void> {
    await this.notificationsService.deleteNotification(id, user.id);
  }

  @Delete()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all user notifications' })
  @ApiResponse({
    status: 204,
    description: 'All notifications deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async deleteAllNotifications(@UserSession() user: User): Promise<void> {
    await this.notificationsService.deleteAllUserNotifications(user.id);
  }
} 