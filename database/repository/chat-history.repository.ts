import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseRepository } from './base.repository';
import { ChatHistory } from '../entities/chat-history.entity';

@Injectable()
export class ChatHistoryRepository extends BaseRepository<ChatHistory> {
  constructor(
    @InjectRepository(ChatHistory)
    repository: Repository<ChatHistory>,
  ) {
    super(repository);
  }
}
