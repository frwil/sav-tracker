<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260210140350 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE user_objective (id INT AUTO_INCREMENT NOT NULL, daily_rate INT NOT NULL, start_date DATETIME NOT NULL, end_date DATETIME DEFAULT NULL, user_id INT NOT NULL, INDEX IDX_B9767CE5A76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE user_objective ADD CONSTRAINT FK_B9767CE5A76ED395 FOREIGN KEY (user_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE user DROP daily_visit_objective');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE user_objective DROP FOREIGN KEY FK_B9767CE5A76ED395');
        $this->addSql('DROP TABLE user_objective');
        $this->addSql('ALTER TABLE `user` ADD daily_visit_objective INT DEFAULT NULL');
    }
}
