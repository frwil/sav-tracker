<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260128034611 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE problem (id INT AUTO_INCREMENT NOT NULL, description LONGTEXT NOT NULL, status VARCHAR(20) DEFAULT \'open\' NOT NULL, severity VARCHAR(20) DEFAULT NULL, created_at DATETIME NOT NULL, resolved_at DATETIME DEFAULT NULL, detected_in_id INT NOT NULL, flock_id INT DEFAULT NULL, INDEX IDX_D7E7CCC8AB748C6 (detected_in_id), INDEX IDX_D7E7CCC86DA78CF6 (flock_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT FK_D7E7CCC8AB748C6 FOREIGN KEY (detected_in_id) REFERENCES observation (id)');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT FK_D7E7CCC86DA78CF6 FOREIGN KEY (flock_id) REFERENCES flock (id)');
        $this->addSql('ALTER TABLE observation DROP problems');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY FK_D7E7CCC8AB748C6');
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY FK_D7E7CCC86DA78CF6');
        $this->addSql('DROP TABLE problem');
        $this->addSql('ALTER TABLE observation ADD problems LONGTEXT DEFAULT NULL');
    }
}
