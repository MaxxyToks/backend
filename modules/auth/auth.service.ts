import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { SessionRepository } from '../../database/repository/session.entity';
import { User } from '../../database/entities/user.entity';
import { Session } from '../../database/entities/session.entity';
import * as crypto from 'crypto';

export interface LoginDto {
  walletAddress?: string;
  telegramId?: string;
  email?: string;
  signature?: string;
  message?: string;
}

export interface RegisterDto {
  walletAddress?: string;
  telegramId?: string;
  email?: string;
  signature?: string;
  message?: string;
}

export interface AuthResponseDto {
  user: {
    id: string;
    telegramId?: string;
    email?: string;
    walletAddress?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    let user: User;

    // Find user by provided identifier
    if (loginDto.walletAddress) {
      user = await this.userService.getUserByWalletAddress(loginDto.walletAddress);
    } else if (loginDto.telegramId) {
      user = await this.userService.getUserByTelegramId(loginDto.telegramId);
    } else if (loginDto.email) {
      user = await this.userService.getUserByEmail(loginDto.email);
    } else {
      throw new BadRequestException('Must provide wallet address, telegram ID, or email');
    }

    // Verify signature if provided
    if (loginDto.signature && loginDto.message && loginDto.walletAddress) {
      const isValidSignature = this.verifySignature(
        loginDto.message,
        loginDto.signature,
        loginDto.walletAddress
      );
      if (!isValidSignature) {
        throw new UnauthorizedException('Invalid signature');
      }
    }

    return await this.createAuthResponse(user);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    let user: User;

    // Create or get user
    if (registerDto.walletAddress) {
      user = await this.userService.createOrGetUserByAddress(registerDto.walletAddress);
    } else {
      // Create new user with provided data
      user = await this.userService.createUser({
        walletAddress: registerDto.walletAddress,
        telegramId: registerDto.telegramId,
        email: registerDto.email,
      });
    }

    // Verify signature if provided
    if (registerDto.signature && registerDto.message && registerDto.walletAddress) {
      const isValidSignature = this.verifySignature(
        registerDto.message,
        registerDto.signature,
        registerDto.walletAddress
      );
      if (!isValidSignature) {
        throw new UnauthorizedException('Invalid signature');
      }
    }

    return await this.createAuthResponse(user);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key',
      });

      // Find the session
      const session = await this.sessionRepository.findOne({
        where: { refreshToken: refreshTokenDto.refreshToken },
        relations: ['user'],
      });

      if (!session || !session.user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if session is expired
      if (session.expirationDate < new Date()) {
        await this.sessionRepository.delete(session.id);
        throw new UnauthorizedException('Session expired');
      }

      return await this.createAuthResponse(session.user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      // Delete specific session
      await this.userService.deleteUserSession(userId, sessionId);
    } else {
      // Delete all user sessions
      await this.userService.deleteAllUserSessions(userId);
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async createAuthResponse(user: User): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      telegramId: user.telegramID,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '24h',
      secret: process.env.JWT_SECRET || 'your-secret-key',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key',
    });

    // Create session
    const session = new Session();
    session.user = user;
    session.jwtToken = accessToken;
    session.refreshToken = refreshToken;
    session.expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.sessionRepository.save(session);

    return {
      user: {
        id: user.id,
        telegramId: user.telegramID,
        email: user.email,
        walletAddress: user.walletAddress,
      },
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  private verifySignature(message: string, signature: string, address: string): boolean {
    try {
      // This is a simplified signature verification
      // In a real implementation, you would use a proper Ethereum signature verification library
      const messageHash = crypto.createHash('sha256').update(message).digest('hex');
      const recoveredAddress = this.recoverAddressFromSignature(messageHash, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  private recoverAddressFromSignature(messageHash: string, signature: string): string {
    // This is a placeholder implementation
    // In a real implementation, you would use ethers.js or web3.js to recover the address
    // For now, we'll return a mock address
    return '0x0000000000000000000000000000000000000000';
  }

  async generateNonce(walletAddress: string): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('hex');
    const message = `Sign this message to authenticate with Lylo App. Nonce: ${nonce}`;
    
    // In a real implementation, you would store this nonce temporarily
    // and verify it when the user signs the message
    
    return message;
  }

  async userJwtGuard(token: string): Promise<User | null> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });
      return await this.userService.getUserById(payload.sub);
    } catch {
      return null;
    }
  }
} 