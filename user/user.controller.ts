import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../modules/auth/guards/jwt.guard';
import { UserSession } from '../common/decorators/user-session.decorator';
import { User } from '../database/entities/user.entity';
import { UserService, CreateUserDto, UpdateUserDto, UserProfileDto } from '../modules/user/user.service';
import { 
  CreateUserRequestDto, 
  UpdateUserRequestDto, 
  UserProfileResponseDto,
  UserSessionsResponseDto 
} from './dto/user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User with this identifier already exists',
  })
  async createUser(@Body() createUserDto: CreateUserRequestDto): Promise<UserProfileResponseDto> {
    const user = await this.userService.createUser(createUserDto);
    return {
      id: user.id,
      telegramId: user.telegramID,
      email: user.email,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get('profile')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getProfile(@UserSession() user: User): Promise<UserProfileResponseDto> {
    const userProfile = await this.userService.getUserProfile(user.id);
    return userProfile;
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserById(@Param('id') id: string): Promise<UserProfileResponseDto> {
    const user = await this.userService.getUserById(id);
    return {
      id: user.id,
      telegramId: user.telegramID,
      email: user.email,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get('wallet/:address')
  @ApiOperation({ summary: 'Get user by wallet address' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserByWalletAddress(@Param('address') address: string): Promise<UserProfileResponseDto> {
    const user = await this.userService.getUserByWalletAddress(address);
    return {
      id: user.id,
      telegramId: user.telegramID,
      email: user.email,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get('telegram/:telegramId')
  @ApiOperation({ summary: 'Get user by Telegram ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserByTelegramId(@Param('telegramId') telegramId: string): Promise<UserProfileResponseDto> {
    const user = await this.userService.getUserByTelegramId(telegramId);
    return {
      id: user.id,
      telegramId: user.telegramID,
      email: user.email,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Put('profile')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Identifier already in use',
  })
  async updateProfile(
    @UserSession() user: User,
    @Body() updateUserDto: UpdateUserRequestDto,
  ): Promise<UserProfileResponseDto> {
    const updatedUser = await this.userService.updateUser(user.id, updateUserDto);
    return {
      id: updatedUser.id,
      telegramId: updatedUser.telegramID,
      email: updatedUser.email,
      walletAddress: updatedUser.walletAddress,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  @Get('sessions')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user sessions' })
  @ApiResponse({
    status: 200,
    description: 'User sessions retrieved successfully',
    type: UserSessionsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserSessions(@UserSession() user: User): Promise<UserSessionsResponseDto> {
    const sessions = await this.userService.getUserSessions(user.id);
    return {
      sessions: sessions.map(session => ({
        id: session.id,
        jwtToken: session.jwtToken,
        refreshToken: session.refreshToken,
        expirationDate: session.expirationDate,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
    };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a specific user session' })
  @ApiResponse({
    status: 204,
    description: 'Session deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(
    @UserSession() user: User,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.userService.deleteUserSession(user.id, sessionId);
  }

  @Delete('sessions')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all user sessions' })
  @ApiResponse({
    status: 204,
    description: 'All sessions deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllSessions(@UserSession() user: User): Promise<void> {
    await this.userService.deleteAllUserSessions(user.id);
  }

  @Delete('profile')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({
    status: 204,
    description: 'User account deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@UserSession() user: User): Promise<void> {
    await this.userService.deleteUser(user.id);
  }
} 