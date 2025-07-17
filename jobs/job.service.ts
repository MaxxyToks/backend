import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';

import { SessionRepository } from 'modules/database/repository/session.entity';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(private readonly sessionRepository: SessionRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  public async deleteOldSessions(): Promise<void> {
    this.logger.log('Deleting old sessions');
    try {
      const expiredSessions = await this.sessionRepository.find({
        where: {
          expirationDate: LessThan(new Date()),
        },
      });

      for (const session of expiredSessions) {
        await this.sessionRepository.delete(session.id);
      }
      this.logger.log('Gamma markets refresh finished successfully');
    } catch (error) {
      this.logger.error('Failed to refresh materialized view', error);
    }
  }
}
