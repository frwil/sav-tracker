<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260204153909 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE consultation (id INT AUTO_INCREMENT NOT NULL, date DATETIME NOT NULL, farm_details JSON DEFAULT NULL, concerns LONGTEXT DEFAULT NULL, expectations LONGTEXT DEFAULT NULL, intervention_done TINYINT NOT NULL, intervention_comments LONGTEXT DEFAULT NULL, appointment_taken TINYINT NOT NULL, appointment_date DATETIME DEFAULT NULL, appointment_reason VARCHAR(50) DEFAULT NULL, technician_id INT DEFAULT NULL, customer_id INT NOT NULL, INDEX IDX_964685A6E6C5D496 (technician_id), INDEX IDX_964685A69395C3F3 (customer_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE consultation ADD CONSTRAINT FK_964685A6E6C5D496 FOREIGN KEY (technician_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE consultation ADD CONSTRAINT FK_964685A69395C3F3 FOREIGN KEY (customer_id) REFERENCES customer (id)');
        $this->addSql('ALTER TABLE prospection ADD client_id INT NOT NULL, DROP prospect_name, DROP phone_number, DROP location_label, DROP gps_coordinates, CHANGE appointment_type appointment_reason VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE prospection ADD CONSTRAINT FK_47EBD1B019EB6921 FOREIGN KEY (client_id) REFERENCES customer (id)');
        $this->addSql('CREATE INDEX IDX_47EBD1B019EB6921 ON prospection (client_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE consultation DROP FOREIGN KEY FK_964685A6E6C5D496');
        $this->addSql('ALTER TABLE consultation DROP FOREIGN KEY FK_964685A69395C3F3');
        $this->addSql('DROP TABLE consultation');
        $this->addSql('ALTER TABLE prospection DROP FOREIGN KEY FK_47EBD1B019EB6921');
        $this->addSql('DROP INDEX IDX_47EBD1B019EB6921 ON prospection');
        $this->addSql('ALTER TABLE prospection ADD prospect_name VARCHAR(255) NOT NULL, ADD phone_number VARCHAR(255) DEFAULT NULL, ADD location_label VARCHAR(255) DEFAULT NULL, ADD gps_coordinates VARCHAR(255) DEFAULT NULL, DROP client_id, CHANGE appointment_reason appointment_type VARCHAR(50) DEFAULT NULL');
    }
}
