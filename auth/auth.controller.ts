import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  HttpCode, 
  HttpStatus,
  Get,
  Param
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../modules/auth/guards/jwt.guard';
import { UserSession } from '../common/decorators/user-session.decorator';
import { User } from '../database/entities/user.entity';
import { AuthService, LoginDto, RegisterDto, RefreshTokenDto, AuthResponseDto } from '../modules/auth/auth.service';
import { 
  LoginRequestDto, 
  RegisterRequestDto, 
  RefreshTokenRequestDto,
  AuthResponseDto as AuthResponseDtoClass,
  NonceResponseDto
} from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with wallet address, telegram ID, or email' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDtoClass,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials or signature',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async login(@Body() loginDto: LoginRequestDto): Promise<AuthResponseDto> {
    return await this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    type: AuthResponseDtoClass,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid signature',
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
  })
  async register(@Body() registerDto: RegisterRequestDto): Promise<AuthResponseDto> {
    return await this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDtoClass,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid refresh token',
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenRequestDto): Promise<AuthResponseDto> {
    return await this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({
    status: 204,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async logout(@UserSession() user: User): Promise<void> {
    await this.authService.logout(user.id);
  }

  @Post('logout/:sessionId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout from specific session' })
  @ApiResponse({
    status: 204,
    description: 'Session logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async logoutSession(
    @UserSession() user: User,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.authService.logout(user.id, sessionId);
  }

  @Get('nonce/:walletAddress')
  @ApiOperation({ summary: 'Generate nonce for wallet signature' })
  @ApiResponse({
    status: 200,
    description: 'Nonce generated successfully',
    type: NonceResponseDto,
  })
  async generateNonce(@Param('walletAddress') walletAddress: string): Promise<NonceResponseDto> {
    const message = await this.authService.generateNonce(walletAddress);
    return { message };
  }

  @Get('validate')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate current token' })
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
  })
  @ApiResponse({
    status: 401,
    description: 'Token is invalid',
  })
  async validateToken(@UserSession() user: User): Promise<{ valid: boolean; user: any }> {
    return {
      valid: true,
      user: {
        id: user.id,
        telegramId: user.telegramID,
        email: user.email,
        walletAddress: user.walletAddress,
      },
    };
  }
} 