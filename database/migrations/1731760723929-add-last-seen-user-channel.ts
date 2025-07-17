import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1731760980675 implements MigrationInterface {
  name = 'Migrations1731760980675';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_channel" DROP CONSTRAINT "UQ_d3dde8961183bbfba3faed4b2d6"`);
    await queryRunner.query(`ALTER TABLE "user_channel" ADD "last_seen_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "user_channel" ALTER COLUMN "user_address" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "user_channel" ADD CONSTRAINT "UQ_404aef6957219f0db9756650914" UNIQUE ("user_address", "channel_address")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_channel" DROP CONSTRAINT "UQ_404aef6957219f0db9756650914"`);
    await queryRunner.query(`ALTER TABLE "user_channel" ALTER COLUMN "user_address" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "user_channel" DROP COLUMN "last_seen_at"`);
    await queryRunner.query(
      `ALTER TABLE "user_channel" ADD CONSTRAINT "UQ_d3dde8961183bbfba3faed4b2d6" UNIQUE ("channel_address", "user_id")`,
    );
  }
}
