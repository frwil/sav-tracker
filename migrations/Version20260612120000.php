<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260612120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Module commercial : 8 nouvelles entités + colonnes plannedAt/completedAt sur visit + type sur customer';
    }

    public function up(Schema $schema): void
    {
        // ─── 1. ALTER TABLE customer — ajout type (FARM/FEED_STORE/BOTH) ───
        $this->addSql('ALTER TABLE customer ADD type VARCHAR(20) DEFAULT NULL');

        // ─── 2. CREATE TABLE sales_visit ───
        $this->addSql('CREATE TABLE sales_visit (
            id INT AUTO_INCREMENT NOT NULL,
            sales_rep_id INT NOT NULL,
            customer_id INT NOT NULL,
            planned_at DATETIME DEFAULT NULL,
            visited_at DATETIME DEFAULT NULL,
            completed_at DATETIME DEFAULT NULL,
            gps_coordinates VARCHAR(255) DEFAULT NULL,
            objective LONGTEXT NOT NULL,
            general_comment LONGTEXT DEFAULT NULL,
            closed TINYINT(1) DEFAULT 0 NOT NULL,
            activated TINYINT(1) DEFAULT 1 NOT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_7F8A3C2E9B4C3A1F (sales_rep_id),
            INDEX IDX_7F8A3C2E9395C3F3 (customer_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE sales_visit ADD CONSTRAINT FK_7F8A3C2E9B4C3A1F FOREIGN KEY (sales_rep_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE sales_visit ADD CONSTRAINT FK_7F8A3C2E9395C3F3 FOREIGN KEY (customer_id) REFERENCES customer (id)');

        // ─── 4. CREATE TABLE price_audit ───
        $this->addSql('CREATE TABLE price_audit (
            id INT AUTO_INCREMENT NOT NULL,
            visit_id INT NOT NULL,
            product_code VARCHAR(50) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            expected_price DOUBLE PRECISION DEFAULT NULL,
            observed_price DOUBLE PRECISION NOT NULL,
            competitor1_name VARCHAR(100) DEFAULT NULL,
            competitor1_price DOUBLE PRECISION DEFAULT NULL,
            competitor2_name VARCHAR(100) DEFAULT NULL,
            competitor2_price DOUBLE PRECISION DEFAULT NULL,
            competitor3_name VARCHAR(100) DEFAULT NULL,
            competitor3_price DOUBLE PRECISION DEFAULT NULL,
            is_promo_active TINYINT(1) DEFAULT 0 NOT NULL,
            promo_price DOUBLE PRECISION DEFAULT NULL,
            price_compliance TINYINT(1) DEFAULT 0 NOT NULL,
            comment LONGTEXT DEFAULT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_3B8A4F1A3C5E9B2D (visit_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE price_audit ADD CONSTRAINT FK_3B8A4F1A3C5E9B2D FOREIGN KEY (visit_id) REFERENCES sales_visit (id)');

        // ─── 5. CREATE TABLE stock_audit ───
        $this->addSql('CREATE TABLE stock_audit (
            id INT AUTO_INCREMENT NOT NULL,
            visit_id INT NOT NULL,
            product_code VARCHAR(50) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            is_must_stock TINYINT(1) DEFAULT 0 NOT NULL,
            stock_quantity DOUBLE PRECISION DEFAULT NULL,
            stock_unit VARCHAR(10) DEFAULT \'SAC\' NOT NULL,
            is_out_of_stock TINYINT(1) DEFAULT 0 NOT NULL,
            is_fifo_compliant TINYINT(1) DEFAULT 1 NOT NULL,
            oldest_mfg_date DATE DEFAULT NULL,
            expiry_date DATE DEFAULT NULL,
            freshness_score SMALLINT DEFAULT NULL,
            packaging_intact TINYINT(1) DEFAULT 1 NOT NULL,
            comment LONGTEXT DEFAULT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_5C9B6D2E4F1A8C3B (visit_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE stock_audit ADD CONSTRAINT FK_5C9B6D2E4F1A8C3B FOREIGN KEY (visit_id) REFERENCES sales_visit (id)');

        // ─── 6. CREATE TABLE quality_audit ───
        $this->addSql('CREATE TABLE quality_audit (
            id INT AUTO_INCREMENT NOT NULL,
            visit_id INT NOT NULL,
            damaged_bags_count SMALLINT DEFAULT NULL,
            damaged_bags_rate DOUBLE PRECISION DEFAULT NULL,
            storage_on_pallets TINYINT(1) DEFAULT 1 NOT NULL,
            storage_dry_area TINYINT(1) DEFAULT 1 NOT NULL,
            storage_protected TINYINT(1) DEFAULT 1 NOT NULL,
            pest_presence TINYINT(1) DEFAULT 0 NOT NULL,
            mold_presence TINYINT(1) DEFAULT 0 NOT NULL,
            odor_issue TINYINT(1) DEFAULT 0 NOT NULL,
            cleanliness_score SMALLINT DEFAULT NULL,
            overall_quality_score SMALLINT DEFAULT NULL,
            comment LONGTEXT DEFAULT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            UNIQUE INDEX UNIQ_7D2E8A4B1F3C6D9E (visit_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE quality_audit ADD CONSTRAINT FK_7D2E8A4B1F3C6D9E FOREIGN KEY (visit_id) REFERENCES sales_visit (id)');

        // ─── 7. CREATE TABLE visibility_audit ───
        $this->addSql('CREATE TABLE visibility_audit (
            id INT AUTO_INCREMENT NOT NULL,
            visit_id INT NOT NULL,
            has_posters TINYINT(1) DEFAULT 0 NOT NULL,
            has_banners TINYINT(1) DEFAULT 0 NOT NULL,
            has_calendars TINYINT(1) DEFAULT 0 NOT NULL,
            has_branded_sacs TINYINT(1) DEFAULT 0 NOT NULL,
            signage_visible TINYINT(1) DEFAULT 0 NOT NULL,
            branded_items JSON DEFAULT NULL,
            our_visibility_percent SMALLINT DEFAULT NULL,
            overall_visibility_score SMALLINT DEFAULT NULL,
            comment LONGTEXT DEFAULT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            UNIQUE INDEX UNIQ_9E3F6C5D2A1B8E4F (visit_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE visibility_audit ADD CONSTRAINT FK_9E3F6C5D2A1B8E4F FOREIGN KEY (visit_id) REFERENCES sales_visit (id)');

        // ─── 8. CREATE TABLE pre_order ───
        $this->addSql('CREATE TABLE pre_order (
            id INT AUTO_INCREMENT NOT NULL,
            visit_id INT NOT NULL,
            customer_id INT NOT NULL,
            product_code VARCHAR(50) NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            quantity DOUBLE PRECISION NOT NULL,
            unit VARCHAR(10) DEFAULT \'SAC\' NOT NULL,
            unit_price DOUBLE PRECISION NOT NULL,
            total_value DOUBLE PRECISION NOT NULL,
            status VARCHAR(20) DEFAULT \'PREORDER\' NOT NULL,
            expected_delivery_at DATETIME DEFAULT NULL,
            delivered_at DATETIME DEFAULT NULL,
            cancellation_reason VARCHAR(100) DEFAULT NULL,
            comment LONGTEXT DEFAULT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            updated_at DATETIME DEFAULT NULL,
            INDEX IDX_4A1D7F3B6E8C9A2D (visit_id),
            INDEX IDX_4A1D7F3B9395C3F3 (customer_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE pre_order ADD CONSTRAINT FK_4A1D7F3B6E8C9A2D FOREIGN KEY (visit_id) REFERENCES sales_visit (id)');
        $this->addSql('ALTER TABLE pre_order ADD CONSTRAINT FK_4A1D7F3B9395C3F3 FOREIGN KEY (customer_id) REFERENCES customer (id)');

        // ─── 9. CREATE TABLE sales_activity ───
        $this->addSql('CREATE TABLE sales_activity (
            id INT AUTO_INCREMENT NOT NULL,
            visit_id INT NOT NULL,
            activity_type VARCHAR(30) NOT NULL,
            is_completed TINYINT(1) DEFAULT 0 NOT NULL,
            completed_at DATETIME DEFAULT NULL,
            comment LONGTEXT DEFAULT NULL,
            sort_order SMALLINT DEFAULT 0 NOT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_2D5E8F1C4A7B9E3D (visit_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE sales_activity ADD CONSTRAINT FK_2D5E8F1C4A7B9E3D FOREIGN KEY (visit_id) REFERENCES sales_visit (id)');

        // ─── 10. CREATE TABLE sales_photo ───
        $this->addSql('CREATE TABLE sales_photo (
            id INT AUTO_INCREMENT NOT NULL,
            visit_id INT NOT NULL,
            content_url VARCHAR(500) NOT NULL,
            caption VARCHAR(255) DEFAULT NULL,
            category VARCHAR(20) NOT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_6B1F5A3D8E2C4F7A (visit_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE sales_photo ADD CONSTRAINT FK_6B1F5A3D8E2C4F7A FOREIGN KEY (visit_id) REFERENCES sales_visit (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE sales_photo DROP FOREIGN KEY FK_6B1F5A3D8E2C4F7A');
        $this->addSql('ALTER TABLE sales_activity DROP FOREIGN KEY FK_2D5E8F1C4A7B9E3D');
        $this->addSql('ALTER TABLE pre_order DROP FOREIGN KEY FK_4A1D7F3B6E8C9A2D');
        $this->addSql('ALTER TABLE pre_order DROP FOREIGN KEY FK_4A1D7F3B9395C3F3');
        $this->addSql('ALTER TABLE visibility_audit DROP FOREIGN KEY FK_9E3F6C5D2A1B8E4F');
        $this->addSql('ALTER TABLE quality_audit DROP FOREIGN KEY FK_7D2E8A4B1F3C6D9E');
        $this->addSql('ALTER TABLE stock_audit DROP FOREIGN KEY FK_5C9B6D2E4F1A8C3B');
        $this->addSql('ALTER TABLE price_audit DROP FOREIGN KEY FK_3B8A4F1A3C5E9B2D');
        $this->addSql('ALTER TABLE sales_visit DROP FOREIGN KEY FK_7F8A3C2E9B4C3A1F');
        $this->addSql('ALTER TABLE sales_visit DROP FOREIGN KEY FK_7F8A3C2E9395C3F3');

        $this->addSql('DROP TABLE sales_photo');
        $this->addSql('DROP TABLE sales_activity');
        $this->addSql('DROP TABLE pre_order');
        $this->addSql('DROP TABLE visibility_audit');
        $this->addSql('DROP TABLE quality_audit');
        $this->addSql('DROP TABLE stock_audit');
        $this->addSql('DROP TABLE price_audit');
        $this->addSql('DROP TABLE sales_visit');

        $this->addSql('ALTER TABLE customer DROP COLUMN type');
    }
}
