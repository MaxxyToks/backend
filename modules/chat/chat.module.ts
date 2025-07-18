import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatHistory } from '../database/entities/chat-history.entity';
import { ChatHistoryRepository } from '../database/repository/chat-history.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatHistory]),
    DatabaseModule,
  ],
  providers: [ChatService, ChatHistoryRepository],
  exports: [ChatService, ChatHistoryRepository],
})
export class ChatModule {} 