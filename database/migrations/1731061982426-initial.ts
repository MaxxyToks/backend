import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1731061982426 implements MigrationInterface {
    name = 'Initial1731061982426'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "jwt_token" character varying NOT NULL, "refresh_token" character varying NOT NULL, "expiration_date" TIMESTAMP NOT NULL, "user_id" uuid, CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "telegram_id" character varying, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "account" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "address" character varying NOT NULL, "encrypted_key" character varying NOT NULL, "alias" character varying, "users_id" uuid, CONSTRAINT "PK_54115ee388cdb6d86bb4bf5b2ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "across_deposit" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "origin_spoke_contract" character varying NOT NULL, "from_address" character varying NOT NULL, "to_address" character varying NOT NULL, "input_token" character varying NOT NULL, "output_token" character varying NOT NULL, "input_amount" character varying NOT NULL, "output_amount" character varying, "origin_chain_name" character varying NOT NULL, "destination_chain_name" character varying NOT NULL, "original_chain_id" integer NOT NULL, "destination_chain_id" integer NOT NULL, "deposit_tx" character varying NOT NULL, "deposit_id" integer, "deposit_fill_tx" character varying, "is_deposit_completed" boolean, CONSTRAINT "PK_6105330b04b65bfa0f00fdf612d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "erc20" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "address" character varying NOT NULL, "name" character varying NOT NULL, "symbol" character varying NOT NULL, "decimals" integer NOT NULL, "chain_name" character varying NOT NULL, "chain_id" integer NOT NULL, "verified" boolean, CONSTRAINT "PK_8d43ce15401ba044c55a72a8ceb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "service_account" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "address" character varying NOT NULL, "encrypted_key" character varying NOT NULL, CONSTRAINT "UQ_f113985a765e22a8ab9f04efe25" UNIQUE ("address"), CONSTRAINT "PK_2efb318de61f6487f806627dbd2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "FK_30e98e8746699fb9af235410aff" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account" ADD CONSTRAINT "FK_0de86c382786ba5239e47025221" FOREIGN KEY ("users_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT "FK_0de86c382786ba5239e47025221"`);
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "FK_30e98e8746699fb9af235410aff"`);
        await queryRunner.query(`DROP TABLE "service_account"`);
        await queryRunner.query(`DROP TABLE "erc20"`);
        await queryRunner.query(`DROP TABLE "across_deposit"`);
        await queryRunner.query(`DROP TABLE "account"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "session"`);
    }

}
