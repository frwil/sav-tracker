<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260130053721 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE flock_feed_history DROP FOREIGN KEY `FK_87DBB5311409DD88`');
        $this->addSql('ALTER TABLE flock_feed_history ADD CONSTRAINT FK_87DBB5311409DD88 FOREIGN KEY (observation_id) REFERENCES observation (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY `FK_D7E7CCC8AB748C6`');
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY `FK_D7E7CCC8DD0DFD1C`');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT FK_D7E7CCC8AB748C6 FOREIGN KEY (detected_in_id) REFERENCES observation (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT FK_D7E7CCC8DD0DFD1C FOREIGN KEY (resolved_in_id) REFERENCES observation (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE flock_feed_history DROP FOREIGN KEY FK_87DBB5311409DD88');
        $this->addSql('ALTER TABLE flock_feed_history ADD CONSTRAINT `FK_87DBB5311409DD88` FOREIGN KEY (observation_id) REFERENCES observation (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY FK_D7E7CCC8AB748C6');
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY FK_D7E7CCC8DD0DFD1C');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT `FK_D7E7CCC8AB748C6` FOREIGN KEY (detected_in_id) REFERENCES observation (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT `FK_D7E7CCC8DD0DFD1C` FOREIGN KEY (resolved_in_id) REFERENCES observation (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
    }
}
