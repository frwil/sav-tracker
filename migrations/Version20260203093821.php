<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260203093821 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE prospection (id INT AUTO_INCREMENT NOT NULL, date DATETIME NOT NULL, prospect_name VARCHAR(255) NOT NULL, phone_number VARCHAR(255) DEFAULT NULL, location_label VARCHAR(255) DEFAULT NULL, gps_coordinates VARCHAR(255) DEFAULT NULL, farm_details JSON DEFAULT NULL, concerns LONGTEXT DEFAULT NULL, expectations LONGTEXT DEFAULT NULL, intervention_done TINYINT NOT NULL, intervention_comments LONGTEXT DEFAULT NULL, appointment_taken TINYINT NOT NULL, appointment_date DATETIME DEFAULT NULL, appointment_type VARCHAR(50) DEFAULT NULL, status VARCHAR(50) NOT NULL, technician_id INT DEFAULT NULL, INDEX IDX_47EBD1B0E6C5D496 (technician_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE prospection_photo (id INT AUTO_INCREMENT NOT NULL, content_url VARCHAR(255) NOT NULL, prospection_id INT NOT NULL, INDEX IDX_447B7064CE4F4C9 (prospection_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE prospection ADD CONSTRAINT FK_47EBD1B0E6C5D496 FOREIGN KEY (technician_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE prospection_photo ADD CONSTRAINT FK_447B7064CE4F4C9 FOREIGN KEY (prospection_id) REFERENCES prospection (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE prospection DROP FOREIGN KEY FK_47EBD1B0E6C5D496');
        $this->addSql('ALTER TABLE prospection_photo DROP FOREIGN KEY FK_447B7064CE4F4C9');
        $this->addSql('DROP TABLE prospection');
        $this->addSql('DROP TABLE prospection_photo');
    }
}
