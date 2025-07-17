import { MigrationInterface, QueryRunner } from "typeorm";

export class Observations1743715293901 implements MigrationInterface {
    name = 'Observations1743715293901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          CREATE TABLE "observation" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "user_id" uuid NOT NULL,
            "observed_address" character varying NOT NULL,
            "token_symbol" character varying NOT NULL,
            "chain_name" character varying NOT NULL,
            CONSTRAINT "PK_77a736edc631a400b788ce302cb" PRIMARY KEY ("id")
          )
        `);

        await queryRunner.query(`
          ALTER TABLE "account" 
          ADD "notifications_enabled" boolean NOT NULL DEFAULT false
        `);

        await queryRunner.query(`
          ALTER TABLE "observation" 
          ADD CONSTRAINT "FK_5dd2aad395a285ce554e70bb63f" 
          FOREIGN KEY ("user_id") 
          REFERENCES "user"("id") 
          ON DELETE CASCADE 
          ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          ALTER TABLE "observation" 
          DROP CONSTRAINT "FK_5dd2aad395a285ce554e70bb63f"
        `);
        await queryRunner.query(`
          ALTER TABLE "account" 
          DROP COLUMN "notifications_enabled"
        `);
        await queryRunner.query(`DROP TABLE "observation"`);
    }
}
