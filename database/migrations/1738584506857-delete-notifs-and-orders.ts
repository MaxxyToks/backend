import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteNotifsAndOrders1738584506857 implements MigrationInterface {
    name = 'DeleteNotifsAndOrders1738584506857';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop notification table
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_928b7aa1754e08e1ed7052cb9d8"`);
        await queryRunner.query(`DROP TABLE "notification"`);

        // Drop swap_order table
        await queryRunner.query(`ALTER TABLE "swap_order" DROP CONSTRAINT "FK_af5055b2d904d1cfc089c9ec745"`);
        await queryRunner.query(`DROP TABLE "swap_order"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate swap_order table
        await queryRunner.query(
            `CREATE TABLE "swap_order" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "chain_name" character varying NOT NULL, "wallet_address" character varying NOT NULL, "dex" character varying NOT NULL, "base_token" jsonb NOT NULL, "quote_token" jsonb NOT NULL, "amount" character varying NOT NULL, "intermediate_token_address" character varying NOT NULL, "price" character varying NOT NULL, "lower_threshold" character varying NOT NULL, "upper_threshold" character varying NOT NULL, "creation_timestamp" character varying NOT NULL, CONSTRAINT "PK_52dd74e8c989aa5665ad2852b8b" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "swap_order" ADD CONSTRAINT "FK_af5055b2d904d1cfc089c9ec745" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );

        // Recreate notification table
        await queryRunner.query(
            `CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "transfer_data" json NOT NULL, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "notification" ADD CONSTRAINT "FK_928b7aa1754e08e1ed7052cb9d8" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }
}
