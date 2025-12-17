import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMusicSupport1734460000000 implements MigrationInterface {
  name = 'AddMusicSupport1734460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add music-specific foreign IDs to media table
    await queryRunner.query(
      `ALTER TABLE "media" ADD COLUMN "musicBrainzId" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD COLUMN "foreignArtistId" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD COLUMN "foreignAlbumId" character varying`
    );

    // Create indexes for music foreign IDs
    await queryRunner.query(
      `CREATE INDEX "IDX_media_musicBrainzId" ON "media" ("musicBrainzId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_media_foreignArtistId" ON "media" ("foreignArtistId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_media_foreignAlbumId" ON "media" ("foreignAlbumId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_media_foreignAlbumId"`);
    await queryRunner.query(`DROP INDEX "IDX_media_foreignArtistId"`);
    await queryRunner.query(`DROP INDEX "IDX_media_musicBrainzId"`);

    // Remove columns
    await queryRunner.query(
      `ALTER TABLE "media" DROP COLUMN "foreignAlbumId"`
    );
    await queryRunner.query(
      `ALTER TABLE "media" DROP COLUMN "foreignArtistId"`
    );
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "musicBrainzId"`);
  }
}
