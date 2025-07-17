import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHyperswapPool1740105593984 implements MigrationInterface {
    name = 'AddHyperswapPool1740105593984'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pools" ("pair_address" character varying NOT NULL, "token0_address" character varying NOT NULL, "token0_name" character varying NOT NULL, "token0_symbol" character varying NOT NULL, "token0_decimals" integer, "token1_address" character varying NOT NULL, "token1_name" character varying NOT NULL, "token1_symbol" character varying NOT NULL, "token1_decimals" integer, "reserve0" character varying(255) NOT NULL, "reserve1" character varying(255) NOT NULL, "version" character varying NOT NULL, "fee" integer NOT NULL, "display" boolean NOT NULL, CONSTRAINT "PK_0482de01001e960b2aad7f93654" PRIMARY KEY ("pair_address"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "pools"`);
    }

}
