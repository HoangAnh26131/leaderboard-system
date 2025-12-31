import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitMigration1767079970785 implements MigrationInterface {
  name = 'InitMigration1767079970785';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`players\` (\`id\` varchar(36) NOT NULL, \`wallet\` varchar(42) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_2c1cfa2c275ef49efc2231a700\` (\`wallet\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_2c1cfa2c275ef49efc2231a700\` ON \`players\``);
    await queryRunner.query(`DROP TABLE \`players\``);
  }
}
