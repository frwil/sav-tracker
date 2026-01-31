<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260130052532 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE flock_feed_history DROP FOREIGN KEY `flock_feed_history_ibfk_1`');
        $this->addSql('ALTER TABLE flock_feed_history DROP FOREIGN KEY `flock_feed_history_ibfk_2`');
        $this->addSql('ALTER TABLE flock_feed_history CHANGE previous_strategy previous_strategy VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE flock_feed_history ADD CONSTRAINT FK_87DBB5316DA78CF6 FOREIGN KEY (flock_id) REFERENCES flock (id)');
        $this->addSql('ALTER TABLE flock_feed_history ADD CONSTRAINT FK_87DBB5311409DD88 FOREIGN KEY (observation_id) REFERENCES observation (id)');
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY `problem_ibfk_1`');
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY `problem_ibfk_2`');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT FK_D7E7CCC8AB748C6 FOREIGN KEY (detected_in_id) REFERENCES observation (id)');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT FK_D7E7CCC8DD0DFD1C FOREIGN KEY (resolved_in_id) REFERENCES observation (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE flock_feed_history DROP FOREIGN KEY FK_87DBB5316DA78CF6');
        $this->addSql('ALTER TABLE flock_feed_history DROP FOREIGN KEY FK_87DBB5311409DD88');
        $this->addSql('ALTER TABLE flock_feed_history CHANGE previous_strategy previous_strategy VARCHAR(50) NOT NULL');
        $this->addSql('ALTER TABLE flock_feed_history ADD CONSTRAINT `flock_feed_history_ibfk_1` FOREIGN KEY (observation_id) REFERENCES observation (id) ON UPDATE CASCADE ON DELETE CASCADE');
        $this->addSql('ALTER TABLE flock_feed_history ADD CONSTRAINT `flock_feed_history_ibfk_2` FOREIGN KEY (flock_id) REFERENCES flock (id) ON UPDATE CASCADE ON DELETE CASCADE');
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY FK_D7E7CCC8AB748C6');
        $this->addSql('ALTER TABLE problem DROP FOREIGN KEY FK_D7E7CCC8DD0DFD1C');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT `problem_ibfk_1` FOREIGN KEY (detected_in_id) REFERENCES observation (id) ON UPDATE CASCADE ON DELETE CASCADE');
        $this->addSql('ALTER TABLE problem ADD CONSTRAINT `problem_ibfk_2` FOREIGN KEY (resolved_in_id) REFERENCES observation (id) ON UPDATE CASCADE ON DELETE CASCADE');
    }
}
