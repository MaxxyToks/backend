import { MigrationInterface, QueryRunner } from "typeorm";

export class PolyCreds1731330040750 implements MigrationInterface {
    name = 'PolyCreds1731330040750'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" ADD "polymarket_api_key_object" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" DROP COLUMN "polymarket_api_key_object"`);
    }

}
