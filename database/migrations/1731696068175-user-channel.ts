import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1731696068175 implements MigrationInterface {
  name = 'Migrations1731696068175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_channel" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "channel_address" character varying NOT NULL, "user_address" character varying NOT NULL, "user_id" uuid, CONSTRAINT "UQ_d3dde8961183bbfba3faed4b2d6" UNIQUE ("user_address", "channel_address"), CONSTRAINT "PK_cb249db8585837f71294368606d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_channel" ADD CONSTRAINT "FK_1f293902fccad90c2655a46dfcd" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_channel" DROP CONSTRAINT "FK_1f293902fccad90c2655a46dfcd"`);
    await queryRunner.query(`DROP TABLE "user_channel"`);
  }
}
