import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmail1731771581086 implements MigrationInterface {
    name = 'AddEmail1731771581086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "dynamic_email" TO "email"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "email" TO "dynamic_email"`);
    }

}
