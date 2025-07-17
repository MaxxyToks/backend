import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveKaia1738168338208 implements MigrationInterface {
    name = 'RemoveKaia1738168338208'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_settings" DROP COLUMN "kaia_slippage"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_settings" ADD "kaia_slippage" integer NOT NULL DEFAULT '1'`);
    }

}
