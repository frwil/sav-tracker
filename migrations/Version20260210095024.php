<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260210095024 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE audit_log CHANGE entity_class entity_class VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE customer DROP exact_location, DROP phone_number, DROP activated, CHANGE zone zone VARCHAR(255) DEFAULT NULL, CHANGE status status VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE standard DROP FOREIGN KEY `FK_10F7D7875CB73291`');
        $this->addSql('DROP INDEX IDX_10F7D7875CB73291 ON standard');
        $this->addSql('ALTER TABLE standard ADD speculation VARCHAR(255) NOT NULL, DROP speculation_id');
        $this->addSql('ALTER TABLE user ADD daily_visit_objective INT DEFAULT NULL');
        $this->addSql('ALTER TABLE visit ADD completed_at DATETIME DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE audit_log CHANGE entity_class entity_class VARCHAR(255) NOT NULL');
        $this->addSql('ALTER TABLE customer ADD exact_location VARCHAR(255) DEFAULT NULL, ADD phone_number VARCHAR(255) DEFAULT NULL, ADD activated TINYINT DEFAULT 1 NOT NULL, CHANGE zone zone VARCHAR(255) NOT NULL, CHANGE status status VARCHAR(20) DEFAULT \'CLIENT\' NOT NULL');
        $this->addSql('ALTER TABLE standard ADD speculation_id INT NOT NULL, DROP speculation');
        $this->addSql('ALTER TABLE standard ADD CONSTRAINT `FK_10F7D7875CB73291` FOREIGN KEY (speculation_id) REFERENCES speculation (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_10F7D7875CB73291 ON standard (speculation_id)');
        $this->addSql('ALTER TABLE `user` DROP daily_visit_objective');
        $this->addSql('ALTER TABLE visit DROP completed_at');
    }
}
