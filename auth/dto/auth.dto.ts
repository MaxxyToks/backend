import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class LoginRequestDto {
  @ApiPropertyOptional({
    example: '0x1234567890abcdef',
    description: 'Wallet address for login',
  })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Telegram ID for login',
  })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address for login',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '0x1234567890abcdef...',
    description: 'Signature for wallet authentication',
  })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({
    example: 'Sign this message to authenticate with Lylo App. Nonce: abc123...',
    description: 'Message that was signed',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class RegisterRequestDto {
  @ApiPropertyOptional({
    example: '0x1234567890abcdef',
    description: 'Wallet address for registration',
  })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Telegram ID for registration',
  })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address for registration',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '0x1234567890abcdef...',
    description: 'Signature for wallet authentication',
  })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({
    example: 'Sign this message to authenticate with Lylo App. Nonce: abc123...',
    description: 'Message that was signed',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class RefreshTokenRequestDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token to get new access token',
  })
  @IsString()
  refreshToken: string;
}

export class UserDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier for the user',
  })
  id: string;

  @ApiPropertyOptional({
    example: '123456789',
    description: 'Telegram ID of the user',
  })
  telegramId?: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Email address of the user',
  })
  email?: string;

  @ApiPropertyOptional({
    example: '0x1234567890abcdef',
    description: 'Wallet address of the user',
  })
  walletAddress?: string;
}

export class AuthResponseDto {
  @ApiProperty({
    type: UserDto,
    description: 'User information',
  })
  user: UserDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    example: 86400,
    description: 'Token expiration time in seconds',
  })
  expiresIn: number;
}

export class NonceResponseDto {
  @ApiProperty({
    example: 'Sign this message to authenticate with Lylo App. Nonce: abc123def456...',
    description: 'Message to be signed by the wallet',
  })
  message: string;
} 