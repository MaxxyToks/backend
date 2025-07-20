import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsUUID, IsObject } from 'class-validator';

export class CreateNotificationRequestDto {
  @ApiProperty({
    example: { type: 'custom', message: 'This is a custom notification' },
    description: 'Notification data',
  })
  @IsObject()
  data: any;
}

export class NotificationResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier for the notification',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID who owns this notification',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    example: { type: 'incoming_transfer', amount: '100', tokenSymbol: 'USDC' },
    description: 'Notification data',
  })
  data: any;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the notification was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the notification was last updated',
  })
  updatedAt: Date;
}

export class NotificationListResponseDto {
  @ApiProperty({
    type: [NotificationResponseDto],
    description: 'List of notifications',
  })
  notifications: NotificationResponseDto[];

  @ApiProperty({
    example: 100,
    description: 'Total number of notifications',
  })
  @IsNumber()
  total: number;

  @ApiProperty({
    example: 1,
    description: 'Current page number',
  })
  @IsNumber()
  page: number;

  @ApiProperty({
    example: 20,
    description: 'Number of items per page',
  })
  @IsNumber()
  limit: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({
    example: 5,
    description: 'Number of unread notifications',
  })
  @IsNumber()
  count: number;
} 