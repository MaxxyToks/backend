import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWalletAddress1736956164147 implements MigrationInterface {
    name = 'AddWalletAddress1736956164147'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "wallet_address" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "wallet_address"`);
    }

}
