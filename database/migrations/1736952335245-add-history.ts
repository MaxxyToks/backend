import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHistory1736952335245 implements MigrationInterface {
    name = 'AddHistory1736952335245'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "chat_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "role" character varying NOT NULL, "message" jsonb NOT NULL, CONSTRAINT "PK_cf76a7693b0b075dd86ea05f21d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "chat_history" ADD CONSTRAINT "FK_1ac2c37b6a37918f4d711afc48c" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_history" DROP CONSTRAINT "FK_1ac2c37b6a37918f4d711afc48c"`);
        await queryRunner.query(`DROP TABLE "chat_history"`);
    }

}
