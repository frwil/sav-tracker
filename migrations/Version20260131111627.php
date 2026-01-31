<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260131111627 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE observation_photo (id INT AUTO_INCREMENT NOT NULL, content_url VARCHAR(255) NOT NULL, observation_id INT NOT NULL, INDEX IDX_AFDE96A51409DD88 (observation_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE observation_photo ADD CONSTRAINT FK_AFDE96A51409DD88 FOREIGN KEY (observation_id) REFERENCES observation (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE observation_photo DROP FOREIGN KEY FK_AFDE96A51409DD88');
        $this->addSql('DROP TABLE observation_photo');
    }
}
