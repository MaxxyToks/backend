import { Module } from '@nestjs/common';
import { AuthModule as ModulesAuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [ModulesAuthModule],
  exports: [ModulesAuthModule],
})
export class AuthModule {} 