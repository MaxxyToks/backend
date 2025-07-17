import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountSettings1738144488354 implements MigrationInterface {
  name = 'AccountSettings1738144488354';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "account_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ethereum_slippage" integer NOT NULL DEFAULT '1', "arbitrum_slippage" integer NOT NULL DEFAULT '1', "base_slippage" integer NOT NULL DEFAULT '1', "optimism_slippage" integer NOT NULL DEFAULT '1', "zksync_slippage" integer NOT NULL DEFAULT '1', "polygon_slippage" integer NOT NULL DEFAULT '1', "scroll_slippage" integer NOT NULL DEFAULT '1', "gnosis_slippage" integer NOT NULL DEFAULT '1', "bsc_slippage" integer NOT NULL DEFAULT '1', "avalanche_slippage" integer NOT NULL DEFAULT '1', "fantom_slippage" integer NOT NULL DEFAULT '1', "aurora_slippage" integer NOT NULL DEFAULT '1', "kaia_slippage" integer NOT NULL DEFAULT '1', "solana_slippage" integer NOT NULL DEFAULT '50', CONSTRAINT "PK_cede89a31d2392a1064087af67a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "account" ADD "settings_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "account" ADD CONSTRAINT "UQ_cede89a31d2392a1064087af67a" UNIQUE ("settings_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "account" ADD CONSTRAINT "FK_cede89a31d2392a1064087af67a" FOREIGN KEY ("settings_id") REFERENCES "account_settings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_cede89a31d2392a1064087af67a"`);
    await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "UQ_cede89a31d2392a1064087af67a"`);
    await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "settings_id"`);
    await queryRunner.query(`DROP TABLE "account_settings"`);
  }
}
