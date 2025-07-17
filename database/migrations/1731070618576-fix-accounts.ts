import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAccounts1731070618576 implements MigrationInterface {
    name = 'FixAccounts1731070618576'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_0de86c382786ba5239e47025221"`);
        await queryRunner.query(`ALTER TABLE "account" RENAME COLUMN "users_id" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "FK_efef1e5fdbe318a379c06678c51" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_efef1e5fdbe318a379c06678c51"`);
        await queryRunner.query(`ALTER TABLE "account" RENAME COLUMN "user_id" TO "users_id"`);
        await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "FK_0de86c382786ba5239e47025221" FOREIGN KEY ("users_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
