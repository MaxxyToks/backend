import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UserRepository } from '../database/repository/user.repository';
import { SessionRepository } from '../database/repository/session.entity';
import { User } from '../database/entities/user.entity';
import { Session } from '../database/entities/session.entity';

export interface CreateUserDto {
  telegramId?: string;
  email?: string;
  walletAddress?: string;
}

export interface UpdateUserDto {
  telegramId?: string;
  email?: string;
  walletAddress?: string;
}

export interface UserProfileDto {
  id: string;
  telegramId?: string;
  email?: string;
  walletAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists with the same identifiers
    if (createUserDto.walletAddress) {
      const existingUser = await this.userRepository.findOne({
        where: { walletAddress: createUserDto.walletAddress.toLowerCase() }
      });
      if (existingUser) {
        throw new ConflictException('User with this wallet address already exists');
      }
    }

    if (createUserDto.telegramId) {
      const existingUser = await this.userRepository.findOne({
        where: { telegramID: createUserDto.telegramId }
      });
      if (existingUser) {
        throw new ConflictException('User with this Telegram ID already exists');
      }
    }

    if (createUserDto.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email.toLowerCase() }
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    return await this.userRepository.createNewUser(createUserDto);
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserByTelegramId(telegramId: string): Promise<User> {
    const user = await this.userRepository.getUserByTelegramId(telegramId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(userId);
    
    // Check for conflicts with other users
    if (updateUserDto.walletAddress && updateUserDto.walletAddress !== user.walletAddress) {
      const existingUser = await this.userRepository.findOne({
        where: { walletAddress: updateUserDto.walletAddress.toLowerCase() }
      });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Wallet address already in use');
      }
    }

    if (updateUserDto.telegramId && updateUserDto.telegramId !== user.telegramID) {
      const existingUser = await this.userRepository.findOne({
        where: { telegramID: updateUserDto.telegramId }
      });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Telegram ID already in use');
      }
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email.toLowerCase() }
      });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update user fields
    if (updateUserDto.walletAddress !== undefined) {
      user.walletAddress = updateUserDto.walletAddress?.toLowerCase();
    }
    if (updateUserDto.telegramId !== undefined) {
      user.telegramID = updateUserDto.telegramId;
    }
    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email?.toLowerCase();
    }

    return await this.userRepository.save(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    await this.userRepository.remove(user);
  }

  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.getUserById(userId);
    return {
      id: user.id,
      telegramId: user.telegramID,
      email: user.email,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async createOrGetUserByAddress(walletAddress: string): Promise<User> {
    return await this.userRepository.createOrGetUserByAddress(walletAddress);
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['sessions']
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.sessions;
  }

  async deleteUserSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user: { id: userId } }
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    await this.sessionRepository.remove(session);
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.sessionRepository.find({
      where: { user: { id: userId } }
    });
    await this.sessionRepository.remove(sessions);
  }
} 