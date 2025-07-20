import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtGuard } from './guards/jwt.guard';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    PassportModule,
    UserModule,
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [JwtGuard, AuthService],
  exports: [JwtModule, JwtGuard, AuthService],
})
export class AuthModule {} 