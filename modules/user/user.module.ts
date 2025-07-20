import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from '../../database/entities/user.entity';
import { UserRepository } from '../../database/repository/user.repository';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    DatabaseModule,
  ],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {} 