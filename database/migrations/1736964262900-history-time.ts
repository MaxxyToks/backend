import { MigrationInterface, QueryRunner } from 'typeorm';

export class HistoryTime1736964262900 implements MigrationInterface {
  name = 'HistoryTime1736964262900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_history" ADD "saved_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_history" DROP COLUMN "saved_at"`);
  }
}
