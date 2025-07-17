import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserField1731708962901 implements MigrationInterface {
    name = 'AddUserField1731708962901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "dynamic_email" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "dynamic_email"`);
    }

}
