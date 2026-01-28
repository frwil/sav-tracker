<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260128042838 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY `FK_D7E7CCC86DA78CF6`');
        $this->addSql('DROP INDEX IDX_D7E7CCC86DA78CF6 ON problem');
        $this->addSql('ALTER TABLE problem CHANGE flock_id resolved_in_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT FK_D7E7CCC8DD0DFD1C FOREIGN KEY (resolved_in_id) REFERENCES observation (id)');
        $this->addSql('CREATE INDEX IDX_D7E7CCC8DD0DFD1C ON problem (resolved_in_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY FK_D7E7CCC8DD0DFD1C');
        $this->addSql('DROP INDEX IDX_D7E7CCC8DD0DFD1C ON problem');
        $this->addSql('ALTER TABLE problem CHANGE resolved_in_id flock_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT `FK_D7E7CCC86DA78CF6` FOREIGN KEY (flock_id) REFERENCES flock (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_D7E7CCC86DA78CF6 ON problem (flock_id)');
    }
}
