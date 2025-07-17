import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeSlippage1738233378624 implements MigrationInterface {
    name = 'ChangeSlippage1738233378624'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "ethereum_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "arbitrum_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "base_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "optimism_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "zksync_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "polygon_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "scroll_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "gnosis_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "bsc_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "avalanche_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "fantom_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "aurora_slippage" SET DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "solana_slippage" SET DEFAULT '100'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "solana_slippage" SET DEFAULT '50'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "aurora_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "fantom_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "avalanche_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "bsc_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "gnosis_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "scroll_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "polygon_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "zksync_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "optimism_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "base_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "arbitrum_slippage" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ALTER COLUMN "ethereum_slippage" SET DEFAULT '1'`);
    }

}
