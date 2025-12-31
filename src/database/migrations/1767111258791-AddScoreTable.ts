import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScoreTable1767111258791 implements MigrationInterface {
  name = 'AddScoreTable1767111258791';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`scores\` (\`id\` varchar(36) NOT NULL, \`playerId\` varchar(36) NOT NULL, \`score\` int UNSIGNED NOT NULL, \`metadata\` json NULL, \`timestamp\` timestamp NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_score_timestamp\` (\`score\`, \`timestamp\`), INDEX \`idx_player_score\` (\`playerId\`, \`score\`), UNIQUE INDEX \`IDX_892933411cc6cf69e12fbef069\` (\`playerId\`, \`timestamp\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_892933411cc6cf69e12fbef069\` ON \`scores\``);
    await queryRunner.query(`DROP INDEX \`idx_player_score\` ON \`scores\``);
    await queryRunner.query(`DROP INDEX \`idx_score_timestamp\` ON \`scores\``);
    await queryRunner.query(`DROP TABLE \`scores\``);
  }
}
