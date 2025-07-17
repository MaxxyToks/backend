import { MigrationInterface, QueryRunner } from "typeorm";

export class DcaSubscripion1742432395950 implements MigrationInterface {
    name = 'DcaSubscripion1742432395950'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dca_subscription" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "chain_name" character varying NOT NULL, "user_id" character varying NOT NULL, "dca_key" character varying NOT NULL, "user_address" character varying NOT NULL, "dex" character varying NOT NULL, "token_in" jsonb NOT NULL, "token_out" jsonb NOT NULL, "amount" character varying NOT NULL, "cycles" character varying NOT NULL, "amount_per_cycle" character varying NOT NULL, "cycle_interval" character varying NOT NULL, "last_trigger_timestamp" character varying NOT NULL, "cycles_left" character varying NOT NULL, "amount_left" character varying NOT NULL, CONSTRAINT "PK_91d5ae837fae8e54a69e9ce02c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "account_settings" DROP COLUMN "hyper_slippage"`);
        await queryRunner.query(`ALTER TABLE "account_settings" DROP COLUMN "sonic_slippage"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_settings" ADD "sonic_slippage" integer DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ADD "hyper_slippage" integer DEFAULT '100'`);
        await queryRunner.query(`DROP TABLE "dca_subscription"`);
    }

}
