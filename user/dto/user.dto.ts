import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsUUID } from 'class-validator';

export class CreateUserRequestDto {
  @ApiPropertyOptional({
    example: '123456789',
    description: 'Telegram ID of the user',
  })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '0x1234567890abcdef',
    description: 'Wallet address of the user',
  })
  @IsOptional()
  @IsString()
  walletAddress?: string;
}

export class UpdateUserRequestDto {
  @ApiPropertyOptional({
    example: '123456789',
    description: 'Telegram ID of the user',
  })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '0x1234567890abcdef',
    description: 'Wallet address of the user',
  })
  @IsOptional()
  @IsString()
  walletAddress?: string;
}

export class UserProfileResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier for the user',
  })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Telegram ID of the user',
  })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    example: '0x1234567890abcdef',
    description: 'Wallet address of the user',
  })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the user was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the user was last updated',
  })
  updatedAt: Date;
}

export class UserSessionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier for the session',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT token for the session',
  })
  @IsString()
  jwtToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token for the session',
  })
  @IsString()
  refreshToken: string;

  @ApiProperty({
    example: '2023-12-31T23:59:59.000Z',
    description: 'Expiration date of the session',
  })
  expirationDate: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the session was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when the session was last updated',
  })
  updatedAt: Date;
}

export class UserSessionsResponseDto {
  @ApiProperty({
    type: [UserSessionDto],
    description: 'List of user sessions',
  })
  sessions: UserSessionDto[];
} 