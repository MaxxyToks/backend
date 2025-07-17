import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSlippageHyperSonic1741992721664 implements MigrationInterface {
    name = 'AddSlippageHyperSonic1741992721664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_settings" ADD COLUMN "hyper_slippage" integer DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "account_settings" ADD COLUMN "sonic_slippage" integer DEFAULT '100'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_settings" DROP COLUMN "hyper_slippage"`);
        await queryRunner.query(`ALTER TABLE "account_settings" DROP COLUMN "sonic_slippage"`);
    }

}
