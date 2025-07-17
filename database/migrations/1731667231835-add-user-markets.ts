import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserMarkets1731667231835 implements MigrationInterface {
    name = 'AddUserMarkets1731667231835'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_markets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "address" character varying NOT NULL, "market_id" character varying NOT NULL, CONSTRAINT "PK_971879bd985e716378e21f2cb8f" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user_markets"`);
    }

}
