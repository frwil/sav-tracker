<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260130032151 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE flock_feed_history (id INT AUTO_INCREMENT NOT NULL, previous_strategy VARCHAR(50) NOT NULL, new_strategy VARCHAR(50) NOT NULL, previous_formula VARCHAR(50) DEFAULT NULL, new_formula VARCHAR(50) DEFAULT NULL, changed_at DATETIME NOT NULL, flock_id INT NOT NULL, observation_id INT DEFAULT NULL, INDEX IDX_87DBB5316DA78CF6 (flock_id), INDEX IDX_87DBB5311409DD88 (observation_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE flock_feed_history ADD CONSTRAINT FK_87DBB5316DA78CF6 FOREIGN KEY (flock_id) REFERENCES flock (id)');
        $this->addSql('ALTER TABLE flock_feed_history ADD CONSTRAINT FK_87DBB5311409DD88 FOREIGN KEY (observation_id) REFERENCES observation (id)');
        $this->addSql('ALTER TABLE flock DROP feed_strategy, DROP feed_formula');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE flock_feed_history DROP FOREIGN KEY FK_87DBB5316DA78CF6');
        $this->addSql('ALTER TABLE flock_feed_history DROP FOREIGN KEY FK_87DBB5311409DD88');
        $this->addSql('DROP TABLE flock_feed_history');
        $this->addSql('ALTER TABLE flock ADD feed_strategy VARCHAR(50) DEFAULT \'INDUSTRIAL\' NOT NULL, ADD feed_formula VARCHAR(50) DEFAULT NULL');
    }
}
