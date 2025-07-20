import { Module } from '@nestjs/common';
import { UserModule as ModulesUserModule } from '../modules/user/user.module';

@Module({
  imports: [ModulesUserModule],
  exports: [ModulesUserModule],
})
export class UserModule {} 