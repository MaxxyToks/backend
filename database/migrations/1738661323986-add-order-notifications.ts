import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderNotifications1738661323986 implements MigrationInterface {
    name = 'AddOrderNotifications1738661323986';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "data" json NOT NULL, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "swap_order" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "telegram_id" character varying, "chain_name" character varying NOT NULL, "wallet_address" character varying NOT NULL, "dex" character varying NOT NULL, "base_token" jsonb NOT NULL, "quote_token" jsonb NOT NULL, "amount" character varying NOT NULL, "intermediate_token_address" character varying NOT NULL, "price" character varying NOT NULL, "lower_threshold" character varying NOT NULL, "upper_threshold" character varying NOT NULL, "creation_timestamp" character varying NOT NULL, "is_active" boolean NOT NULL, CONSTRAINT "PK_52dd74e8c989aa5665ad2852b8b" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`ALTER TABLE "chat_history" ALTER COLUMN "saved_at" DROP DEFAULT`);
        await queryRunner.query(
            `ALTER TABLE "notification" ADD CONSTRAINT "FK_928b7aa1754e08e1ed7052cb9d8" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "swap_order" ADD CONSTRAINT "FK_af5055b2d904d1cfc089c9ec745" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "swap_order" DROP CONSTRAINT "FK_af5055b2d904d1cfc089c9ec745"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_928b7aa1754e08e1ed7052cb9d8"`);
        await queryRunner.query(`ALTER TABLE "chat_history" ALTER COLUMN "saved_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`DROP TABLE "swap_order"`);
        await queryRunner.query(`DROP TABLE "notification"`);
    }
}
