-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: globalcapitaldb
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.24.04.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `accounting_expenses`
--

DROP TABLE IF EXISTS `accounting_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounting_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `expense_date` date NOT NULL,
  `category` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `payment_method` enum('cash','bank','main') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `reference_no` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `accounting_expenses_company_id_expense_date_index` (`company_id`,`expense_date`),
  KEY `accounting_expenses_company_id_category_index` (`company_id`,`category`),
  CONSTRAINT `accounting_expenses_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounting_expenses`
--

LOCK TABLES `accounting_expenses` WRITE;
/*!40000 ALTER TABLE `accounting_expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounting_expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `date` date NOT NULL,
  `in_time` time DEFAULT NULL,
  `out_time` time DEFAULT NULL,
  `work_hours` decimal(5,2) DEFAULT NULL,
  `status` enum('present','absent','late','half_day') COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_employee_id_date_unique` (`employee_id`,`date`),
  KEY `attendance_tenant_id_foreign` (`tenant_id`),
  KEY `attendance_branch_id_foreign` (`branch_id`),
  CONSTRAINT `attendance_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `attendance_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `attendance_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES (1,1,1,1,'2026-06-10','08:00:00','17:00:00',NULL,'present','cc','2026-06-10 08:47:05','2026-06-10 08:48:05');
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_documents`
--

DROP TABLE IF EXISTS `candidate_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `candidate_id` bigint unsigned NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `candidate_documents_candidate_id_foreign` (`candidate_id`),
  KEY `candidate_documents_type_index` (`type`),
  CONSTRAINT `candidate_documents_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_documents`
--

LOCK TABLES `candidate_documents` WRITE;
/*!40000 ALTER TABLE `candidate_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `candidate_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_educations`
--

DROP TABLE IF EXISTS `candidate_educations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_educations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `candidate_id` bigint unsigned NOT NULL,
  `institution` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `degree` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `field_of_study` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `grade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `candidate_educations_candidate_id_foreign` (`candidate_id`),
  CONSTRAINT `candidate_educations_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_educations`
--

LOCK TABLES `candidate_educations` WRITE;
/*!40000 ALTER TABLE `candidate_educations` DISABLE KEYS */;
/*!40000 ALTER TABLE `candidate_educations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_experiences`
--

DROP TABLE IF EXISTS `candidate_experiences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_experiences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `candidate_id` bigint unsigned NOT NULL,
  `company` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT '0',
  `responsibilities` text COLLATE utf8mb4_unicode_ci,
  `achievements` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `candidate_experiences_candidate_id_foreign` (`candidate_id`),
  CONSTRAINT `candidate_experiences_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_experiences`
--

LOCK TABLES `candidate_experiences` WRITE;
/*!40000 ALTER TABLE `candidate_experiences` DISABLE KEYS */;
/*!40000 ALTER TABLE `candidate_experiences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_interview_participants`
--

DROP TABLE IF EXISTS `candidate_interview_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_interview_participants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `candidate_interview_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cip_interview_employee_unique` (`candidate_interview_id`,`employee_id`),
  KEY `cip_employee_fk` (`employee_id`),
  CONSTRAINT `cip_employee_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cip_interview_fk` FOREIGN KEY (`candidate_interview_id`) REFERENCES `candidate_interviews` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_interview_participants`
--

LOCK TABLES `candidate_interview_participants` WRITE;
/*!40000 ALTER TABLE `candidate_interview_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `candidate_interview_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_interviewers`
--

DROP TABLE IF EXISTS `candidate_interviewers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_interviewers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `candidate_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_interviewers_candidate_id_employee_id_unique` (`candidate_id`,`employee_id`),
  KEY `candidate_interviewers_employee_id_foreign` (`employee_id`),
  CONSTRAINT `candidate_interviewers_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `candidate_interviewers_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_interviewers`
--

LOCK TABLES `candidate_interviewers` WRITE;
/*!40000 ALTER TABLE `candidate_interviewers` DISABLE KEYS */;
/*!40000 ALTER TABLE `candidate_interviewers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_interviews`
--

DROP TABLE IF EXISTS `candidate_interviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_interviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `candidate_id` bigint unsigned NOT NULL,
  `interview_date` date NOT NULL,
  `interview_time` time NOT NULL,
  `interview_notes` text COLLATE utf8mb4_unicode_ci,
  `score` decimal(5,2) DEFAULT NULL,
  `result` enum('pending','pass','fail') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `candidate_interviews_candidate_id_foreign` (`candidate_id`),
  CONSTRAINT `candidate_interviews_candidate_id_foreign` FOREIGN KEY (`candidate_id`) REFERENCES `candidates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_interviews`
--

LOCK TABLES `candidate_interviews` WRITE;
/*!40000 ALTER TABLE `candidate_interviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `candidate_interviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidates`
--

DROP TABLE IF EXISTS `candidates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `candidate_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `date_of_birth` date DEFAULT NULL,
  `position_applied` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cv_path` text COLLATE utf8mb4_unicode_ci,
  `photo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('applied','shortlisted','interviewed','selected','rejected','hired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'applied',
  `interview_date` date DEFAULT NULL,
  `interview_time` time DEFAULT NULL,
  `interview_notes` text COLLATE utf8mb4_unicode_ci,
  `appointment_letter_path` text COLLATE utf8mb4_unicode_ci,
  `joining_date` date DEFAULT NULL,
  `expected_salary` decimal(10,2) DEFAULT NULL,
  `offered_salary` decimal(10,2) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidates_candidate_code_unique` (`candidate_code`),
  UNIQUE KEY `candidates_email_unique` (`email`),
  KEY `candidates_tenant_id_foreign` (`tenant_id`),
  KEY `candidates_branch_id_foreign` (`branch_id`),
  CONSTRAINT `candidates_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `candidates_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidates`
--

LOCK TABLES `candidates` WRITE;
/*!40000 ALTER TABLE `candidates` DISABLE KEYS */;
/*!40000 ALTER TABLE `candidates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Sri Lanka',
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LKR',
  `logo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_user_id` bigint unsigned DEFAULT NULL,
  `opening_asset` decimal(18,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `companies_email_unique` (`email`),
  KEY `companies_manager_user_id_foreign` (`manager_user_id`),
  CONSTRAINT `companies_manager_user_id_foreign` FOREIGN KEY (`manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (1,'Global Capital Credit','globalcapital@gmail.com','310C/1/1 Kandy Road,Yatirawana,Wattegama','0776383680',NULL,'Sri Lanka','LKR','company_logos/fGkdXMsbMPJ2smUzZkYZXRMhmAELeRh2X3278Z4w.jpg',NULL,0.00,'2026-06-10 06:57:46','2026-06-10 06:58:52');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_accounts`
--

DROP TABLE IF EXISTS `company_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `account_type` enum('main','cash','bank') COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_code` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(190) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_branch` varchar(190) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opening_balance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `current_balance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_accounts_company_id_account_type_index` (`company_id`,`account_type`),
  CONSTRAINT `company_accounts_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_accounts`
--

LOCK TABLES `company_accounts` WRITE;
/*!40000 ALTER TABLE `company_accounts` DISABLE KEYS */;
INSERT INTO `company_accounts` VALUES (1,1,'main','Branch Main Account (Global Capital Credit)','3000',NULL,NULL,NULL,0.00,0.00,1,NULL,1,'2026-06-10 06:57:46','2026-06-10 06:57:46'),(2,1,'cash','Cash Account (Global Capital Credit)','1100',NULL,NULL,NULL,0.00,0.00,1,NULL,1,'2026-06-10 06:57:46','2026-06-10 06:57:46');
/*!40000 ALTER TABLE `company_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_document_templates`
--

DROP TABLE IF EXISTS `company_document_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_document_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `company_id` bigint unsigned NOT NULL,
  `template_type` enum('loan_agreement','reminder_letter','arrears_letter','mortgage_agreement','mortgage_reminder','mortgage_legal_letter') COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_document_templates_uploaded_by_foreign` (`uploaded_by`),
  KEY `idx_company_template_active` (`company_id`,`template_type`,`is_active`),
  CONSTRAINT `company_document_templates_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `company_document_templates_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_document_templates`
--

LOCK TABLES `company_document_templates` WRITE;
/*!40000 ALTER TABLE `company_document_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `company_document_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_documents`
--

DROP TABLE IF EXISTS `customer_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NOT NULL,
  `document_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_documents_customer_id_foreign` (`customer_id`),
  KEY `customer_documents_uploaded_by_foreign` (`uploaded_by`),
  CONSTRAINT `customer_documents_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_documents_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_documents`
--

LOCK TABLES `customer_documents` WRITE;
/*!40000 ALTER TABLE `customer_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `customer_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nic_passport` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permanent_address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_address` text COLLATE utf8mb4_unicode_ci,
  `photo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employment_type` enum('salaried','self_employed','business') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date NOT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `marital_status` enum('single','married','divorced','widowed') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occupation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monthly_income` decimal(12,2) DEFAULT NULL,
  `other_income_sources` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `existing_loans` tinyint(1) NOT NULL DEFAULT '0',
  `monthly_loan_obligations` decimal(12,2) DEFAULT NULL,
  `credit_score` int DEFAULT NULL,
  `customer_type` enum('individual','business') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'individual',
  `status` enum('active','inactive','blacklisted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_customer_code_unique` (`customer_code`),
  UNIQUE KEY `customers_nic_passport_unique` (`nic_passport`),
  UNIQUE KEY `customers_email_unique` (`email`),
  KEY `customers_branch_id_foreign` (`branch_id`),
  KEY `customers_created_by_foreign` (`created_by`),
  KEY `customers_tenant_id_branch_id_index` (`tenant_id`,`branch_id`),
  KEY `customers_customer_code_index` (`customer_code`),
  KEY `customers_status_index` (`status`),
  CONSTRAINT `customers_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `customers_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `customers_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,1,1,'001','Sudharma','Hewavitharana','199306701924-1@deskoffinance.local','0713370393','199306701924','Eheliyagoda','Eheliyagoda',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','inactive',1,'2026-06-10 09:07:00','2026-06-16 08:49:13'),(2,1,1,'11','W.G','Champika Priyadarshani','857123107v-4@deskoffinance.local','0764674001','857123107V','No.36,Pahalawela, Mathale','No.36,Pahalawela, Mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',1,'2026-06-10 10:59:56','2026-06-10 10:59:56'),(3,1,1,'08','Chandrika','padhmini kumari','198561800220-8@deskoffinance.local','0741626942','198561800220','No68/2A janapadhaya,kotuwegedara,mathale','No68/2A janapadhaya,kotuwegedara,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-11 08:59:18','2026-06-11 08:59:18'),(4,1,1,'30','Ruwini','sankalpani melan','200378111538-14@deskoffinance.local','0775402477','200378111538','37/3 pahalawela,mathale','37/3 pahalawela,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-11 09:17:25','2026-06-11 09:17:25'),(5,1,1,'09','Ranhawadi','gedara airin mangali kumari ariyawansha','665723402v-15@deskoffinance.local','0758580143','665723402V','29/A Janapadhaya,kotuwegedara,mathale','29/A Janapadhaya,kotuwegedara,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-12 00:47:57','2026-06-12 00:47:57'),(6,1,1,'10','Lidhagawa','gedara sumanawathi','196854502987-16@deskoffinance.local','0750828634','196854502987','No18/4A janapadhaya,kotuwegedara,mathale','No18/4A janapadhaya,kotuwegedara,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-12 01:00:09','2026-06-12 01:00:09'),(7,1,1,'53','Kalpage','priyangika aberathna','197285102253-17@deskoffinance.local','0726502434','197285102253','39/A janapadhaya,kotuwegedara,mathale','39/A janapadhaya,kotuwegedara,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-12 01:13:51','2026-06-12 01:13:51'),(8,1,1,'J10','Amila','B','199343454345-19@deskoffinance.local','0712323223','199343454345','Eheliyagoda','Eheliyagoda',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','inactive',1,'2026-06-13 16:47:34','2026-06-16 08:30:20'),(9,1,1,'50','Suppaiya','menagayi','677201975v-20@deskoffinance.local','0772551931','677201975V','No20 sampath uyana, dikkiriya','No20 sampath uyana, dikkiriya',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-15 09:54:44','2026-06-15 09:54:44'),(10,1,1,'48','Podisinham','vigneshwari','198451410025-21@deskoffinance.local','0774750504','198451410025','No155/8,kaludewala,mathale','No155/8,kaludewala,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-15 10:10:35','2026-06-15 10:10:35'),(11,1,1,'51','Mohidin','pichchei badhurdeen samsun nisa','596871720v-22@deskoffinance.local','0774139432','596871720V','26/B Sampathuyana,dhikkiriya','26/B Sampathuyana,dhikkiriya',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-15 10:22:58','2026-06-15 10:22:58'),(12,1,1,'49','Krishnakumar','harshani','200376013684-23@deskoffinance.local','0775686446','200376013684','No20 sampathuyana dhikkiriya','No20 sampathuyana dhikkiriya',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-15 10:32:59','2026-06-15 10:32:59'),(13,1,1,'47','Pachachamuththu','wasanthi','197471202202-24@deskoffinance.local','0741978470','197471202202','No61/1 sampathuyana,dikkiriya','No61/1 sampathuyana,dikkiriya',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-15 10:52:42','2026-06-15 10:52:42'),(14,1,1,'52','Badurdeen','jinathul munawapra','695281617v-25@deskoffinance.local','0763346301','695281617V','No6 sampathuyana,dikkiriya','No6 sampathuyana,dikkiriya',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-15 10:59:02','2026-06-15 10:59:02'),(15,1,1,'26','Kulathunga','mudhiyanselage udheshika prabodhani','948522365v-26@deskoffinance.local','0779348823','948522365V','No 40/A narankotuwa road,agalawatha,mathale','No 40/A narankotuwa road,agalawatha,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-15 11:09:59','2026-06-15 11:09:59'),(16,1,1,'28','Kandhe','yamanlage gedara niluka dhamayanthi','198853600548-27@deskoffinance.local','0756348850','198853600548','No45 harasgama road,agalawatha mathale','No45 harasgama road,agalawatha mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-15 11:21:03','2026-06-15 11:21:03'),(17,1,1,'27','Ranwalage','dhulanji sadhushi madhushani pinthu','937381930v-28@deskoffinance.local','0761172944','937381930V','No23,agalawatha road,mathale','No23,agalawatha road,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 00:51:51','2026-06-16 00:51:51'),(18,1,1,'25','Koswaththa','gedara,ranjani,koswatha','197962703020-29@deskoffinance.local','0775683441','197962703020','No37/5,agalawatha road,mathale','No37/5,agalawatha road,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 01:00:13','2026-06-16 01:00:13'),(19,1,1,'29','K.M','Meranga madhumali kulathunga','200075300850-30@deskoffinance.local','0779348823','200075300850','No 85 Agalawatha road,mathale','No 85 Agalawatha road,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 01:11:21','2026-06-16 01:11:21'),(20,1,1,'46','Liyanagamage','dhammika chandhrakumari','197772500418-31@deskoffinance.local','0773536193','197772500418','No 65/2 Dhobawela,mahawela','No 65/2 Dhobawela,mahawela',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 01:22:01','2026-06-16 01:22:01'),(21,1,1,'45','Galgoda','heene gedara premalatha','665260232v-32@deskoffinance.local','0715432154','665260232V','No2 dhobawela,mahawela','No2 dhobawela,mahawela',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 01:58:40','2026-06-16 01:58:40'),(22,1,1,'33','Nisar','pathima sarmila','875443399v-33@deskoffinance.local','0772386690','875443399V','No 22 Ulpatha Pitiya kibula','No 22 Ulpatha Pitiya kibula',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 02:05:43','2026-06-16 02:05:43'),(23,1,1,'44','Galhena','gamage hemantha sadasili gamage','196185004484-34@deskoffinance.local','0765688654','196185004484','Kawatayamuna,mahawela','Kawatayamuna,mahawela',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 02:07:21','2026-06-16 02:07:21'),(24,1,1,'43','Hitihami','mudiyanselage cgampa amarasinha','768210837v-35@deskoffinance.local','0773926734','768210837V','Oyagedara,dhobawela,mahawela','Oyagedara,dhobawela,mahawela',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 02:17:59','2026-06-16 02:17:59'),(25,1,1,'31','Maharam','Hawadi Dura Gedara Nayaomi Nuisansala Gunawardhana','956640741v-36@deskoffinance.local','0743575455','956640741V','616 Bandarapola waththa kiwla mathale','616 Bandarapola waththa kiwla mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 02:44:26','2026-06-16 02:44:26'),(26,1,1,'07','Musthaja','Sithi Pathima','847935200v-37@deskoffinance.local','0753864141','847935200V','No 8 Parawththa Kaludewala Mathale','No 8 Parawththa Kaludewala Mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 02:51:25','2026-06-16 02:51:25'),(27,1,1,'40','Welhenage','sardha palani','196969701218-38@deskoffinance.local','0781623798','196969701218','Oyagedara,dhobawela,mahawela','Oyagedara,dhobawela,mahawela',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 02:52:09','2026-06-16 02:52:09'),(28,1,1,'06','Suppaiya','Niroshani','199969410511-39@deskoffinance.local','0778910376','199969410511','52/1 Bandarapolawaththa Kiwla Mathale','52/1 Bandarapolawaththa Kiwla Mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 02:56:44','2026-06-16 02:56:44'),(29,1,1,'39','Galwete','gedara mallika wijesinha','197765202899-40@deskoffinance.local','0767752187','197765202899','No77 Makulussa janapadhya,old dhobawela,mathale','No77 Makulussa janapadhya,old dhobawela,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 02:57:21','2026-06-16 02:57:21'),(30,1,1,'05','Mohamad','Hanisha Sithi Asfa','975230538v-41@deskoffinance.local','0768894405','975230538V','Diyanillawaththa Kale Bokka Madu Kale','Diyanillawaththa Kale Bokka Madu Kale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:03:38','2026-06-16 03:03:38'),(31,1,1,'38','I.U.W.M','Samanthi kumari wijethunga','787191398v-42@deskoffinance.local','0712488094','787191398V','No4 galwadukubura,kaudupelalla','No4 galwadukubura,kaudupelalla',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:05:30','2026-06-16 03:05:30'),(32,1,1,'03','Abdul','kapur Pathima Sumeiya','199578303403-43@deskoffinance.local','0763733305','199578303403','46/1 Kiwla Mathale','46/1 Kiwla Mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:12:35','2026-06-16 03:12:35'),(33,1,1,'22','Wathegedara','dinushka subashini karunarathna','985560773v-44@deskoffinance.local','0761833696','985560773V','Weniwelgolla,Dhankandha','Weniwelgolla,Dhankandha',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:15:06','2026-06-16 03:15:06'),(34,1,1,'23','Koralegedara,chandrika','kunari thilakarathna','765792703v-45@deskoffinance.local','0766899460','765792703V','Pahaladhankandha,raththota','Pahaladhankandha,raththota',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:19:58','2026-06-16 03:19:58'),(35,1,1,'02','Samsudeen','Siththi Nalisha','796832355v-46@deskoffinance.local','0765457424','796832355V','8/4 Kiwla','8/4 Kiwla',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:21:21','2026-06-16 03:21:21'),(36,1,1,'20','M.A.Isanka','dhulanjali senevirathna','198285902157-47@deskoffinance.local','0766843675','198285902157','Dhankandha,Raththota','Dhankandha,Raththota',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:31:07','2026-06-16 03:31:07'),(37,1,1,'01','Abdul','Raheem Kagila Umma','199083301206-48@deskoffinance.local','0779512365','199083301206','20 Bandara Pola Waththa kiwla mathale','20 Bandara Pola Waththa kiwla mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:31:30','2026-06-16 03:31:30'),(38,1,1,'21','De','kiri nalani','197361102051-49@deskoffinance.local','0776003976','197361102051','Dhabagolla dhankandha','Dhabagolla dhankandha',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:36:08','2026-06-16 03:36:08'),(39,1,1,'54','Ismail','Pathima Nuasran','876413329v-50@deskoffinance.local','0760780844','876413329V','52/6 Gongawala Road Mathale','52/6 Gongawala Road Mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:36:17','2026-06-16 03:36:17'),(40,1,1,'34','Galapitigedara','nirosha malkanthi','907901300v-51@deskoffinance.local','0760795330','907901300V','Dhabagolla dhankandha','Dhabagolla dhankandha',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 03:40:00','2026-06-16 03:40:00'),(41,1,1,'37','Anthoni','magarat Meeri','687824210v-52@deskoffinance.local','0775793310','687824210V','Looanvil Raththota','Looanvil Raththota',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 04:47:17','2026-06-16 04:47:17'),(42,1,1,'36','Welushanthi','Nesanadan','756070665v-53@deskoffinance.local','0775510569','756070665V','126Nikaloya Road Raththota','126Nikaloya Road Raththota',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 04:51:48','2026-06-16 04:51:48'),(43,1,1,'35','Chandrasekaram','Nandrabhashi','200382913557-54@deskoffinance.local','0760909135','200382913557','No 1 16 Men Road Raththota','No 1 16 Men Road Raththota',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 04:57:50','2026-06-16 04:57:50'),(44,1,1,'17','Nagaraja','Maheshwari','875180410v-55@deskoffinance.local','077652869','875180410V','Alakala Gammaduwa','Alakala Gammaduwa',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 05:02:55','2026-06-16 05:02:55'),(45,1,1,'16','Ganeshanadhan','Vijaya Chandrika','197679802585-56@deskoffinance.local','0766981265','197679802585','30/4 Mellagolla Raththota','30/4 Mellagolla Raththota',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 05:08:08','2026-06-16 05:08:08'),(46,1,1,'15','Naganadan','Bawadarani','200072403770-57@deskoffinance.local','0770528608','200072403770','30/4 Mellagolla Road Raththota','30/4 Mellagolla Road Raththota',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 05:15:41','2026-06-16 05:15:41'),(47,1,1,'14','Abdulgadar','Fathima Aisa','815594720v-58@deskoffinance.local','0711332201','815594720V','35/25 Gagabada Road Palamu Patumaga Kaludewala Mattale','35/25 Gagabada Road Palamu Patumaga Kaludewala Mattale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 05:20:55','2026-06-16 05:20:55'),(48,1,1,'19','Karupaiya','Vijaya Kumari','767761090v-59@deskoffinance.local','0767628341','767761090V','301 Lonweel Waththa Loanweel Raththota','301 Lonweel Waththa Loanweel Raththota',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 05:28:13','2026-06-16 05:28:13'),(49,1,1,'13','Murugaiya','Gandhimathi','198383101946-60@deskoffinance.local','0788547387','198383101946','15/1  sprin Mount waththa kalugalthenna Raththota Gammaduwa','15/1  sprin Mount waththa kalugalthenna Raththota Gammaduwa',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 05:34:27','2026-06-16 05:34:27'),(50,1,1,'12','Sewanu','Maheswari','19876501367-61@deskoffinance.local','0766317928','19876501367','No 40 Nikaloya Road Raththota','No 40 Nikaloya Road Raththota',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 05:39:15','2026-06-16 05:39:15'),(51,1,1,'18','Subramaniyam','Nandani','686590704v-62@deskoffinance.local','0763130151','686590704V','No 16 Men Road Raththota','No 16 Men Road Raththota',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 05:43:56','2026-06-16 05:43:56'),(52,1,1,'42','Ukkurala','gamaralalage Nelum Kumudhu Mali Senavirathna','917830274v-63@deskoffinance.local','0776693334','917830274V','25/1 Kawataya Amuna Kawedupella','25/1 Kawataya Amuna Kawedupella',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 09:02:42','2026-06-16 09:02:42'),(53,1,1,'04','Dushika','suppaiya','200253102762-64@deskoffinance.local','0760735018','200253102762','24/4 bandara polwatha kiula matgale','24/4 bandara polwatha kiula matgale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 09:07:48','2026-06-16 09:07:48'),(54,1,1,'41','Abekon','Herath Mudiyanselage Indrani Kumari Wicramashinha','716721035v-66@deskoffinance.local','0781623798','716721035V','No 126 /3 Udugama Palapathwala','No 126 /3 Udugama Palapathwala',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 09:08:30','2026-06-16 09:08:30'),(55,1,1,'32','Jamaldhin','fesmidhen filesiya','198084702562-67@deskoffinance.local','0741277459','198084702562','No22 ulpatha pitiya kiula','No22 ulpatha pitiya kiula',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 09:12:33','2026-06-16 09:12:33'),(56,1,1,'234','Adhikari','Mudiyanselage Samanma','857952561v-68@deskoffinance.local','0769107367','857952561V','pahalagama Dankanda','pahalagama Dankanda',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 09:13:32','2026-06-16 09:13:32'),(57,1,1,'55','Warnakulasuriya','Meri Hayasin Pranandhu','7377002090v-69@deskoffinance.local','0772559861','7377002090V','36/3Purijjala,Mathale','36/3Purijjala,Mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 09:40:35','2026-06-16 09:40:35'),(58,1,1,'56','Ilangan','gedara swarnalatha','675633606v-70@deskoffinance.local','0769868723','675633606V','No37/B Purijjala,Mathale','No37/B Purijjala,Mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 09:47:26','2026-06-16 09:47:26'),(59,1,1,'57','Wijesinha','Arachilage Anusha Damayanthi','857293908v-71@deskoffinance.local','0785868446','857293908V','1613 Janapadhya Purijjala,Mathale','1613 Janapadhya Purijjala,Mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 10:04:31','2026-06-16 10:04:31'),(60,1,1,'58','Marikkari','Siththi Ariyasa Umma','196155100831-72@deskoffinance.local','0757023734','196155100831','01,kalalpitiya,Ukuwela','01,kalalpitiya,Ukuwela',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 10:09:18','2026-06-16 10:09:18'),(61,1,1,'59','Ihalagedara','Shriyani Chandralatha','657773190v-73@deskoffinance.local','0784916973','657773190V','135/1 warakamuna,Ukuwela','135/1 warakamuna,Ukuwela',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 10:29:47','2026-06-16 10:29:47'),(62,1,1,'60','Pramodhya','Harindhrani Sisiliya Luviss','707951710v-74@deskoffinance.local','0740066903','707951710V','12/A purijjala,mathale','12/A purijjala,mathale',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 10:34:10','2026-06-16 10:34:10'),(63,1,1,'61','Ibrahim','Samsadhu Begam','196765402663-75@deskoffinance.local','0774841940','196765402663','134 Kanday Road,Warakamuna','134 Kanday Road,Warakamuna',NULL,NULL,NULL,NULL,'1990-01-01','other',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,'individual','active',3,'2026-06-16 10:38:38','2026-06-16 10:38:38');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `departments_tenant_id_name_unique` (`tenant_id`,`name`),
  KEY `departments_branch_id_foreign` (`branch_id`),
  CONSTRAINT `departments_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `departments_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,1,1,'Administration','Administration',1,'2026-06-10 07:42:43','2026-06-10 07:42:43'),(2,1,1,'Collections Department','Collections Department',1,'2026-06-10 07:43:50','2026-06-10 07:43:50'),(3,1,1,'Customer Management (CRM)','Customer Management (CRM)',1,'2026-06-10 07:44:04','2026-06-10 07:44:04'),(4,1,1,'Field Operations','Field Operations',1,'2026-06-10 07:44:22','2026-06-10 07:44:22'),(5,1,1,'Finance & Accounting','Finance & Accounting',1,'2026-06-10 07:44:46','2026-06-10 07:44:46'),(6,1,1,'Human Resources (HR)','Human Resources (HR)',1,'2026-06-10 07:45:23','2026-06-10 07:45:23'),(7,1,1,'IT / System Management','IT / System Management',1,'2026-06-10 07:45:49','2026-06-10 07:45:49'),(8,1,1,'Loan Management Department','Loan Management Department',1,'2026-06-10 07:52:38','2026-06-10 07:52:38'),(9,1,1,'Reporting & Analytics','Reporting & Analytics',1,'2026-06-10 07:52:50','2026-06-10 07:52:50'),(10,1,1,'Risk & Compliance','Risk & Compliance',1,'2026-06-10 07:53:18','2026-06-10 07:53:18');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `designations`
--

DROP TABLE IF EXISTS `designations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `designations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `salary_range_min` decimal(10,2) DEFAULT NULL,
  `salary_range_max` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `designations_tenant_id_name_unique` (`tenant_id`,`name`),
  KEY `designations_branch_id_foreign` (`branch_id`),
  CONSTRAINT `designations_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `designations_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `designations`
--

LOCK TABLES `designations` WRITE;
/*!40000 ALTER TABLE `designations` DISABLE KEYS */;
INSERT INTO `designations` VALUES (1,1,1,'Admin / System Admin','Admin / System Admin',NULL,NULL,1,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(2,1,1,'Branch Manager','Branch Manager',NULL,NULL,1,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(3,1,1,'Loan Officer','Loan Officer',NULL,NULL,1,'2026-06-10 08:31:33','2026-06-10 08:31:33'),(4,1,1,'Credit Officer / Risk Officer','Credit Officer / Risk Officer',NULL,NULL,1,'2026-06-10 08:31:52','2026-06-10 08:31:52'),(5,1,1,'Collection Officer (Field Officer)','Collection Officer (Field Officer)',NULL,NULL,1,'2026-06-10 08:50:07','2026-06-10 08:50:07'),(6,1,1,'Collection Supervisor','Collection Supervisor',NULL,NULL,1,'2026-06-10 08:50:28','2026-06-10 08:50:28'),(7,1,1,'Recovery Officer','Recovery Officer',NULL,NULL,1,'2026-06-10 08:50:47','2026-06-10 08:50:47'),(8,1,1,'Accountant','Accountant',NULL,NULL,1,'2026-06-10 08:50:58','2026-06-10 08:50:58'),(9,1,1,'Finance Manager','Finance Manager',NULL,NULL,1,'2026-06-10 08:51:25','2026-06-10 08:51:25'),(10,1,1,'Cashier','Cashier',NULL,NULL,1,'2026-06-10 08:51:43','2026-06-10 08:51:43'),(11,1,1,'Customer Service Officer','Customer Service Officer',NULL,NULL,1,'2026-06-10 08:51:51','2026-06-10 08:51:51'),(12,1,1,'Data Entry Operator','Data Entry Operator',NULL,NULL,1,'2026-06-10 08:51:59','2026-06-10 08:51:59'),(13,1,1,'HR Manager','HR Manager',NULL,NULL,1,'2026-06-10 08:52:08','2026-06-10 08:52:08'),(14,1,1,'Admin Officer','Admin Officer',NULL,NULL,1,'2026-06-10 08:52:18','2026-06-10 08:52:18'),(15,1,1,'IT Administrator','IT Administrator',NULL,NULL,1,'2026-06-10 08:52:30','2026-06-10 08:52:30'),(16,1,1,'Auditor','Auditor',NULL,NULL,1,'2026-06-10 08:52:42','2026-06-10 08:52:42'),(17,1,1,'Marketing Executive','Marketing Executive',NULL,NULL,1,'2026-06-10 08:52:50','2026-06-10 08:52:50'),(18,1,1,'Business Analyst','Business Analyst',NULL,NULL,1,'2026-06-10 08:53:00','2026-06-10 08:53:00');
/*!40000 ALTER TABLE `designations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `draft_loans`
--

DROP TABLE IF EXISTS `draft_loans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `draft_loans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `finance_id` bigint unsigned DEFAULT NULL,
  `tenant_id` bigint unsigned NOT NULL DEFAULT '1',
  `branch_id` bigint unsigned DEFAULT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `customer_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `finance_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vehicle',
  `product_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft loan',
  `asset_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_details` json DEFAULT NULL,
  `valuation_details` json DEFAULT NULL,
  `guarantor_details` json DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `interest_rate` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `tenure_months` int NOT NULL,
  `installment_frequency` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `interest_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `start_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `due_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_paid_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `next_collection_date` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_approval',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `draft_loans_finance_id_foreign` (`finance_id`),
  KEY `draft_loans_product_type_status_index` (`product_type`,`status`),
  KEY `draft_loans_customer_id_status_index` (`customer_id`,`status`),
  CONSTRAINT `draft_loans_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `draft_loans_finance_id_foreign` FOREIGN KEY (`finance_id`) REFERENCES `finances` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `draft_loans`
--

LOCK TABLES `draft_loans` WRITE;
/*!40000 ALTER TABLE `draft_loans` DISABLE KEYS */;
/*!40000 ALTER TABLE `draft_loans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_allowances_deductions`
--

DROP TABLE IF EXISTS `employee_allowances_deductions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_allowances_deductions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` enum('allowance','deduction') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount_type` enum('fixed','percentage') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_allowances_deductions_employee_id_foreign` (`employee_id`),
  CONSTRAINT `employee_allowances_deductions_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_allowances_deductions`
--

LOCK TABLES `employee_allowances_deductions` WRITE;
/*!40000 ALTER TABLE `employee_allowances_deductions` DISABLE KEYS */;
INSERT INTO `employee_allowances_deductions` VALUES (1,1,'Food',50000.00,'allowance','fixed',1,'2026-06-10 08:46:11','2026-06-10 08:46:11');
/*!40000 ALTER TABLE `employee_allowances_deductions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_documents`
--

DROP TABLE IF EXISTS `employee_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_documents_employee_id_foreign` (`employee_id`),
  KEY `employee_documents_type_index` (`type`),
  KEY `employee_documents_branch_id_foreign` (`branch_id`),
  CONSTRAINT `employee_documents_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `employee_documents_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_documents`
--

LOCK TABLES `employee_documents` WRITE;
/*!40000 ALTER TABLE `employee_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_educations`
--

DROP TABLE IF EXISTS `employee_educations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_educations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `institution` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `degree` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `field_of_study` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `grade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_educations_employee_id_foreign` (`employee_id`),
  KEY `employee_educations_branch_id_foreign` (`branch_id`),
  CONSTRAINT `employee_educations_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `employee_educations_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_educations`
--

LOCK TABLES `employee_educations` WRITE;
/*!40000 ALTER TABLE `employee_educations` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_educations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_experiences`
--

DROP TABLE IF EXISTS `employee_experiences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_experiences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `employee_id` bigint unsigned NOT NULL,
  `company` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_current` tinyint(1) NOT NULL DEFAULT '0',
  `responsibilities` text COLLATE utf8mb4_unicode_ci,
  `achievements` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `employee_experiences_employee_id_foreign` (`employee_id`),
  KEY `employee_experiences_branch_id_foreign` (`branch_id`),
  CONSTRAINT `employee_experiences_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `employee_experiences_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_experiences`
--

LOCK TABLES `employee_experiences` WRITE;
/*!40000 ALTER TABLE `employee_experiences` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_experiences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_wallets`
--

DROP TABLE IF EXISTS `employee_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_wallets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `wallet_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `opening_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `current_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_wallets_employee_id_unique` (`employee_id`),
  UNIQUE KEY `employee_wallets_wallet_no_unique` (`wallet_no`),
  KEY `employee_wallets_tenant_id_foreign` (`tenant_id`),
  KEY `employee_wallets_branch_id_foreign` (`branch_id`),
  CONSTRAINT `employee_wallets_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `employee_wallets_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_wallets_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_wallets`
--

LOCK TABLES `employee_wallets` WRITE;
/*!40000 ALTER TABLE `employee_wallets` DISABLE KEYS */;
INSERT INTO `employee_wallets` VALUES (1,1,1,3,'EW000003',0.00,0.00,'active','2026-06-13 15:36:00','2026-06-13 15:36:00');
/*!40000 ALTER TABLE `employee_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `employee_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nic_passport` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` bigint unsigned NOT NULL,
  `designation_id` bigint unsigned NOT NULL,
  `join_date` date NOT NULL,
  `basic_salary` decimal(10,2) NOT NULL,
  `commission` decimal(5,2) DEFAULT NULL,
  `commission_base` enum('company_profit','own_business') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `overtime_payment_per_hour` decimal(8,2) DEFAULT NULL,
  `deduction_late_hour` decimal(8,2) DEFAULT NULL,
  `employee_type` enum('full_time','part_time','contract') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `reporting_person` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tin` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_applicable` tinyint(1) NOT NULL DEFAULT '0',
  `tax_relief_eligible` tinyint(1) NOT NULL DEFAULT '0',
  `apit_tax_amount` decimal(10,2) DEFAULT NULL,
  `apit_tax_rate` decimal(5,2) DEFAULT NULL,
  `epf_employee_contribution` decimal(5,2) DEFAULT NULL,
  `epf_employer_contribution` decimal(5,2) DEFAULT NULL,
  `etf_employee_contribution` decimal(5,2) DEFAULT NULL,
  `etf_employer_contribution` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_employee_code_unique` (`employee_code`),
  UNIQUE KEY `employees_email_unique` (`email`),
  UNIQUE KEY `employees_nic_passport_unique` (`nic_passport`),
  KEY `employees_tenant_id_foreign` (`tenant_id`),
  KEY `employees_branch_id_foreign` (`branch_id`),
  KEY `employees_department_id_foreign` (`department_id`),
  KEY `employees_designation_id_foreign` (`designation_id`),
  CONSTRAINT `employees_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `employees_department_id_foreign` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `employees_designation_id_foreign` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`id`),
  CONSTRAINT `employees_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (1,1,1,'EMP0001','Dinusha','Adhikari','dinushaprabath00@gmail.com','0776383680','TEMP1781088314','Panawewa Bingiriya',NULL,'1985-10-12','other',1,1,'2026-11-06',115000.00,0.00,NULL,0.00,0.00,'full_time','active',NULL,'2026-06-10 08:45:14','2026-06-10 08:45:14','Dinusha',NULL,0,0,NULL,NULL,0.00,0.00,0.00,0.00),(2,1,1,'EMP0002','Pasindu','Madushan','pasindumadhushan@gmail.com','0701039008','TEMP1781094806','255, Baladaksha Mawatha,Katukeliyawa,Anuradhapura',NULL,'1997-11-28','other',2,5,'2026-06-04',50000.00,0.00,NULL,0.00,0.00,'full_time','active',NULL,'2026-06-10 10:33:26','2026-06-10 10:33:26','dinushaprabath00@gmail.com',NULL,0,0,NULL,NULL,8.00,12.00,0.00,3.00),(3,1,1,'EMP0003','Dinusha','Adikari','manager.adikari@gmaial.com','0719090000','TEMP1781372160','Kandy',NULL,'1993-01-09','other',1,2,'2026-06-13',50000.00,0.00,NULL,0.00,0.00,'full_time','active',NULL,'2026-06-13 15:36:00','2026-06-13 15:36:00','dinushaprabath00@gmail.com',NULL,0,0,NULL,NULL,0.00,0.00,0.00,0.00);
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finance_collections`
--

DROP TABLE IF EXISTS `finance_collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_collections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `finance_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  `collector_id` bigint unsigned DEFAULT NULL,
  `payment_date` date NOT NULL,
  `payment_amount` decimal(15,2) NOT NULL,
  `refund_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `pay_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `reference_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cheque_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cheque_date` date DEFAULT NULL,
  `cheque_bank` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interest_charged` decimal(15,2) NOT NULL DEFAULT '0.00',
  `interest_paid` decimal(15,2) NOT NULL DEFAULT '0.00',
  `principal_paid` decimal(15,2) NOT NULL DEFAULT '0.00',
  `arrears` decimal(15,2) NOT NULL DEFAULT '0.00',
  `remaining_capital` decimal(15,2) NOT NULL DEFAULT '0.00',
  `meta` json DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `finance_collections_finance_id_payment_date_index` (`finance_id`,`payment_date`),
  KEY `fin_coll_branch_idx` (`branch_id`),
  KEY `fin_coll_collector_idx` (`collector_id`),
  CONSTRAINT `finance_collections_finance_id_foreign` FOREIGN KEY (`finance_id`) REFERENCES `finances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finance_collections`
--

LOCK TABLES `finance_collections` WRITE;
/*!40000 ALTER TABLE `finance_collections` DISABLE KEYS */;
/*!40000 ALTER TABLE `finance_collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finance_documents`
--

DROP TABLE IF EXISTS `finance_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `finance_id` bigint unsigned NOT NULL,
  `document_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `finance_documents_finance_id_index` (`finance_id`),
  CONSTRAINT `finance_documents_finance_id_foreign` FOREIGN KEY (`finance_id`) REFERENCES `finances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finance_documents`
--

LOCK TABLES `finance_documents` WRITE;
/*!40000 ALTER TABLE `finance_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `finance_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finance_product_types`
--

DROP TABLE IF EXISTS `finance_product_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_product_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interest_rate` decimal(8,2) DEFAULT NULL,
  `interest_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenure_months` int unsigned DEFAULT NULL,
  `installment_frequency` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `finance_product_types_name_unique` (`name`),
  UNIQUE KEY `finance_product_types_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finance_product_types`
--

LOCK TABLES `finance_product_types` WRITE;
/*!40000 ALTER TABLE `finance_product_types` DISABLE KEYS */;
INSERT INTO `finance_product_types` VALUES (1,'Hire Purchase','HIRE-PURCHASE','Standard hire purchase product',NULL,NULL,NULL,NULL,1,NULL,'2026-06-09 16:32:04','2026-06-09 16:32:04'),(2,'Lease','LEASE','Vehicle lease product',NULL,NULL,NULL,NULL,1,NULL,'2026-06-09 16:32:04','2026-06-09 16:32:04'),(3,'Loan','LOAN','Vehicle loan product',NULL,NULL,NULL,NULL,1,NULL,'2026-06-09 16:32:04','2026-06-09 16:32:04');
/*!40000 ALTER TABLE `finance_product_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finances`
--

DROP TABLE IF EXISTS `finances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL DEFAULT '1',
  `branch_id` bigint unsigned DEFAULT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `finance_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vehicle',
  `product_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `asset_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_details` json DEFAULT NULL,
  `valuation_details` json DEFAULT NULL,
  `guarantor_details` json DEFAULT NULL,
  `repayment_plan` json DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `down_payment` decimal(15,2) NOT NULL DEFAULT '0.00',
  `financed_amount` decimal(15,2) NOT NULL,
  `interest_rate` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `interest_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed',
  `tenure_months` int NOT NULL,
  `installment_frequency` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `installment_amount` decimal(15,2) NOT NULL,
  `refund_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_paid_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `due_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `due_capital_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `due_interest_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `arrears` decimal(15,2) NOT NULL DEFAULT '0.00',
  `penalty` decimal(15,2) NOT NULL DEFAULT '0.00',
  `next_collection_date` date DEFAULT NULL,
  `finance_end_date` date DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `start_date` date DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `finances_customer_id_foreign` (`customer_id`),
  CONSTRAINT `finances_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finances`
--

LOCK TABLES `finances` WRITE;
/*!40000 ALTER TABLE `finances` DISABLE KEYS */;
/*!40000 ALTER TABLE `finances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leave_types`
--

DROP TABLE IF EXISTS `leave_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leave_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `max_days_per_year` int NOT NULL DEFAULT '0',
  `requires_documentation` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `leave_types_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leave_types`
--

LOCK TABLES `leave_types` WRITE;
/*!40000 ALTER TABLE `leave_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `leave_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leaves`
--

DROP TABLE IF EXISTS `leaves`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leaves` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `leave_type` enum('annual','casual','medical','maternity','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `days_requested` int NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','section_head_approved','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `approved_by` bigint unsigned DEFAULT NULL,
  `approver_notes` text COLLATE utf8mb4_unicode_ci,
  `approved_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `section_head_approved` tinyint(1) NOT NULL DEFAULT '0',
  `section_head_approved_by` bigint unsigned DEFAULT NULL,
  `section_head_approved_at` timestamp NULL DEFAULT NULL,
  `section_head_notes` text COLLATE utf8mb4_unicode_ci,
  `hr_approved` tinyint(1) NOT NULL DEFAULT '0',
  `hr_approved_by` bigint unsigned DEFAULT NULL,
  `hr_approved_at` timestamp NULL DEFAULT NULL,
  `hr_notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `leaves_tenant_id_foreign` (`tenant_id`),
  KEY `leaves_branch_id_foreign` (`branch_id`),
  KEY `leaves_employee_id_foreign` (`employee_id`),
  KEY `leaves_approved_by_foreign` (`approved_by`),
  KEY `leaves_section_head_approved_by_foreign` (`section_head_approved_by`),
  KEY `leaves_hr_approved_by_foreign` (`hr_approved_by`),
  CONSTRAINT `leaves_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `leaves_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `leaves_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `leaves_hr_approved_by_foreign` FOREIGN KEY (`hr_approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `leaves_section_head_approved_by_foreign` FOREIGN KEY (`section_head_approved_by`) REFERENCES `employees` (`id`),
  CONSTRAINT `leaves_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leaves`
--

LOCK TABLES `leaves` WRITE;
/*!40000 ALTER TABLE `leaves` DISABLE KEYS */;
/*!40000 ALTER TABLE `leaves` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_request_collections`
--

DROP TABLE IF EXISTS `loan_request_collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_request_collections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `loan_request_id` bigint unsigned NOT NULL,
  `collection_date` date NOT NULL,
  `collected_amount` decimal(15,2) NOT NULL,
  `payment_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `payment_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `loan_request_collections_loan_request_id_foreign` (`loan_request_id`),
  CONSTRAINT `loan_request_collections_loan_request_id_foreign` FOREIGN KEY (`loan_request_id`) REFERENCES `loan_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_request_collections`
--

LOCK TABLES `loan_request_collections` WRITE;
/*!40000 ALTER TABLE `loan_request_collections` DISABLE KEYS */;
/*!40000 ALTER TABLE `loan_request_collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_request_documents`
--

DROP TABLE IF EXISTS `loan_request_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_request_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `loan_request_id` bigint unsigned NOT NULL,
  `document_type` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'supporting',
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `loan_request_documents_uploaded_by_foreign` (`uploaded_by`),
  KEY `loan_request_documents_loan_request_id_index` (`loan_request_id`),
  CONSTRAINT `loan_request_documents_loan_request_id_foreign` FOREIGN KEY (`loan_request_id`) REFERENCES `loan_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `loan_request_documents_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_request_documents`
--

LOCK TABLES `loan_request_documents` WRITE;
/*!40000 ALTER TABLE `loan_request_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `loan_request_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loan_requests`
--

DROP TABLE IF EXISTS `loan_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loan_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL DEFAULT '1',
  `branch_id` bigint unsigned DEFAULT NULL,
  `request_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loan_product` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_no` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_full_name` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_nic` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_mobile` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `principal` decimal(16,2) NOT NULL,
  `annual_rate` decimal(8,4) NOT NULL,
  `tenure_months` int unsigned NOT NULL,
  `installment_frequency` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `installments` int unsigned NOT NULL DEFAULT '0',
  `installment_amount` decimal(16,2) NOT NULL DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `next_due_date` date DEFAULT NULL,
  `total_collected` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_payable` decimal(16,2) NOT NULL DEFAULT '0.00',
  `customer_details` json NOT NULL,
  `guarantor_details` json DEFAULT NULL,
  `status` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_approval',
  `approval_level` tinyint unsigned NOT NULL DEFAULT '1',
  `required_approval_level` tinyint unsigned NOT NULL DEFAULT '2',
  `created_by` bigint unsigned DEFAULT NULL,
  `last_action_by` bigint unsigned DEFAULT NULL,
  `last_action_at` timestamp NULL DEFAULT NULL,
  `approval_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_requests_request_no_unique` (`request_no`),
  KEY `loan_requests_status_approval_level_index` (`status`,`approval_level`),
  KEY `loan_requests_customer_no_index` (`customer_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loan_requests`
--

LOCK TABLES `loan_requests` WRITE;
/*!40000 ALTER TABLE `loan_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `loan_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_centers`
--

DROP TABLE IF EXISTS `mf_centers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_centers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mf_route_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `meeting_day` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mf_centers_code_unique` (`code`),
  KEY `mf_centers_mf_route_id_foreign` (`mf_route_id`),
  CONSTRAINT `mf_centers_mf_route_id_foreign` FOREIGN KEY (`mf_route_id`) REFERENCES `mf_routes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_centers`
--

LOCK TABLES `mf_centers` WRITE;
/*!40000 ALTER TABLE `mf_centers` DISABLE KEYS */;
INSERT INTO `mf_centers` VALUES (3,2,'Manel','002','thursday',1,'2026-06-10 10:27:17','2026-06-16 08:53:24'),(4,2,'Nelum','4','thursday',1,'2026-06-15 09:31:13','2026-06-15 09:31:13'),(5,2,'Kekulu','003','thursday',1,'2026-06-15 09:31:55','2026-06-15 09:31:55'),(6,2,'shakthi','006','wednesday',1,'2026-06-15 09:32:28','2026-06-15 09:32:28'),(7,2,'Senuki','001','monday',1,'2026-06-15 09:32:52','2026-06-15 09:32:52'),(8,2,'Dinuli','005','monday',1,'2026-06-15 09:33:14','2026-06-15 09:33:14'),(9,2,'Lehansha','007','wednesday',1,'2026-06-15 09:34:06','2026-06-15 09:34:06'),(10,2,'Yanaya','008','tuesday',1,'2026-06-16 09:31:02','2026-06-16 09:31:02');
/*!40000 ALTER TABLE `mf_centers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_groups`
--

DROP TABLE IF EXISTS `mf_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mf_route_id` bigint unsigned NOT NULL,
  `mf_center_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mf_groups_code_unique` (`code`),
  KEY `mf_groups_mf_route_id_foreign` (`mf_route_id`),
  KEY `mf_groups_mf_center_id_foreign` (`mf_center_id`),
  CONSTRAINT `mf_groups_mf_center_id_foreign` FOREIGN KEY (`mf_center_id`) REFERENCES `mf_centers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mf_groups_mf_route_id_foreign` FOREIGN KEY (`mf_route_id`) REFERENCES `mf_routes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_groups`
--

LOCK TABLES `mf_groups` WRITE;
/*!40000 ALTER TABLE `mf_groups` DISABLE KEYS */;
INSERT INTO `mf_groups` VALUES (2,2,3,'Manel','002',1,'2026-06-10 10:27:56','2026-06-10 10:27:56'),(3,2,9,'Lehansha','007',1,'2026-06-15 09:38:19','2026-06-15 09:38:19'),(4,2,8,'Dinuli','005',1,'2026-06-15 09:38:53','2026-06-15 09:38:53'),(5,2,7,'senuki','001',1,'2026-06-15 09:39:10','2026-06-15 09:39:10'),(6,2,6,'Shakthi','006',1,'2026-06-15 09:39:30','2026-06-15 09:39:30'),(7,2,5,'Kekulu','003',1,'2026-06-15 09:40:05','2026-06-15 09:40:05'),(8,2,4,'Nelum','004',1,'2026-06-15 09:40:46','2026-06-15 09:40:46'),(9,2,10,'Yanaya','008',1,'2026-06-16 09:32:22','2026-06-16 09:32:22');
/*!40000 ALTER TABLE `mf_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_holiday_loan_date_shifts`
--

DROP TABLE IF EXISTS `mf_holiday_loan_date_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_holiday_loan_date_shifts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mf_holiday_id` bigint unsigned NOT NULL,
  `loan_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_id` bigint unsigned NOT NULL,
  `field_name` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_date` date NOT NULL,
  `shifted_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mf_holiday_shift_unique` (`mf_holiday_id`,`loan_type`,`loan_id`,`field_name`),
  KEY `mf_holiday_loan_date_shifts_loan_type_loan_id_index` (`loan_type`,`loan_id`),
  CONSTRAINT `mf_holiday_loan_date_shifts_mf_holiday_id_foreign` FOREIGN KEY (`mf_holiday_id`) REFERENCES `mf_holidays` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_holiday_loan_date_shifts`
--

LOCK TABLES `mf_holiday_loan_date_shifts` WRITE;
/*!40000 ALTER TABLE `mf_holiday_loan_date_shifts` DISABLE KEYS */;
/*!40000 ALTER TABLE `mf_holiday_loan_date_shifts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_holidays`
--

DROP TABLE IF EXISTS `mf_holidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_holidays` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `holiday_date` date NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mf_holidays_holiday_date_unique` (`holiday_date`),
  KEY `mf_holidays_holiday_date_is_active_index` (`holiday_date`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_holidays`
--

LOCK TABLES `mf_holidays` WRITE;
/*!40000 ALTER TABLE `mf_holidays` DISABLE KEYS */;
/*!40000 ALTER TABLE `mf_holidays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_loan_collections`
--

DROP TABLE IF EXISTS `mf_loan_collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_loan_collections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mf_loan_request_id` bigint unsigned NOT NULL,
  `collection_date` date NOT NULL,
  `collected_amount` decimal(14,2) NOT NULL,
  `correction_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `capital_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `interest_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `penalty_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cash',
  `payment_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_reference` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `deleted_by` bigint unsigned DEFAULT NULL,
  `deletion_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mf_loan_collections_client_reference_unique` (`client_reference`),
  KEY `mf_loan_collections_created_by_foreign` (`created_by`),
  KEY `mf_loan_collections_mf_loan_request_id_collection_date_index` (`mf_loan_request_id`,`collection_date`),
  KEY `mf_loan_collections_payment_type_index` (`payment_type`),
  KEY `mf_loan_collections_deleted_by_foreign` (`deleted_by`),
  CONSTRAINT `mf_loan_collections_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mf_loan_collections_deleted_by_foreign` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mf_loan_collections_mf_loan_request_id_foreign` FOREIGN KEY (`mf_loan_request_id`) REFERENCES `mf_loan_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_loan_collections`
--

LOCK TABLES `mf_loan_collections` WRITE;
/*!40000 ALTER TABLE `mf_loan_collections` DISABLE KEYS */;
INSERT INTO `mf_loan_collections` VALUES (16,66,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 02:37:24','2026-06-17 02:37:24',NULL),(17,63,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 02:39:19','2026-06-17 02:39:19',NULL),(18,42,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 02:40:23','2026-06-17 17:03:22',NULL),(19,40,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 02:40:51','2026-06-17 17:03:22',NULL),(20,38,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 02:43:04','2026-06-17 17:03:22',NULL),(21,35,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 02:43:47','2026-06-17 17:03:22',NULL),(22,34,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 02:44:49','2026-06-17 17:03:22',NULL),(23,32,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 02:45:54','2026-06-17 17:03:22',NULL),(24,31,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 02:47:08','2026-06-17 17:03:22',NULL),(25,25,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 03:10:48','2026-06-17 17:03:22',NULL),(26,24,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 03:12:06','2026-06-17 17:03:22',NULL),(27,23,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 03:12:35','2026-06-17 17:03:22',NULL),(28,23,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,2,NULL,'2026-06-17 03:13:42','2026-06-17 08:39:03','2026-06-17 08:39:03'),(29,22,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 03:14:29','2026-06-17 17:03:22',NULL),(30,21,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 03:16:14','2026-06-17 17:03:22',NULL),(31,20,'2026-06-17',1500.00,0.00,1153.85,346.15,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-17 03:17:33','2026-06-17 17:03:22',NULL),(32,30,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 02:38:27','2026-06-18 02:38:27',NULL),(33,29,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 02:39:31','2026-06-18 02:39:31',NULL),(34,28,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 02:40:28','2026-06-18 02:40:28',NULL),(35,27,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 02:40:55','2026-06-18 02:40:55',NULL),(36,26,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 02:41:50','2026-06-18 02:41:50',NULL),(37,17,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 03:00:36','2026-06-18 03:00:36',NULL),(38,16,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 03:01:37','2026-06-18 03:01:37',NULL),(39,15,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 03:02:06','2026-06-18 03:02:06',NULL),(40,14,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 03:02:54','2026-06-18 03:02:54',NULL),(41,10,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 03:07:17','2026-06-18 03:07:17',NULL),(42,5,'2026-06-18',1500.00,0.00,0.00,0.00,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 03:07:26','2026-06-18 03:07:26',NULL),(43,67,'2026-06-18',2000.00,0.00,1538.46,461.54,0.00,'cash',NULL,NULL,NULL,3,NULL,NULL,'2026-06-18 04:21:16','2026-06-18 04:21:16',NULL);
/*!40000 ALTER TABLE `mf_loan_collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_loan_guarantors`
--

DROP TABLE IF EXISTS `mf_loan_guarantors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_loan_guarantors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mf_loan_request_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nic` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `contact_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `relationship` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mf_loan_guarantors_mf_loan_request_id_foreign` (`mf_loan_request_id`),
  CONSTRAINT `mf_loan_guarantors_mf_loan_request_id_foreign` FOREIGN KEY (`mf_loan_request_id`) REFERENCES `mf_loan_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=172 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_loan_guarantors`
--

LOCK TABLES `mf_loan_guarantors` WRITE;
/*!40000 ALTER TABLE `mf_loan_guarantors` DISABLE KEYS */;
INSERT INTO `mf_loan_guarantors` VALUES (45,20,'Krishnakumar ramesh kumar','930780359V','No20,sampath uyana,dikkiriya','0740434082','Son','2026-06-15 09:54:44','2026-06-15 09:54:44'),(46,20,'M.nushriin','199224600833','No61,sampath uyana,dhikkiriya','0755810139','Guarantor','2026-06-15 09:54:44','2026-06-15 09:54:44'),(47,20,'M.P.B samar nisa','596871720V','26/B sampath uyana dikkiriya','0774139432','Guarantor','2026-06-15 09:54:44','2026-06-15 09:54:44'),(48,21,'S.Logeshwari','200177903832','No233 selwakandha,alwatha','0779638518','Guarantor','2026-06-15 10:10:35','2026-06-15 10:10:35'),(49,21,'S.siwabalan','813461975V','No.6/1 sampath uyana,dhikkiriya','0740426284','Guarantee','2026-06-15 10:10:35','2026-06-15 10:10:35'),(50,21,'P.wasanthi','197471202202','No6/1 sampathuyana dhikkiriya','0741978470','Guarantee','2026-06-15 10:10:35','2026-06-15 10:10:35'),(51,22,'Baba munalip rajab thuwansim','532563364V','26/B sampathuyana,dhikkiriya','0779681801','Husband','2026-06-15 10:22:58','2026-06-15 10:22:58'),(52,22,'A.K.M Rishwan','199121102632','No26/A sampathuyana,dhikkiriya','0750546623','Guarantee','2026-06-15 10:22:58','2026-06-15 10:22:58'),(53,22,'B.J Munawapra','695281617V','No61 sampathuyana,dhikkiriya','0763346301','Guarantee','2026-06-15 10:22:58','2026-06-15 10:22:58'),(54,23,'Abdul kalil mohomad rishwan','199121102632','No26/A sampathuyana dikkiriya','0750546623','Brother','2026-06-15 10:32:59','2026-06-15 10:32:59'),(55,23,'M.H.M Nusriin','199224600833','No26/sampathuyana,dikkiriya','0755810139','Guarantee','2026-06-15 10:32:59','2026-06-15 10:32:59'),(56,23,'B.J Munawapra','695281617V','No61 sampathuyana,dikkiriya','0763346301','Guarantee','2026-06-15 10:32:59','2026-06-15 10:32:59'),(57,24,'Sinnaiya siwabalan','813461978V','No61/1 sampathuyana,dikkiriya','0740426284','Husband','2026-06-15 10:52:42','2026-06-15 10:52:42'),(58,24,'K.Rameshkumar','930780359V','No20 sampathuyana,dikkiriya','0740434082','Guarantee','2026-06-15 10:52:42','2026-06-15 10:52:42'),(59,24,'P.Vigneshwari','198451410025','No 155 kaludhewala','0774750504','Guarantee','2026-06-15 10:52:42','2026-06-15 10:52:42'),(60,25,'Mohomad hadhi mohomad nusriin','199224600833','No6 sampathuyana,dikkiriya','0755810139','Son','2026-06-15 10:59:02','2026-06-15 10:59:02'),(61,25,'K.Rameshkumar','930780359V','No20 sampathuyana,dikkiriya','0740434082','Guarantee','2026-06-15 10:59:02','2026-06-15 10:59:02'),(62,25,'K.Harshani','200376013684','No20 sampathuyana,dikkiriya','0772551931','Guarantee','2026-06-15 10:59:02','2026-06-15 10:59:02'),(63,26,'Bilingahawaththegedara nuwan priyadharshana thilakarathna','911280957V','No 40/A narankotuwa road,agalawatha,mathale','0776544563','Husband','2026-06-15 11:09:59','2026-06-15 11:09:59'),(64,26,'H.p mahesh','883432371V','No23,agalawatha road,mathale','0769702549','Guarantee','2026-06-15 11:09:59','2026-06-15 11:09:59'),(65,26,'R.D.S madhushani pinthu','937381930V','No 23,agalawatha road,mathale','07611729344','Guarantee','2026-06-15 11:09:59','2026-06-15 11:09:59'),(66,27,'Koswage gedara sugath priyadharshana','813566052V','No45 harasgama road,agalawatha mathale','076309517','Husband','2026-06-15 11:21:03','2026-06-15 11:21:03'),(67,27,'B.G sasanthika iroshani','200460900891','No45/1 harasgama road,agalawatha mathale','0774550781','Guarantee','2026-06-15 11:21:03','2026-06-15 11:21:03'),(68,27,'K.G ranjani koswaththa','19796203020','No37/5,agalawatha mathale','0775683441','Guarantee','2026-06-15 11:21:03','2026-06-15 11:21:03'),(69,28,'Hettiarachige predeep mahesh','883432371V','No23,agalawatha road,mathale','0769702549','Husband','2026-06-16 00:51:51','2026-06-16 00:51:51'),(70,28,'A.P.S sewmini kumari gamage','199978303813','No25,agalawatha road,mathale','0720987587','Guarantee','2026-06-16 00:51:51','2026-06-16 00:51:51'),(71,28,'K.Y.G niluka dhamayanthi','198853600548','No45,agalawatha road,mathale','0756348850','Guarantee','2026-06-16 00:51:51','2026-06-16 00:51:51'),(72,29,'Bilingahawaththa gedara chamindha pradeep kumarasiri','782772139V','No37/5,agalawatha road,mathale','0775222307','Guarantee','2026-06-16 01:00:13','2026-06-16 01:00:13'),(73,29,'B.G Imantha harshamal','200533901007','No19/3B,agalawatha road,mathale','0784629183','Guarantee','2026-06-16 01:00:13','2026-06-16 01:00:13'),(74,29,'R.D.S Madhushani pinthu','937381930V','No23,agalawatha road,mathale','0761172944','Guarantee','2026-06-16 01:00:13','2026-06-16 01:00:13'),(75,30,'Jayampathi kulathunga perara','620453536V','No85 agalawatha road,mathale','0711331263','Husband','2026-06-16 01:11:21','2026-06-16 01:11:21'),(76,30,'C.kavindi perara','200050504988','No8/3B agalawatha road,mathale','0770688024','Guarantee','2026-06-16 01:11:21','2026-06-16 01:11:21'),(77,30,'K.Y.G niluka dhamayanthi','198853600548','No45 agalawatha road,mathale','0756348850','Guarantee','2026-06-16 01:11:21','2026-06-16 01:11:21'),(78,31,'Lankanayaka mudiyanselage anura kumara lankanayaka','198111101678','65/2 Dhobawela mahawela','0779904196','Husband','2026-06-16 01:22:01','2026-06-16 01:22:01'),(79,31,'H.M champa amarasinha','768210837V','Oyagedara dobawela mahawela','0773926734','Guarantee','2026-06-16 01:22:02','2026-06-16 01:22:02'),(80,31,'W.sardha palani','196969701218','Oyagedara dhobawela mahawela','0767314585','Guarantee','2026-06-16 01:22:02','2026-06-16 01:22:02'),(81,32,'D.M.A mahindha rajapaksha','610374891V','No2 dhobawela,mahawela','0713306900','Husband','2026-06-16 01:58:40','2026-06-16 01:58:40'),(82,32,'A.H.M indhrani','716721035V','No126/3 udugama palapathwela','0781623798','Guarantee','2026-06-16 01:58:40','2026-06-16 01:58:40'),(83,32,'W.sardha palani','196969701218','Dobawela mahawela','0767314585','Guarantee','2026-06-16 01:58:40','2026-06-16 01:58:40'),(84,33,'Jamaldeen Chamigaan Mohomad madinandin','823214022V','No 22 Ulpatha Pitiya Kibula','0772856690','Husbands','2026-06-16 02:05:43','2026-06-16 02:05:43'),(85,33,'Jamaldeenb Jesmeeden Fleshiya','198084702562','22 Ulpatha pitiya Kibula','0741277459','Center','2026-06-16 02:05:43','2026-06-16 02:05:43'),(86,33,'Mohomad Hanisha Siththi Apsha','975230538V','No 22 /1A Ulpatha pPitiya Kibula','0768894405','Center','2026-06-16 02:05:43','2026-06-16 02:05:43'),(87,34,'Puranage amila pathum dhabare','830371877V','Kawatayamuna,mahawela','0718228830','Son','2026-06-16 02:07:21','2026-06-16 02:07:21'),(88,34,'H.M champa amarasinha','768210837V','Oyagedara,dhobawela,mahawela','0773936734','Guarantee','2026-06-16 02:07:21','2026-06-16 02:07:21'),(89,34,'V g.n k senevirathna','917830274V','25/1kawatayamuna ,judupelalla','0776693334','Guarantee','2026-06-16 02:07:21','2026-06-16 02:07:21'),(90,35,'Disanayaka mudiyanselage nandhana kumara disanayaka','740661515V','Oyagedara,dhobawala,mahawela','0716210563','Husband','2026-06-16 02:17:59','2026-06-16 02:17:59'),(91,35,'Samanthi kumari wijethunga','787191398V','4/2 kaudupelala','0712488094','Guarantee','2026-06-16 02:17:59','2026-06-16 02:17:59'),(92,35,'U.G.N.K senavirathna','917830274V','25/1 kawatayamuna,kudupelalla','0776693334','Guarantee','2026-06-16 02:17:59','2026-06-16 02:17:59'),(93,36,'Panchawattegedara ishan Nisanka karunarathna','943533628V','616 Bandara pola Waththa  Kiwla Mathale','0767935370','husbands','2026-06-16 02:44:26','2026-06-16 02:44:26'),(94,37,'Adayam mohomad Pammee','793603819V','No 8 Parawaththa Kaludewala Mathale','0757049184','Husbands','2026-06-16 02:51:25','2026-06-16 02:51:25'),(95,38,'Undiya ralalagedara pavithra shrimali','947780425V','Oyagedara,dhobawela,mahawela','0702509308','Guarantee','2026-06-16 02:52:09','2026-06-16 02:52:09'),(96,39,'Kalimuththu Prabu','199704610155','52/1 Akkara 8 Kiwl Mathalea','0742983435','Husbands','2026-06-16 02:56:44','2026-06-16 02:56:44'),(97,40,'Sayakkarage sarath pranandu','698473151V','No61 dhobawela ,mathale','0717339491','Husband','2026-06-16 02:57:21','2026-06-16 02:57:21'),(98,41,'Mohomad Pichche Basloon','677462850','11A wariyapolawaththa Vihara mawatha','0711326204','Husbands','2026-06-16 03:03:38','2026-06-16 03:03:38'),(99,42,'E.M.E Gamini Ekanayaka','753523227V','No4 galwadukubura,kaudupelalla','0762578484','Husband','2026-06-16 03:05:30','2026-06-16 03:05:30'),(100,43,'Mohomad ayis Mohomad Ashad','921000618V','46 Kiwela Mathale','0767783045','Son','2026-06-16 03:12:35','2026-06-16 03:12:35'),(101,44,'R.A Nalindha sampath','960944178V','273/1 pitakandha,kaikawala','0752587509','Husband','2026-06-16 03:15:06','2026-06-16 03:15:06'),(102,45,'Ukkurala gamaralalage gedara prasadh sanjeewa','790371925V','Dhankandha pahalagama','0782739421','Husband','2026-06-16 03:19:58','2026-06-16 03:19:58'),(103,46,'Mohomad Ambaas','813274930V','27 Bandarapola aththa Kiwlaa','0743565173','Husbands','2026-06-16 03:21:21','2026-06-16 03:21:21'),(104,47,'Palage dhon chathana dhevindhi','200565503709','Dhankandha raththota','0760483191','Guarantee','2026-06-16 03:31:07','2026-06-16 03:31:07'),(105,48,'Abdulla','880743295V','20Bandara pola waththa Kiwla Matale','0777104041','Husbands','2026-06-16 03:31:30','2026-06-16 03:31:30'),(106,49,'Hapuarachchige malki bagya thathsarani','937691130V','276/1 polhenapara, walpola','0743719008','Guarantee','2026-06-16 03:36:08','2026-06-16 03:36:08'),(107,50,'Nasgur Pichcheyi Arshad','198522602354','12/55 Tharalanda para Mathale','076+1197004','Husbands','2026-06-16 03:36:17','2026-06-16 03:36:17'),(108,51,'Paluwatha gedara thusitha saneewa','198802702284','Dhabagolla dhankanda','0760795330','Husband','2026-06-16 03:40:00','2026-06-16 03:40:00'),(109,52,'Sadanam Wellasamee','700394026X','Alagala waththa bGammaduwa','No','Husbands','2026-06-16 04:47:17','2026-06-16 04:47:17'),(110,53,'Mansanadan Praneetha','200374213392','126 Nikaloya Road Raththota','0769415552','Doter','2026-06-16 04:51:48','2026-06-16 04:51:48'),(111,54,'Muththusami Kayalvilee','198052900293','751 Gagabada Road Kaludewala matale','0767844178','Mother','2026-06-16 04:57:50','2026-06-16 04:57:50'),(112,55,'Subhaskaran sdursana','200663002461','Alakala Gammaduwa','0762837382','Doter','2026-06-16 05:02:55','2026-06-16 05:02:55'),(113,56,'Naganadan Luksimella','958120710V','Melgolla Road Raththota','0762541605','Doter','2026-06-16 05:08:08','2026-06-16 05:08:08'),(114,57,'Alagappan naganadan','653000480V','30/4 Mellagolla Road Raththota','0766673623','Farther','2026-06-16 05:15:41','2026-06-16 05:15:41'),(115,58,'Mohomad Fathima Mohomad Nasreen','802283652V','295 /3 Nikawella Road Raththota','0751411241','pends','2026-06-16 05:20:55','2026-06-16 05:20:55'),(116,59,'Muththaiya Sellwaraj','198104110119','140/1 Kananththa Road loanvil Raththota','No','father','2026-06-16 05:28:14','2026-06-16 05:28:14'),(117,60,'Murugaiya Jeewa Kumari','197678004245','Kalugalthenna Gammaduwa','0770452773','husbands','2026-06-16 05:34:27','2026-06-16 05:34:27'),(118,61,'Nagaraja Vinodani','199282100090','299/17/1 Loanvil Raththota','0772083955','Sister','2026-06-16 05:39:15','2026-06-16 05:39:15'),(119,62,'Rat6hnam Pille Chandrasekaram','196031502220','No 16 Men Road Raththota','0761924719','husbands','2026-06-16 05:43:56','2026-06-16 05:43:56'),(120,17,'Wathagama gedara sumanadhasa','702012287V','35A janapadhaya,kotuwegedara,mathale','0726502434','Husband','2026-06-16 08:55:59','2026-06-16 08:55:59'),(121,17,'I.g Ruwani sankalpani gamlath','200378111538','37/3 pahalawela,mathale','0775402477','Guarantor','2026-06-16 08:55:59','2026-06-16 08:55:59'),(122,17,'R.g airin mangali kumari','665723402V',NULL,'0758580143','Guarantor','2026-06-16 08:55:59','2026-06-16 08:55:59'),(123,16,'M.G predeepa subashini','958182155V','No18/4A janapadhaya,kotuwegedara,mathale','0759404305','Duwa','2026-06-16 08:56:36','2026-06-16 08:56:36'),(124,16,'M.s.g sunil premachandra','652380786V','29/A janapadhaya,kotuwegedara,mathale','0778045983','Guarantor','2026-06-16 08:56:36','2026-06-16 08:56:36'),(125,16,'K.g chandrika padhmini kumari','198561800220','68/2A janapadhaya,kotuwegedara,mathale','0741626942','Guarantor','2026-06-16 08:56:36','2026-06-16 08:56:36'),(126,15,'M.S.G sunil premachandra','652380786V','29/A Janapadhaya,kotuwegedara,mathale','0778045983','Guarantor','2026-06-16 08:57:10','2026-06-16 08:57:10'),(127,15,'D.g mallika kumari','198284704090','55/2/1A janapadhaya,kotuwegedra,mathale','0777567655','Guarantor','2026-06-16 08:57:10','2026-06-16 08:57:10'),(128,15,'L.g sumanawathi','196854502987','No18/4 A janapadhaya,kotuwegedara,mathale','0750828634','Guarantor','2026-06-16 08:57:10','2026-06-16 08:57:10'),(129,14,'.k.g gayan madhusanka','970420428V','37/3 pahalawela,mathale','0772868506','Husband','2026-06-16 08:57:40','2026-06-16 08:57:40'),(130,14,'G.g lasitha madhushan','200622702932','No36 pahalawela,mathale','0762592322','Guarantor','2026-06-16 08:57:40','2026-06-16 08:57:40'),(131,14,'R.g.a mangali kumari','665723402V','29/1A janapadhaya,jotuwegedara,mathale','0758580143','Guarantor','2026-06-16 08:57:40','2026-06-16 08:57:40'),(141,10,'H.g samira mahesh kumara','820804070V','No68/2A janapadhaya,kotuwegedara,mathale','0760145495','Husband','2026-06-16 08:59:50','2026-06-16 08:59:50'),(142,10,'G.g lasitha madhushan','200622702932','No36,pahalawela mathale','0762592322','Guarantor','2026-06-16 08:59:50','2026-06-16 08:59:50'),(143,10,'L.g sumanawathi','196854502987',NULL,'0750828634','Guarantor','2026-06-16 08:59:50','2026-06-16 08:59:50'),(156,5,'G.G Lasitha madhushan','200622702932','No36 pahalawela kotuwegedr mathale','0762592322','Son','2026-06-16 09:01:40','2026-06-16 09:01:40'),(157,5,'H.G samira mahesh','820804970V','Kotuwegdr mathale','0760145495','Guarantor','2026-06-16 09:01:41','2026-06-16 09:01:41'),(158,5,'R.G.A mangali kumari','665723402V','Kotuwegedr,mathale','0758580143','Guarantor','2026-06-16 09:01:41','2026-06-16 09:01:41'),(159,63,'D R W Nalaka Mihira Bandara Henagama','820511280V','25/1 Kawatayamuna Kawdupella','0752033435','Husband','2026-06-16 09:02:42','2026-06-16 09:02:42'),(160,64,'Kalimuththu nishanthan','200418305775','24/4 bandarapolwaththa,kiula,mathale','0769091753','Husband','2026-06-16 09:07:48','2026-06-16 09:07:48'),(162,66,'Kiwlpane Gedara Chalani Ishara Welagoda','200252100331','No 126/3 Udugama palapathwala','0728435339','doter','2026-06-16 09:08:30','2026-06-16 09:08:30'),(163,67,'Munas pamith','197328802375','No22 ulpathapitiya,kiula','0740220623','Husband','2026-06-16 09:12:33','2026-06-16 09:12:33'),(164,68,'Ramanayaka Arachchila Gedara indika Mahesh Samarasinha','881822938V','Dankanda Pahalagama','0772685327','Husbands','2026-06-16 09:13:32','2026-06-16 09:13:32'),(165,69,'Kahakotuwegedara,Rathnasiri','650804910V','36/3Purijjala,Mathale','0755311488','Husband','2026-06-16 09:40:35','2026-06-16 09:40:35'),(166,70,'Wijesuriya arachige sadhuni gunasinha','925812544V','No37/B Purijjala,Mathale','0769868723','Guarantee','2026-06-16 09:47:26','2026-06-16 09:47:26'),(167,71,'Nankagige Nandhana Sajeewa','82037324V','159/A Bethmagoda,Bandaragama','0764241562','Husband','2026-06-16 10:04:31','2026-06-16 10:04:31'),(168,72,'Medagedara,chandhrawathi','566511533V','136 warakamuna, Ukuwela','0751466423','Guarantee','2026-06-16 10:09:18','2026-06-16 10:09:18'),(169,73,'Jon Rex Almedha','196427604144','135/1Warakamuna,ukuwela','078717561','Husband','2026-06-16 10:29:47','2026-06-16 10:29:47'),(170,74,'U.W.Chamudi kavindya dhevindhi','998250021V','46/2/B Purijjala,mathale','0763090337','Guarantee','2026-06-16 10:34:10','2026-06-16 10:34:10'),(171,75,'SUbadra Neranjala Ranasinha','737260011V','No70/A Udakurudhuwatha,Kalpitiya,Ukuwela','0740100655','Guarantee','2026-06-16 10:38:38','2026-06-16 10:38:38');
/*!40000 ALTER TABLE `mf_loan_guarantors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_loan_products`
--

DROP TABLE IF EXISTS `mf_loan_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_loan_products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `interest_rate` decimal(12,7) NOT NULL DEFAULT '0.0000000',
  `interest_type` enum('flat','reducing') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'flat',
  `terms_count` int unsigned NOT NULL DEFAULT '1',
  `refund_option` enum('day','week','month') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'month',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mf_loan_products_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_loan_products`
--

LOCK TABLES `mf_loan_products` WRITE;
/*!40000 ALTER TABLE `mf_loan_products` DISABLE KEYS */;
INSERT INTO `mf_loan_products` VALUES (1,'20000',9.2307690,'flat',13,'week',1,'2026-06-12 03:42:39','2026-06-15 09:57:37'),(2,'15000',9.2307690,'flat',13,'week',1,'2026-06-15 09:43:25','2026-06-15 09:57:29'),(3,'10000',9.2307690,'flat',13,'week',1,'2026-06-15 09:44:02','2026-06-15 09:57:19');
/*!40000 ALTER TABLE `mf_loan_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_loan_request_documents`
--

DROP TABLE IF EXISTS `mf_loan_request_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_loan_request_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mf_loan_request_id` bigint unsigned NOT NULL,
  `document_type` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mf_loan_request_documents_mf_loan_request_id_foreign` (`mf_loan_request_id`),
  KEY `mf_loan_request_documents_uploaded_by_foreign` (`uploaded_by`),
  CONSTRAINT `mf_loan_request_documents_mf_loan_request_id_foreign` FOREIGN KEY (`mf_loan_request_id`) REFERENCES `mf_loan_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mf_loan_request_documents_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_loan_request_documents`
--

LOCK TABLES `mf_loan_request_documents` WRITE;
/*!40000 ALTER TABLE `mf_loan_request_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `mf_loan_request_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_loan_requests`
--

DROP TABLE IF EXISTS `mf_loan_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_loan_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `branch_id` bigint unsigned DEFAULT NULL,
  `loan_scope` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'center_loan',
  `mf_route_id` bigint unsigned DEFAULT NULL,
  `mf_center_id` bigint unsigned DEFAULT NULL,
  `mf_group_id` bigint unsigned DEFAULT NULL,
  `manager_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_officer` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_leader` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nick_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nic` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_no` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mobile_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `loan_amount` decimal(15,2) NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `refund_option` enum('day','week','month') COLLATE utf8mb4_unicode_ci NOT NULL,
  `interest_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'flat',
  `interest_rate` decimal(10,7) NOT NULL,
  `terms_count` int NOT NULL,
  `refundable_amount` decimal(15,2) NOT NULL,
  `installment_amount` decimal(15,2) NOT NULL,
  `loan_balance` decimal(15,2) DEFAULT NULL,
  `document_charges` decimal(15,2) NOT NULL DEFAULT '0.00',
  `stamp_charges` decimal(15,2) NOT NULL DEFAULT '0.00',
  `insurance_charges` decimal(15,2) NOT NULL DEFAULT '0.00',
  `charge_payment_mode` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'hand_cash',
  `net_disbursed_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `loan_request_date` date NOT NULL,
  `next_payment_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `loan_end_date` date DEFAULT NULL,
  `arrears_balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `penalty_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `penalty_grace_days` int unsigned NOT NULL DEFAULT '2',
  `penalty_starts_on` date DEFAULT NULL,
  `documents_requested` tinyint(1) NOT NULL DEFAULT '0',
  `document_request_note` text COLLATE utf8mb4_unicode_ci,
  `document_requested_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `hold_at` timestamp NULL DEFAULT NULL,
  `hold_reason` text COLLATE utf8mb4_unicode_ci,
  `closed_at` timestamp NULL DEFAULT NULL,
  `closed_reason` text COLLATE utf8mb4_unicode_ci,
  `status` enum('requested','approved','released','rejected','hold','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requested',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mf_loan_requests_created_by_foreign` (`created_by`),
  KEY `mf_loan_requests_branch_id_foreign` (`branch_id`),
  KEY `mf_loan_requests_mf_route_id_foreign` (`mf_route_id`),
  KEY `mf_loan_requests_mf_center_id_foreign` (`mf_center_id`),
  KEY `mf_loan_requests_mf_group_id_foreign` (`mf_group_id`),
  KEY `mf_loan_requests_customer_no_index` (`customer_no`),
  CONSTRAINT `mf_loan_requests_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mf_loan_requests_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mf_loan_requests_mf_center_id_foreign` FOREIGN KEY (`mf_center_id`) REFERENCES `mf_centers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mf_loan_requests_mf_group_id_foreign` FOREIGN KEY (`mf_group_id`) REFERENCES `mf_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mf_loan_requests_mf_route_id_foreign` FOREIGN KEY (`mf_route_id`) REFERENCES `mf_routes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_loan_requests`
--

LOCK TABLES `mf_loan_requests` WRITE;
/*!40000 ALTER TABLE `mf_loan_requests` DISABLE KEYS */;
INSERT INTO `mf_loan_requests` VALUES (5,1,'center_loan',2,3,2,'Dinusha Adikari','Pasindu Madushan','Champika','CL-002-002-L0001','11','W.G Champika Priyadarshani','Champika','857123107V','No.36,Pahalawela, Mathale','0764674001',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-04','2026-06-25','2026-06-25','2026-08-27',0.00,0.00,2,'2026-06-21',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-11 08:46:41','2026-06-18 03:07:26'),(10,1,'center_loan',2,3,2,'Dinusha Adikari','Pasindu Madushan','','CL-002-002-L0004','08','Chandrika padhmini kumari','Chandrika','198561800220','No68/2A janapadhaya,kotuwegedara,mathale','0741626942',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-11','2026-06-25','2026-06-25','2026-09-03',0.00,0.00,2,'2026-06-21',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-11 08:59:46','2026-06-18 03:07:17'),(14,1,'center_loan',2,3,2,'Dinusha Adikari','Pasindu Madushan','','CL-002-002-L0010','30','Ruwini sankalpani melan','Ruvini','200378111538','37/3 pahalawela,mathale','0775402477',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,208.00,0.00,300.00,'hand_cash',15000.00,'2026-06-04','2026-06-25','2026-06-25','2026-08-27',0.00,0.00,2,'2026-06-21',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-11 09:17:25','2026-06-18 03:02:54'),(15,1,'center_loan',2,3,2,'Dinusha Adikari','Pasindu Madushan','','CL-002-002-L0011','09','Ranhawadi gedara airin mangali kumari ariyawansha','Mangali','665723402V','29/A Janapadhaya,kotuwegedara,mathale','0758580143',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-04','2026-06-25','2026-06-25','2026-08-27',0.00,0.00,2,'2026-06-21',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-12 00:47:57','2026-06-18 03:02:06'),(16,1,'center_loan',2,3,2,'Dinusha Adikari','Pasindu Madushan','','CL-002-002-L0012','10','Lidhagawa gedara sumanawathi','Sumanawathi','196854502987','No18/4A janapadhaya,kotuwegedara,mathale','0750828634',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-04','2026-06-25','2026-06-25','2026-08-27',0.00,0.00,2,'2026-06-21',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-12 01:00:09','2026-06-18 03:01:37'),(17,1,'center_loan',2,3,2,'Dinusha Adikari','Pasindu Madushan','','CL-002-002-L0013','53','Kalpage priyangika aberathna','Priyangika','197285102253','39/A janapadhaya,kotuwegedara,mathale','0726502434',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-11','2026-06-25','2026-06-25','2026-09-03',0.00,0.00,2,'2026-06-21',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-12 01:13:51','2026-06-18 03:00:36'),(20,1,'center_loan',2,9,3,'Dinusha Adikari','Pasindu Madushan','S.Menagayi','CL-002-007-L0001','50','Suppaiya menagayi','Menagayi','677201975V','No20 sampath uyana, dikkiriya','0772551931',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-25',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-15 09:54:44','2026-06-17 17:03:22'),(21,1,'center_loan',2,9,3,'Dinusha Adikari','Pasindu Madushan','','CL-002-007-L0002','48','Podisinham vigneshwari','Vigneshwari','198451410025','No155/8,kaludewala,mathale','0774750504',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-25',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-15 10:10:35','2026-06-17 17:03:22'),(22,1,'center_loan',2,9,3,'Dinusha Adikari','Pasindu Madushan','','CL-002-007-L0003','51','Mohidin pichchei badhurdeen samsun nisa','Nisa','596871720V','26/B Sampathuyana,dhikkiriya','0774139432',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-25',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-15 10:22:58','2026-06-17 17:03:22'),(23,1,'center_loan',2,9,3,'Dinusha Adikari','Pasindu Madushan','','CL-002-007-L0004','49','Krishnakumar harshani','Harshani','200376013684','No20 sampathuyana dhikkiriya','0775686446',NULL,15000.00,'Self loan','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',1500.00,0.00,2,'2026-06-27',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-15 10:32:59','2026-06-17 17:03:22'),(24,1,'center_loan',2,9,3,'Dinusha Adikari','Pasindu Madushan','','CL-002-007-L0005','47','Pachachamuththu wasanthi','Wadanthi','197471202202','No61/1 sampathuyana,dikkiriya','0741978470',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-25',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-15 10:52:42','2026-06-17 17:03:22'),(25,1,'center_loan',2,9,3,'Dinusha Adikari','Pasindu Madushan','','CL-002-007-L0006','52','Badurdeen jinathul munawapra','Munawapra','695281617V','No6 sampathuyana,dikkiriya','0763346301',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-25',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-15 10:59:02','2026-06-17 17:03:22'),(26,1,'center_loan',2,5,7,'Dinusha Adikari','Pasindu Madushan','Kulathunga mudhiyanselage udheshika prabodhani','CL-002-003-L0001','26','Kulathunga mudhiyanselage udheshika prabodhani','Udheshika','948522365V','No 40/A narankotuwa road,agalawatha,mathale','0779348823',NULL,15000.00,'Clothing','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-05','2026-06-25','2026-06-25','2026-09-03',0.00,0.00,2,'2026-06-25',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-15 11:09:59','2026-06-18 02:41:50'),(27,1,'center_loan',2,5,7,'Dinusha Adikari','Pasindu Madushan','','CL-002-003-L0002','28','Kandhe yamanlage gedara niluka dhamayanthi','Niluka','198853600548','No45 harasgama road,agalawatha mathale','0756348850',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-05','2026-06-25','2026-06-25','2026-09-03',0.00,0.00,2,'2026-06-25',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-15 11:21:03','2026-06-18 02:40:55'),(28,1,'center_loan',2,5,7,'Dinusha Adikari','Pasindu Madushan','','CL-002-003-L0003','27','Ranwalage dhulanji sadhushi madhushani pinthu','Pinthu','937381930V','No23,agalawatha road,mathale','0761172944',NULL,15000.00,'Self loan','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-05','2026-06-25','2026-06-25','2026-09-03',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 00:51:51','2026-06-18 02:40:28'),(29,1,'center_loan',2,5,7,'Dinusha Adikari','Pasindu Madushan','','CL-002-003-L0004','25','Koswaththa gedara,ranjani,koswatha','Koswaththa','197962703020','No37/5,agalawatha road,mathale','0775683441',NULL,15000.00,'Self bob','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-05','2026-06-25','2026-06-25','2026-09-03',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 01:00:13','2026-06-18 02:39:31'),(30,1,'center_loan',2,5,7,'Dinusha Adikari','Pasindu Madushan','','CL-002-003-L0005','29','K.M Meranga madhumali kulathunga','Meranga','200075300850','No 85 Agalawatha road,mathale','0779348823',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-05','2026-06-25','2026-06-25','2026-09-03',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 01:11:21','2026-06-18 02:38:27'),(31,1,'center_loan',2,6,6,'Dinusha Adikari','Pasindu Madushan','Dhammika chandrakumari','CL-002-006-L0001','46','Liyanagamage dhammika chandhrakumari','Dhammika','197772500418','No 65/2 Dhobawela,mahawela','0773536193',NULL,15000.00,'Clothing','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-27',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 01:22:01','2026-06-17 17:03:22'),(32,1,'center_loan',2,6,6,'Dinusha Adikari','Pasindu Madushan','','CL-002-006-L0002','45','Galgoda heene gedara premalatha','Premalatha','665260232V','No2 dhobawela,mahawela','0715432154',NULL,15000.00,'Self loan','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-27',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 01:58:40','2026-06-17 17:03:22'),(33,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','Siththi Pathima','CL-002-4-L0001','33','Nisar pathima sarmila','Pathima','875443399V','No 22 Ulpatha Pitiya kibula','0772386690',NULL,20000.00,'Business','week','flat',9.2307690,13,26000.00,2000.00,NULL,500.00,0.00,500.00,'hand_cash',20000.00,'2026-06-16','2026-06-18','2026-06-18','2026-09-10',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 02:05:43','2026-06-16 09:08:59'),(34,1,'center_loan',2,6,6,'Dinusha Adikari','Pasindu Madushan','','CL-002-006-L0003','44','Galhena gamage hemantha sadasili gamage','Sadasili','196185004484','Kawatayamuna,mahawela','0765688654',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,13846.15,208.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-27',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 02:07:21','2026-06-17 17:03:22'),(35,1,'center_loan',2,6,6,'Dinusha Adikari','Pasindu Madushan','','CL-002-006-L0004','43','Hitihami mudiyanselage cgampa amarasinha','Champa','768210837V','Oyagedara,dhobawela,mahawela','0773926734',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-27',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 02:17:59','2026-06-17 17:03:22'),(36,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','Siththi Pathima','CL-002-4-L0002','31','Maharam Hawadi Dura Gedara Nayaomi Nuisansala Gunawardhana','Nayomi','956640741V','616 Bandarapola waththa kiwla mathale','0743575455',NULL,20000.00,'Bu','week','flat',9.2307690,13,26000.00,2000.00,NULL,500.00,0.00,500.00,'hand_cash',20000.00,'2026-06-16','2026-06-18','2026-06-18','2026-09-10',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 02:44:26','2026-06-16 09:08:59'),(37,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','Siththi Pathima','CL-002-4-L0003','07','Musthaja Sithi Pathima','pathima','847935200V','No 8 Parawththa Kaludewala Mathale','0753864141',NULL,20000.00,'Bu','week','flat',9.2307690,13,26000.00,2000.00,NULL,0.00,0.00,0.00,'hand_cash',20000.00,'2026-06-16','2026-06-18','2026-06-18','2026-09-10',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 02:51:25','2026-06-16 09:08:59'),(38,1,'center_loan',2,6,6,'Dinusha Adikari','Pasindu Madushan','','CL-002-006-L0005','40','Welhenage sardha palani','Sardha','196969701218','Oyagedara,dhobawela,mahawela','0781623798',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-27',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 02:52:09','2026-06-17 17:03:22'),(39,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','Siththi Pathima','CL-002-4-L0004','06','Suppaiya Niroshani','Niroshani','199969410511','52/1 Bandarapolawaththa Kiwla Mathale','0778910376',NULL,20000.00,'Bu','week','flat',9.2307690,13,26000.00,2000.00,NULL,0.00,0.00,0.00,'hand_cash',20000.00,'2026-06-16','2026-06-18','2026-06-18','2026-09-10',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 02:56:44','2026-06-16 09:08:59'),(40,1,'center_loan',2,6,6,'Dinusha Adikari','Pasindu Madushan','','CL-002-006-L0006','39','Galwete gedara mallika wijesinha','Mallika','197765202899','No77 Makulussa janapadhya,old dhobawela,mathale','0767752187',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-27',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 02:57:21','2026-06-17 17:03:22'),(41,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','Siththi Pathima','CL-002-4-L0005','05','Mohamad Hanisha Sithi Asfa','Asfa','975230538V','Diyanillawaththa Kale Bokka Madu Kale','0768894405',NULL,20000.00,'Bu','week','flat',9.2307690,13,26000.00,2000.00,NULL,0.00,0.00,0.00,'hand_cash',20000.00,'2026-06-16','2026-06-18','2026-06-18','2026-09-10',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:03:38','2026-06-16 09:08:59'),(42,1,'center_loan',2,6,6,'Dinusha Adikari','Pasindu Madushan','','CL-002-006-L0007','38','I.U.W.M Samanthi kumari wijethunga','Samanthi','787191398V','No4 galwadukubura,kaudupelalla','0712488094',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,13846.15,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-24','2026-06-24','2026-09-02',0.00,0.00,2,'2026-06-27',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:05:30','2026-06-17 17:03:22'),(43,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','Siththi Fathima','CL-002-4-L0006','03','Abdul kapur Pathima Sumeiya','Pathima','199578303403','46/1 Kiwla Mathale','0763733305',NULL,20000.00,'Bu','week','flat',9.2307690,13,26000.00,2000.00,NULL,0.00,0.00,0.00,'hand_cash',20000.00,'2026-06-16','2026-06-18','2026-06-18','2026-09-10',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:12:35','2026-06-16 09:08:59'),(44,1,'center_loan',2,7,5,'Dinusha Adikari','Pasindu Madushan','Dinushka subashini','CL-002-001-L0001','22','Wathegedara dinushka subashini karunarathna','Subashini','985560773V','Weniwelgolla,Dhankandha','0761833696',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-10','2026-06-22','2026-06-22','2026-09-07',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:15:06','2026-06-16 09:08:59'),(45,1,'center_loan',2,7,5,'Dinusha Adikari','Pasindu Madushan','','CL-002-001-L0002','23','Koralegedara,chandrika kunari thilakarathna','Chandhrika','765792703V','Pahaladhankandha,raththota','0766899460',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:19:58','2026-06-16 09:08:59'),(46,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','Siththi Fathima','CL-002-4-L0007','02','Samsudeen Siththi Nalisha','Siththi','796832355V','8/4 Kiwla','0765457424',NULL,20000.00,'Bu','week','flat',9.2307690,13,26000.00,2000.00,NULL,0.00,0.00,0.00,'hand_cash',20000.00,'2026-06-16','2026-06-18','2026-06-18','2026-09-10',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:21:21','2026-06-16 09:08:59'),(47,1,'center_loan',2,7,5,'Dinusha Adikari','Pasindu Madushan','','CL-002-001-L0003','20','M.A.Isanka dhulanjali senevirathna','Isanka','198285902157','Dhankandha,Raththota','0766843675',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:31:07','2026-06-16 09:08:59'),(48,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','Siththi Fathima','CL-002-4-L0008','01','Abdul Raheem Kagila Umma','Kagila','199083301206','20 Bandara Pola Waththa kiwla mathale','0779512365',NULL,20000.00,'Bu','week','flat',9.2307690,13,26000.00,2000.00,NULL,0.00,0.00,0.00,'hand_cash',20000.00,'2026-06-16','2026-06-18','2026-06-18','2026-09-10',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:31:30','2026-06-16 09:08:59'),(49,1,'center_loan',2,7,5,'Dinusha Adikari','Pasindu Madushan','','CL-002-001-L0004','21','De kiri nalani','Nalani','197361102051','Dhabagolla dhankandha','0776003976',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:36:08','2026-06-16 09:08:59'),(50,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','siththi fathima','CL-002-4-L0009','54','Ismail Pathima Nuasran','Pathima','876413329V','52/6 Gongawala Road Mathale','0760780844',NULL,20000.00,'Bu','week','flat',9.2307690,13,26000.00,2000.00,NULL,0.00,0.00,0.00,'hand_cash',20000.00,'2026-06-16','2026-06-18','2026-06-18','2026-09-10',0.00,0.00,2,'2026-06-28',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:36:17','2026-06-16 09:08:59'),(51,1,'center_loan',2,7,5,'Dinusha Adikari','Pasindu Madushan','','CL-002-001-L0005','34','Galapitigedara nirosha malkanthi','Nirosha','907901300V','Dhabagolla dhankandha','0760795330',NULL,15000.00,'Self loan','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,308.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 03:40:00','2026-06-16 09:08:59'),(52,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nandani','CL-002-005-L0001','37','Anthoni magarat Meeri','Meeri','687824210V','Looanvil Raththota','0775793310',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 04:47:17','2026-06-16 09:08:59'),(53,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nandani','CL-002-005-L0002','36','Welushanthi Nesanadan','Nesanadan','756070665V','126Nikaloya Road Raththota','0775510569',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 04:51:47','2026-06-16 09:08:59'),(54,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nandani','CL-002-005-L0003','35','Chandrasekaram Nandrabhashi','Nandrabhashi','200382913557','No 1 16 Men Road Raththota','0760909135',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 04:57:50','2026-06-16 09:08:59'),(55,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nandani','CL-002-005-L0004','17','Nagaraja Maheshwari','Maheshwari','875180410V','Alakala Gammaduwa','077652869',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 05:02:55','2026-06-16 09:08:59'),(56,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nandani','CL-002-005-L0005','16','Ganeshanadhan Vijaya Chandrika','Chandrika','197679802585','30/4 Mellagolla Raththota','0766981265',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 05:08:08','2026-06-16 09:08:59'),(57,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nandani','CL-002-005-L0006','15','Naganadan Bawadarani','Naganadan Bawadarani','200072403770','30/4 Mellagolla Road Raththota','0770528608',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 05:15:41','2026-06-16 09:08:59'),(58,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nandani','CL-002-005-L0007','14','Abdulgadar Fathima Aisa','Aisa','815594720V','35/25 Gagabada Road Palamu Patumaga Kaludewala Mattale','0711332201',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 05:20:55','2026-06-16 09:08:59'),(59,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nandani','CL-002-005-L0008','19','Karupaiya Vijaya Kumari','Karupaiya Vijaya Kumari','767761090V','301 Lonweel Waththa Loanweel Raththota','0767628341',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 05:28:13','2026-06-16 09:08:59'),(60,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nandani','CL-002-005-L0009','13','Murugaiya Gandhimathi','Murugaiya Gandhimathi','198383101946','15/1  sprin Mount waththa kalugalthenna Raththota Gammaduwa','0788547387',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 05:34:27','2026-06-16 09:08:59'),(61,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nasndani','CL-002-005-L0010','12','Sewanu Maheswari','Maheshwari','19876501367','No 40 Nikaloya Road Raththota','0766317928',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 05:39:15','2026-06-16 09:08:59'),(62,1,'center_loan',2,8,4,'Dinusha Adikari','Pasindu Madushan','Nandani','CL-002-005-L0011','18','Subramaniyam Nandani','Nandani','686590704V','No 16 Men Road Raththota','0763130151',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-06-22','2026-06-22','2026-09-14',0.00,0.00,2,'2026-07-02',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 05:43:56','2026-06-16 09:08:59'),(63,1,'center_loan',2,6,6,'Dinusha Adikari','Pasindu Madushan','Kumari','CL-002-006-L0008','42','Ukkurala gamaralalage Nelum Kumudhu Mali Senavirathna','Nelum,','917830274V','25/1 Kawataya Amuna Kawedupella','0776693334',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-07-08','2026-07-01','2026-09-16',-1500.00,0.00,2,'2026-07-04',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 09:02:42','2026-06-17 02:39:19'),(64,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','','CL-002-4-L0010','04','Dushika suppaiya','Dushika','200253102762','24/4 bandara polwatha kiula matgale','0760735018',NULL,20000.00,'Self loan','week','flat',9.2307690,13,26000.00,2000.00,NULL,500.00,0.00,500.00,'hand_cash',20000.00,'2026-06-04','2026-07-02','2026-07-02','2026-09-17',0.00,0.00,2,'2026-07-05',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 09:07:48','2026-06-16 09:15:36'),(66,1,'center_loan',2,6,6,'Dinusha Adikari','Pasindu Madushan','Chandra Kumari','CL-002-006-L0009','41','Abekon Herath Mudiyanselage Indrani Kumari Wicramashinha','indrani','716721035V','No 126 /3 Udugama Palapathwala','0781623798',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-07-08','2026-07-01','2026-09-16',-1500.00,0.00,2,'2026-07-04',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 09:08:30','2026-06-17 02:37:24'),(67,1,'center_loan',2,4,8,'Dinusha Adikari','Pasindu Madushan','','CL-002-4-L0012','32','Jamaldhin fesmidhen filesiya','Filesiya','198084702562','No22 ulpatha pitiya kiula','0741277459',NULL,20000.00,'Self loan','week','flat',9.2307690,13,26000.00,2000.00,NULL,500.00,0.00,500.00,'hand_cash',20000.00,'2026-06-05','2026-07-09','2026-07-02','2026-09-17',-2000.00,0.00,2,'2026-07-05',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 09:12:33','2026-06-18 04:21:16'),(68,1,'center_loan',2,7,5,'Dinusha Adikari','Pasindu Madushan','Subhasani','CL-002-001-L0006','234','Adhikari Mudiyanselage Samanma','Adhikari','857952561V','pahalagama Dankanda','0769107367',NULL,15000.00,'Bu','week','flat',9.2307690,13,19500.00,1500.00,NULL,0.00,0.00,0.00,'hand_cash',15000.00,'2026-06-16','2026-07-06','2026-07-06','2026-09-21',0.00,0.00,2,'2026-07-09',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 09:13:31','2026-06-16 09:14:39'),(69,1,'center_loan',2,10,9,'Dinusha Adikari','Pasindu Madushan','W.M.H Pranandhu','CL-002-008-L0001','55','Warnakulasuriya Meri Hayasin Pranandhu','Pranandhu','7377002090V','36/3Purijjala,Mathale','0772559861',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-16','2026-06-30','2026-06-30','2026-09-15',0.00,0.00,2,'2026-07-03',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 09:40:35','2026-06-16 13:07:19'),(70,1,'center_loan',2,10,9,'Dinusha Adikari','Pasindu Madushan','','CL-002-008-L0002','56','Ilangan gedara swarnalatha','Swarnalatha','675633606V','No37/B Purijjala,Mathale','0769868723',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-16','2026-06-30','2026-06-30','2026-09-15',0.00,0.00,2,'2026-07-03',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 09:47:26','2026-06-16 13:07:55'),(71,1,'center_loan',2,10,9,'Dinusha Adikari','Pasindu Madushan','','CL-002-008-L0003','57','Wijesinha Arachilage Anusha Damayanthi','Anusha','857293908V','1613 Janapadhya Purijjala,Mathale','0785868446',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-16','2026-06-30','2026-06-30','2026-09-15',0.00,0.00,2,'2026-07-03',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 10:04:31','2026-06-16 13:07:23'),(72,1,'center_loan',2,10,9,'Dinusha Adikari','Pasindu Madushan','','CL-002-008-L0004','58','Marikkari Siththi Ariyasa Umma','Umma','196155100831','01,kalalpitiya,Ukuwela','0757023734',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-16','2026-06-30','2026-06-30','2026-09-15',0.00,0.00,2,'2026-07-03',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 10:09:18','2026-06-16 13:07:50'),(73,1,'center_loan',2,10,9,'Dinusha Adikari','Pasindu Madushan','','CL-002-008-L0005','59','Ihalagedara Shriyani Chandralatha','Shriyani','657773190V','135/1 warakamuna,Ukuwela','0784916973',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-16','2026-06-30','2026-06-30','2026-09-15',0.00,0.00,2,'2026-07-03',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 10:29:47','2026-06-16 13:07:31'),(74,1,'center_loan',2,10,9,'Dinusha Adikari','Pasindu Madushan','','CL-002-008-L0006','60','Pramodhya Harindhrani Sisiliya Luviss','Luviss','707951710V','12/A purijjala,mathale','0740066903',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-16','2026-06-30','2026-06-30','2026-09-15',0.00,0.00,2,'2026-07-03',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 10:34:10','2026-06-16 13:07:42'),(75,1,'center_loan',2,10,9,'Dinusha Adikari','Pasindu Madushan','','CL-002-008-L0007','61','Ibrahim Samsadhu Begam','Begam','196765402663','134 Kanday Road,Warakamuna','0774841940',NULL,15000.00,'Self job','week','flat',9.2307690,13,19500.00,1500.00,NULL,200.00,0.00,300.00,'hand_cash',15000.00,'2026-06-16','2026-06-30','2026-06-30','2026-09-15',0.00,0.00,2,'2026-07-03',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',3,'2026-06-16 10:38:38','2026-06-16 13:07:36');
/*!40000 ALTER TABLE `mf_loan_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_penalty_settings`
--

DROP TABLE IF EXISTS `mf_penalty_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_penalty_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `penalty_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_penalty_settings`
--

LOCK TABLES `mf_penalty_settings` WRITE;
/*!40000 ALTER TABLE `mf_penalty_settings` DISABLE KEYS */;
INSERT INTO `mf_penalty_settings` VALUES (1,0.00,1,'2026-06-10 08:38:41','2026-06-10 08:38:41');
/*!40000 ALTER TABLE `mf_penalty_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mf_routes`
--

DROP TABLE IF EXISTS `mf_routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mf_routes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mf_routes_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mf_routes`
--

LOCK TABLES `mf_routes` WRITE;
/*!40000 ALTER TABLE `mf_routes` DISABLE KEYS */;
INSERT INTO `mf_routes` VALUES (2,'Pasidu','002',1,'2026-06-10 10:26:26','2026-06-10 10:26:26');
/*!40000 ALTER TABLE `mf_routes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=146 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2025_12_06_054740_create_personal_access_tokens_table',1),(5,'2025_12_06_054748_create_companies_table',1),(6,'2025_12_06_075700_create_departments_table',1),(7,'2025_12_06_075704_create_designations_table',1),(8,'2025_12_06_075709_create_employees_table',1),(9,'2025_12_06_075712_create_attendance_table',1),(10,'2025_12_06_075718_create_leaves_table',1),(11,'2025_12_06_075721_create_payrolls_table',1),(12,'2025_12_12_063107_add_commission_fields_to_employees_table',1),(13,'2025_12_12_064818_make_date_of_birth_nullable_in_employees_table',1),(14,'2025_12_12_065152_create_candidates_table',1),(15,'2025_12_12_100000_create_candidate_documents_table',1),(16,'2025_12_12_100100_create_candidate_educations_table',1),(17,'2025_12_12_100200_create_candidate_experiences_table',1),(18,'2025_12_12_110000_add_photo_path_to_candidates_table',1),(19,'2025_12_12_120000_create_candidate_interviewers_table',1),(20,'2025_12_12_130000_create_candidate_interviews_table',1),(21,'2025_12_12_130100_create_candidate_interview_participants_table',1),(22,'2025_12_12_185918_create_employee_documents_table',1),(23,'2025_12_12_185925_create_employee_educations_table',1),(24,'2025_12_12_185932_create_employee_experiences_table',1),(25,'2025_12_13_053418_add_branch_id_to_employee_documents_table',1),(26,'2025_12_13_053421_add_branch_id_to_employee_educations_table',1),(27,'2025_12_13_053426_add_branch_id_to_employee_experiences_table',1),(28,'2025_12_13_053429_add_branch_id_to_candidate_documents_table',1),(29,'2025_12_13_053432_add_branch_id_to_candidate_educations_table',1),(30,'2025_12_13_053435_add_branch_id_to_candidate_experiences_table',1),(31,'2025_12_13_053437_add_branch_id_to_candidate_interviews_table',1),(32,'2025_12_13_053440_add_branch_id_to_candidate_interviewers_table',1),(33,'2025_12_13_053443_add_branch_id_to_candidate_interview_participants_table',1),(34,'2025_12_13_054250_remove_branch_id_from_candidate_documents_table',1),(35,'2025_12_13_054254_remove_branch_id_from_candidate_educations_table',1),(36,'2025_12_13_054257_remove_branch_id_from_candidate_experiences_table',1),(37,'2025_12_13_054301_remove_branch_id_from_candidate_interviews_table',1),(38,'2025_12_13_054306_remove_branch_id_from_candidate_interviewers_table',1),(39,'2025_12_13_054309_remove_branch_id_from_candidate_interview_participants_table',1),(40,'2025_12_13_064904_add_employee_id_and_branch_id_to_users_table',1),(41,'2025_12_13_075717_add_photo_path_to_employees_table',1),(42,'2025_12_19_015056_add_overtime_and_deduction_fields_to_employees_table',1),(43,'2025_12_19_021010_create_employee_allowances_deductions_table',1),(44,'2025_12_19_041715_create_test_table',1),(45,'2025_12_19_043007_add_country_and_currency_to_companies_table',1),(46,'2025_12_19_151258_add_two_stage_approval_to_leaves_table',1),(47,'2025_12_19_151313_create_leave_types_table',1),(48,'2025_12_19_180917_create_roles_table',1),(49,'2025_12_19_181005_create_permissions_table',1),(50,'2025_12_19_181011_create_user_roles_table',1),(51,'2025_12_19_181016_create_role_permissions_table',1),(52,'2025_12_19_192731_create_mortgages_table',1),(53,'2025_12_19_193056_create_mortgage_assets_table',1),(54,'2025_12_19_193103_create_mortgage_valuations_table',1),(55,'2025_12_19_193110_create_mortgage_guarantors_table',1),(56,'2025_12_19_193128_create_mortgage_documents_table',1),(57,'2025_12_19_193134_create_mortgage_schedules_table',1),(58,'2025_12_19_193140_create_mortgage_payments_table',1),(59,'2025_12_19_193157_create_customers_table',1),(60,'2025_12_20_100001_update_customers_add_details',1),(61,'2025_12_20_100002_create_customer_documents_table',1),(62,'2025_12_20_110003_make_mortgage_valuations_nullable',1),(63,'2025_12_20_183924_create_mortgage_payments_table',1),(64,'2025_12_22_065450_add_installment_frequency_to_mortgages_table',1),(65,'2025_12_22_070330_add_interest_calculation_frequency_to_mortgages_table',1),(66,'2025_12_22_082144_add_insurance_fee_to_mortgages_table',1),(67,'2026_01_24_104906_make_contact_number_nullable_in_mortgage_guarantors_table',1),(68,'2026_01_25_053632_add_designation_id_to_users_table',1),(69,'2026_03_17_090000_create_microfinance_settings_tables',1),(70,'2026_03_17_093000_refactor_mf_centers_to_use_route',1),(71,'2026_03_17_094000_add_mf_center_id_to_mf_groups_table',1),(72,'2026_03_17_100000_create_mf_loan_requests_tables',1),(73,'2026_03_18_120000_add_stamp_and_insurance_to_mf_loan_requests_table',1),(74,'2026_03_18_123000_add_charge_payment_mode_to_mf_loan_requests_table',1),(75,'2026_03_18_130000_add_branch_id_to_mf_loan_requests_table',1),(76,'2026_03_18_140000_add_loan_scope_and_nullable_mapping_to_mf_loan_requests_table',1),(77,'2026_03_18_150000_add_interest_type_to_mf_loan_requests_table',1),(78,'2026_03_18_160000_add_next_payment_date_to_mf_loan_requests_table',1),(79,'2026_03_18_170000_add_penalty_rate_to_mf_centers_table',1),(80,'2026_03_18_180000_create_mf_penalty_settings_table',1),(81,'2026_03_18_181000_remove_penalty_rate_from_mf_centers_table',1),(82,'2026_03_18_182000_add_penalty_snapshot_to_mf_loan_requests_table',1),(83,'2026_03_18_183000_add_due_date_to_mf_loan_requests_table',1),(84,'2026_03_18_184000_add_review_flags_to_mf_loan_requests_table',1),(85,'2026_03_18_185000_create_mf_loan_request_documents_table',1),(86,'2026_03_18_190000_create_mf_loan_collections_table',1),(87,'2026_03_18_201000_add_payment_fields_to_mf_loan_collections_table',1),(88,'2026_03_18_210000_add_loan_end_date_to_mf_loan_requests_table',1),(89,'2026_03_18_211000_add_arrears_balance_to_mf_loan_requests_table',1),(90,'2026_03_19_090000_add_loan_balance_and_correction_amount_for_repayment_reports',1),(91,'2026_03_20_120000_add_due_date_to_mortgages_table',1),(92,'2026_03_20_130000_add_arrears_amount_to_mortgages_table',1),(93,'2026_03_20_140000_add_collection_breakdown_fields_to_mortgage_payments_table',1),(94,'2026_03_20_150000_add_due_amount_fields_to_mortgages_table',1),(95,'2026_03_20_200000_create_finances_table',1),(96,'2026_03_21_090000_add_details_to_finances_table',1),(97,'2026_03_21_091000_create_finance_documents_table',1),(98,'2026_03_21_100000_create_finance_product_types_table',1),(99,'2026_03_23_090000_create_finance_collections_table',1),(100,'2026_03_23_100000_add_pay_type_to_finance_collections_table',1),(101,'2026_03_23_110000_add_reference_and_cheque_fields_to_finance_collections_table',1),(102,'2026_03_23_120000_add_approval_tracking_fields_to_finances_table',1),(103,'2026_03_23_130000_add_total_paid_and_balance_to_finances_table',1),(104,'2026_03_23_131000_add_refund_amount_to_finance_collections_table',1),(105,'2026_03_23_140000_add_terms_to_finance_product_types_table',1),(106,'2026_03_23_150000_add_due_capital_amount_to_finances_table',1),(107,'2026_03_23_160000_add_repayment_plan_to_finances_table',1),(108,'2026_03_23_170000_add_arrears_to_finances_table',1),(109,'2026_03_23_180000_create_draft_loans_table',1),(110,'2026_03_23_181000_remove_unused_columns_from_draft_loans_table',1),(111,'2026_03_23_182000_rename_installment_amount_to_interest_amount_in_draft_loans_table',1),(112,'2026_03_23_183000_create_savings_accounts_table',1),(113,'2026_03_23_184000_create_savings_account_transactions_table',1),(114,'2026_03_23_190000_make_email_nullable_on_customers_table',1),(115,'2026_03_23_191000_add_interest_credit_to_savings_account_transactions_type',1),(116,'2026_03_24_001000_add_branch_and_collector_to_finance_collections_table',1),(117,'2026_03_25_090000_create_mf_holidays_table',1),(118,'2026_03_25_130000_add_soft_delete_fields_to_mf_loan_collections_table',1),(119,'2026_03_25_170000_add_loan_code_to_mf_loan_requests_table',1),(120,'2026_03_25_180000_add_hold_close_status_to_mf_loan_requests_table',1),(121,'2026_03_28_120000_create_loan_requests_table',1),(122,'2026_03_28_140000_create_loan_request_documents_table',1),(123,'2026_04_04_120000_create_company_document_templates_table',1),(124,'2026_04_04_220000_extend_company_document_template_types_for_mortgage',1),(125,'2026_04_04_230000_create_system_settings_table',1),(126,'2026_04_05_090000_add_manager_and_opening_asset_to_companies_table',1),(127,'2026_04_26_060000_drop_unique_customer_no_from_mf_loan_requests',1),(128,'2026_05_06_000001_add_reporting_person_to_employees_table',1),(129,'2026_05_06_000002_add_tax_and_statutory_fields_to_employees_table',1),(130,'2026_05_06_000003_backfill_default_contributions_on_employees_table',1),(131,'2026_05_19_120000_increase_mf_loan_requests_interest_rate_precision',1),(132,'2026_05_19_140000_create_mf_holiday_loan_date_shifts_table',1),(133,'2026_05_25_120000_add_rejected_status_to_mortgages_table',1),(134,'2026_05_28_120000_add_investment_and_interest_type_to_savings_accounts',1),(135,'2026_05_28_140000_create_company_accounts_table',1),(136,'2026_05_28_150000_create_accounting_expenses_table',1),(137,'2026_05_28_180000_add_client_reference_to_mf_loan_collections_table',1),(138,'2026_05_29_100000_add_loan_request_collection_fields',1),(139,'2026_06_09_120000_add_photo_path_to_customers_table',1),(140,'2026_06_10_001000_add_logo_path_to_companies_table',2),(141,'2026_06_12_000001_create_employee_wallets_table',3),(142,'2026_06_12_000002_create_mf_loan_products_table',4),(143,'2026_06_12_000003_expand_mf_loan_products_interest_rate_precision',5),(144,'2026_06_16_000001_add_mobile_no_to_mf_loan_requests_table',6),(145,'2026_06_16_000002_align_pending_mf_loan_dates_to_center_meeting_day',7);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mortgage_assets`
--

DROP TABLE IF EXISTS `mortgage_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mortgage_assets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mortgage_id` bigint unsigned NOT NULL,
  `asset_type` enum('land','house','vehicle','gold','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `ownership_type` enum('single','joint') COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `deed_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deed_date` date DEFAULT NULL,
  `survey_plan_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registration_office` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `land_size_or_area` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_reg_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `engine_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chassis_no` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mortgage_assets_created_by_foreign` (`created_by`),
  KEY `mortgage_assets_mortgage_id_index` (`mortgage_id`),
  CONSTRAINT `mortgage_assets_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `mortgage_assets_mortgage_id_foreign` FOREIGN KEY (`mortgage_id`) REFERENCES `mortgages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mortgage_assets`
--

LOCK TABLES `mortgage_assets` WRITE;
/*!40000 ALTER TABLE `mortgage_assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `mortgage_assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mortgage_documents`
--

DROP TABLE IF EXISTS `mortgage_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mortgage_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mortgage_id` bigint unsigned NOT NULL,
  `document_type` enum('deed','valuation','agreement','insurance','nic','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mortgage_documents_uploaded_by_foreign` (`uploaded_by`),
  KEY `mortgage_documents_mortgage_id_index` (`mortgage_id`),
  CONSTRAINT `mortgage_documents_mortgage_id_foreign` FOREIGN KEY (`mortgage_id`) REFERENCES `mortgages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mortgage_documents_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mortgage_documents`
--

LOCK TABLES `mortgage_documents` WRITE;
/*!40000 ALTER TABLE `mortgage_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `mortgage_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mortgage_guarantors`
--

DROP TABLE IF EXISTS `mortgage_guarantors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mortgage_guarantors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mortgage_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nic` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `relationship` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `income` decimal(12,2) DEFAULT NULL,
  `contact_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mortgage_guarantors_mortgage_id_index` (`mortgage_id`),
  CONSTRAINT `mortgage_guarantors_mortgage_id_foreign` FOREIGN KEY (`mortgage_id`) REFERENCES `mortgages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mortgage_guarantors`
--

LOCK TABLES `mortgage_guarantors` WRITE;
/*!40000 ALTER TABLE `mortgage_guarantors` DISABLE KEYS */;
/*!40000 ALTER TABLE `mortgage_guarantors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mortgage_payments`
--

DROP TABLE IF EXISTS `mortgage_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mortgage_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mortgage_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `schedule_id` bigint unsigned DEFAULT NULL,
  `paid_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `interest_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `principal_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `profit_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `outstanding_principal_after` decimal(15,2) NOT NULL DEFAULT '0.00',
  `payment_method` enum('cash','bank','transfer','cheque') COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `collected_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mortgage_payments_schedule_id_foreign` (`schedule_id`),
  KEY `mortgage_payments_collected_by_foreign` (`collected_by`),
  KEY `mortgage_payments_mortgage_id_index` (`mortgage_id`),
  KEY `mortgage_payments_paid_date_index` (`paid_date`),
  CONSTRAINT `mortgage_payments_collected_by_foreign` FOREIGN KEY (`collected_by`) REFERENCES `users` (`id`),
  CONSTRAINT `mortgage_payments_mortgage_id_foreign` FOREIGN KEY (`mortgage_id`) REFERENCES `mortgages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mortgage_payments_schedule_id_foreign` FOREIGN KEY (`schedule_id`) REFERENCES `mortgage_schedules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mortgage_payments`
--

LOCK TABLES `mortgage_payments` WRITE;
/*!40000 ALTER TABLE `mortgage_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `mortgage_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mortgage_schedules`
--

DROP TABLE IF EXISTS `mortgage_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mortgage_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mortgage_id` bigint unsigned NOT NULL,
  `installment_no` int NOT NULL,
  `due_date` date NOT NULL,
  `principal` decimal(15,2) NOT NULL,
  `interest` decimal(15,2) NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` enum('pending','paid','overdue','partially_paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mortgage_schedules_mortgage_id_index` (`mortgage_id`),
  KEY `mortgage_schedules_due_date_index` (`due_date`),
  KEY `mortgage_schedules_status_index` (`status`),
  CONSTRAINT `mortgage_schedules_mortgage_id_foreign` FOREIGN KEY (`mortgage_id`) REFERENCES `mortgages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mortgage_schedules`
--

LOCK TABLES `mortgage_schedules` WRITE;
/*!40000 ALTER TABLE `mortgage_schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `mortgage_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mortgage_valuations`
--

DROP TABLE IF EXISTS `mortgage_valuations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mortgage_valuations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `mortgage_id` bigint unsigned NOT NULL,
  `market_value` decimal(15,2) DEFAULT NULL,
  `forced_sale_value` decimal(15,2) DEFAULT NULL,
  `valuation_date` date DEFAULT NULL,
  `valuer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mortgage_valuations_mortgage_id_index` (`mortgage_id`),
  CONSTRAINT `mortgage_valuations_mortgage_id_foreign` FOREIGN KEY (`mortgage_id`) REFERENCES `mortgages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mortgage_valuations`
--

LOCK TABLES `mortgage_valuations` WRITE;
/*!40000 ALTER TABLE `mortgage_valuations` DISABLE KEYS */;
/*!40000 ALTER TABLE `mortgage_valuations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mortgages`
--

DROP TABLE IF EXISTS `mortgages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mortgages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `mortgage_type` enum('land','house','vehicle','gold','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_amount` decimal(15,2) NOT NULL,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `interest_rate` decimal(5,2) NOT NULL,
  `interest_type` enum('fixed','reducing') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenure_months` int NOT NULL,
  `installment_frequency` enum('daily','weekly','monthly','quarterly','yearly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `interest_calculation_frequency` enum('daily','weekly','monthly','yearly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `installment_amount` decimal(15,2) DEFAULT NULL,
  `penalty_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `processing_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `insurance_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('draft','submitted','approved','active','arrears','settled','released','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `approved_by` bigint unsigned DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `arrears_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `due_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `due_interest_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mortgages_branch_id_foreign` (`branch_id`),
  KEY `mortgages_approved_by_foreign` (`approved_by`),
  KEY `mortgages_created_by_foreign` (`created_by`),
  KEY `mortgages_tenant_id_branch_id_index` (`tenant_id`,`branch_id`),
  KEY `mortgages_customer_id_index` (`customer_id`),
  KEY `mortgages_status_index` (`status`),
  CONSTRAINT `mortgages_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  CONSTRAINT `mortgages_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `mortgages_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `mortgages_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mortgages`
--

LOCK TABLES `mortgages` WRITE;
/*!40000 ALTER TABLE `mortgages` DISABLE KEYS */;
/*!40000 ALTER TABLE `mortgages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payrolls`
--

DROP TABLE IF EXISTS `payrolls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payrolls` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `branch_id` bigint unsigned NOT NULL,
  `employee_id` bigint unsigned NOT NULL,
  `month_year` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `basic_salary` decimal(10,2) NOT NULL,
  `allowances` decimal(10,2) NOT NULL DEFAULT '0.00',
  `deductions` decimal(10,2) NOT NULL DEFAULT '0.00',
  `net_salary` decimal(10,2) NOT NULL,
  `working_days` int NOT NULL,
  `present_days` int NOT NULL,
  `absent_days` int NOT NULL,
  `overtime_hours` decimal(5,2) NOT NULL DEFAULT '0.00',
  `overtime_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('pending','processed','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `processed_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payrolls_employee_id_month_year_unique` (`employee_id`,`month_year`),
  KEY `payrolls_tenant_id_foreign` (`tenant_id`),
  KEY `payrolls_branch_id_foreign` (`branch_id`),
  CONSTRAINT `payrolls_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `payrolls_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `payrolls_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payrolls`
--

LOCK TABLES `payrolls` WRITE;
/*!40000 ALTER TABLE `payrolls` DISABLE KEYS */;
INSERT INTO `payrolls` VALUES (1,1,1,1,'2026-06',115000.00,0.00,0.00,3833.33,1,1,0,0.00,0.00,'paid',NULL,'2026-06-10 08:48:30','2026-06-10 08:49:04');
/*!40000 ALTER TABLE `payrolls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'view_users','User Management','View users',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(2,'create_users','User Management','Create users',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(3,'edit_users','User Management','Edit users',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(4,'delete_users','User Management','Delete users',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(5,'view_employees','Employee Management','View employees',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(6,'create_employees','Employee Management','Create employees',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(7,'edit_employees','Employee Management','Edit employees',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(8,'delete_employees','Employee Management','Delete employees',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(9,'view_departments','Department Management','View departments',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(10,'create_departments','Department Management','Create departments',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(11,'edit_departments','Department Management','Edit departments',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(12,'delete_departments','Department Management','Delete departments',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(13,'view_attendance','Attendance Management','View attendance records',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(14,'create_attendance','Attendance Management','Create attendance records',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(15,'edit_attendance','Attendance Management','Edit attendance records',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(16,'delete_attendance','Attendance Management','Delete attendance records',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(17,'view_leaves','Leave Management','View leave requests',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(18,'create_leaves','Leave Management','Create leave requests',1,'2026-06-09 17:03:04','2026-06-09 17:03:04'),(19,'approve_leaves','Leave Management','Approve leave requests',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(20,'reject_leaves','Leave Management','Reject leave requests',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(21,'view_payrolls','Payroll Management','View payroll records',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(22,'create_payrolls','Payroll Management','Create payroll records',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(23,'edit_payrolls','Payroll Management','Edit payroll records',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(24,'delete_payrolls','Payroll Management','Delete payroll records',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(25,'view_candidates','Candidate Management','View candidates',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(26,'create_candidates','Candidate Management','Create candidates',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(27,'edit_candidates','Candidate Management','Edit candidates',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(28,'delete_candidates','Candidate Management','Delete candidates',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(29,'view_roles','Role Management','View roles',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(30,'create_roles','Role Management','Create roles',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(31,'edit_roles','Role Management','Edit roles',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(32,'delete_roles','Role Management','Delete roles',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(33,'assign_roles','Role Management','Assign roles to users',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(34,'view_permissions','Permission Management','View permissions',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(35,'create_permissions','Permission Management','Create permissions',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(36,'edit_permissions','Permission Management','Edit permissions',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(37,'delete_permissions','Permission Management','Delete permissions',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(38,'hrm_employee_add_new_employee','HRM','Add New Employee | Route: /dashboard/hrm/employees | Add New Employee Modal',1,'2026-06-10 07:58:49','2026-06-10 07:58:49'),(39,'hrm_employee_edit_employee_details','HRM','Edit Employee Details | Route: /dashboard/hrm/employees | Edit Employee Modal',1,'2026-06-10 07:58:49','2026-06-10 07:58:49'),(40,'hrm_employee_add_education','HRM','Add Education | Route: /dashboard/hrm/employees | Education Modal',1,'2026-06-10 07:58:50','2026-06-10 07:58:50'),(41,'hrm_employee_add_experience','HRM','Add Experience | Route: /dashboard/hrm/employees | Experience Modal',1,'2026-06-10 07:58:50','2026-06-10 07:58:50'),(42,'hrm_employee_add_documents','HRM','Add Documents | Route: /dashboard/hrm/employees | Documents Modal',1,'2026-06-10 07:58:51','2026-06-10 07:58:51'),(43,'hrm_employee_add_allowances','HRM','Add Allowances | Route: /dashboard/hrm/employees | Allowances & Deductions Modal',1,'2026-06-10 07:58:51','2026-06-10 07:58:51'),(44,'hrm_employee_leave_management','HRM','Leave Management | Route: /dashboard/hrm/employees | Leave Management Modal',1,'2026-06-10 07:58:52','2026-06-10 07:58:52'),(45,'hrm_employee_delete_employee','HRM','Delete Employee | Route: /dashboard/hrm/employees | Delete Function',1,'2026-06-10 07:58:52','2026-06-10 07:58:52'),(46,'hrm_department_add_department','HRM','Add Department | Route: /dashboard/hrm/departments',1,'2026-06-10 07:58:52','2026-06-10 07:58:52'),(47,'hrm_department_edit_department','HRM','Edit Department | Route: /dashboard/hrm/departments | Edit Department Modal',1,'2026-06-10 07:58:53','2026-06-10 07:58:53'),(48,'hrm_department_delete_department','HRM','Delete Department | Route: /dashboard/hrm/departments -',1,'2026-06-10 07:58:53','2026-06-10 07:58:53'),(49,'hrm_designation_designation_management_view_delete','HRM','Designation Management (View/Delete) | Route: /dashboard/hrm/designations',1,'2026-06-10 07:58:53','2026-06-10 07:58:53'),(50,'hrm_attendance_attendance_management','HRM','Attendance Management | Route: /dashboard/hrm/attendance',1,'2026-06-10 07:58:54','2026-06-10 07:58:54'),(51,'hrm_leave_new_leave_request','HRM','New Leave Request | Route: /dashboard/hrm/leaves',1,'2026-06-10 07:58:54','2026-06-10 07:58:54'),(52,'hrm_leave_approve_leave','HRM','Approve Leave | Route: /dashboard/hrm/leaves | New Leave Request',1,'2026-06-10 07:58:54','2026-06-10 07:58:54'),(53,'hrm_leave_reject_leave','HRM','Reject Leave | Route: /dashboard/hrm/leaves',1,'2026-06-10 07:58:55','2026-06-10 07:58:55'),(54,'hrm_leave_manage_leave_types','HRM','Manage Leave Types | Route: /dashboard/hrm/leaves',1,'2026-06-10 07:58:55','2026-06-10 07:58:55'),(55,'hrm_leave_delete_leave','HRM','Delete Leave | Route: /dashboard/hrm/leaves',1,'2026-06-10 07:58:56','2026-06-10 07:58:56'),(56,'hrm_leave_edit_leave','HRM','Edit Leave | Route: /dashboard/hrm/leaves',1,'2026-06-10 07:58:56','2026-06-10 07:58:56'),(57,'hrm_roles_designation_privileges_add_new_role','HRM','Add New Role | Route: /dashboard/hrm/roles',1,'2026-06-10 07:58:56','2026-06-10 07:58:56'),(58,'hrm_roles_designation_privileges_delete_role','HRM','Delete Role | Route: /dashboard/hrm/roles',1,'2026-06-10 07:58:57','2026-06-10 07:58:57'),(59,'hrm_roles_designation_privileges_edit_role','HRM','Edit Role | Route: /dashboard/hrm/roles',1,'2026-06-10 07:58:57','2026-06-10 07:58:57'),(60,'hrm_payroll_management_generate_payroll','HRM','Generate Payroll | Route: /dashboard/hrm/payroll',1,'2026-06-10 07:58:58','2026-06-10 07:58:58'),(61,'hrm_candidates_add_candidate','HRM','Add Candidate | Route: /dashboard/hrm/candidates',1,'2026-06-10 07:58:58','2026-06-10 07:58:58'),(62,'hrm_candidates_view_candidate','HRM','View Candidate | Route: /dashboard/hrm/candidates',1,'2026-06-10 07:58:59','2026-06-10 07:58:59'),(63,'hrm_candidates_edit_candidate','HRM','Edit Candidate | Route: /dashboard/hrm/candidates',1,'2026-06-10 07:58:59','2026-06-10 07:58:59'),(64,'hrm_candidates_delete_candidate','HRM','Delete Candidate | Route: /dashboard/hrm/candidates',1,'2026-06-10 07:59:00','2026-06-10 07:59:00'),(65,'credit_general_loan_management','Credit','Loan Management | Route: /dashboard/loan',1,'2026-06-10 07:59:00','2026-06-10 07:59:00'),(66,'credit_general_new_loan_request','Credit','New Loan Request | Route: /dashboard/loan/request',1,'2026-06-10 07:59:01','2026-06-10 07:59:01'),(67,'credit_general_loan_request_view','Credit','Loan Request View | Route: /dashboard/loan/requests',1,'2026-06-10 07:59:01','2026-06-10 07:59:01'),(68,'credit_general_request_queue','Credit','Request Queue | Route: /dashboard/loan/requests',1,'2026-06-10 07:59:01','2026-06-10 07:59:01'),(69,'credit_general_credit_module','Credit','Credit Module | Route: /dashboard/credit',1,'2026-06-10 07:59:02','2026-06-10 07:59:02'),(70,'credit_general_finance_management','Credit','Finance Management | Route: /dashboard/finance',1,'2026-06-10 07:59:02','2026-06-10 07:59:02'),(71,'credit_general_issue_finance','Credit','Issue Finance | Route: /dashboard/finance/issue',1,'2026-06-10 07:59:03','2026-06-10 07:59:03'),(72,'credit_general_approvals','Credit','Approvals | Route: /dashboard/finance/approvals',1,'2026-06-10 07:59:03','2026-06-10 07:59:03'),(73,'credit_general_finance_customer_handling','Credit','Finance Customer Handling | Route: /dashboard/finance/customers',1,'2026-06-10 07:59:04','2026-06-10 07:59:04'),(74,'credit_general_finance_reports','Credit','Finance Reports | Route: /dashboard/finance/reports',1,'2026-06-10 07:59:04','2026-06-10 07:59:04'),(75,'credit_general_finance_collection','Credit','Finance Collection | Route: /dashboard/finance/collections',1,'2026-06-10 07:59:05','2026-06-10 07:59:05'),(76,'credit_general_microfinance','Credit','Microfinance | Route: /dashboard/microfinance',1,'2026-06-10 07:59:05','2026-06-10 07:59:05'),(77,'credit_general_request_loan','Credit','Request Loan | Route: /dashboard/microfinance/loans/request',1,'2026-06-10 07:59:06','2026-06-10 07:59:06'),(78,'credit_general_loan_approvals','Credit','Loan Approvals | Route: /dashboard/microfinance/loans/approvals',1,'2026-06-10 07:59:06','2026-06-10 07:59:06'),(79,'credit_general_view_related_loans','Credit','View Related Loans | Route: /dashboard/microfinance/loans/released',1,'2026-06-10 07:59:07','2026-06-10 07:59:07'),(80,'credit_general_collection_management','Credit','Collection Management | Route: /dashboard/microfinance/collections',1,'2026-06-10 07:59:08','2026-06-10 07:59:08'),(81,'credit_general_center_collection','Credit','Center Collection | Route: /dashboard/microfinance/collections',1,'2026-06-10 07:59:08','2026-06-10 07:59:08'),(82,'credit_general_route_collection','Credit','Route Collection | Route: /dashboard/microfinance/collections',1,'2026-06-10 07:59:09','2026-06-10 07:59:09'),(83,'credit_general_office_collection','Credit','Office Collection | Route: /dashboard/microfinance/collections',1,'2026-06-10 07:59:09','2026-06-10 07:59:09'),(84,'credit_general_payments_view','Credit','Payments View | Route: /dashboard/microfinance/payments',1,'2026-06-10 07:59:09','2026-06-10 07:59:09'),(85,'credit_general_microfinance_customers','Credit','Microfinance Customers | Route: /dashboard/microfinance/customers',1,'2026-06-10 07:59:10','2026-06-10 07:59:10'),(86,'credit_general_summary_report_workspace','Credit','Summary Report Workspace | Route: /dashboard/microfinance',1,'2026-06-10 07:59:10','2026-06-10 07:59:10'),(87,'credit_general_summary_report_total_outstanding_amount','Credit','Summary Report Total Outstanding Amount | Route: /dashboard/microfinance',1,'2026-06-10 07:59:11','2026-06-10 07:59:11'),(88,'credit_general_summary_report_today_collection','Credit','Summary Report Today Collection | Route: /dashboard/microfinance',1,'2026-06-10 07:59:11','2026-06-10 07:59:11'),(89,'credit_general_summary_report_asset_value_total','Credit','Summary Report Asset Value Total | Route: /dashboard/microfinance',1,'2026-06-10 07:59:12','2026-06-10 07:59:12'),(90,'credit_general_summary_report_month_collection','Credit','Summary Report Month Collection | Route: /dashboard/microfinance',1,'2026-06-10 07:59:12','2026-06-10 07:59:12'),(91,'credit_general_summary_report_imagine_profit','Credit','Summary Report Imagine Profit | Route: /dashboard/microfinance',1,'2026-06-10 07:59:12','2026-06-10 07:59:12'),(92,'credit_general_summary_report_today_profit','Credit','Summary Report Today Profit | Route: /dashboard/microfinance',1,'2026-06-10 07:59:13','2026-06-10 07:59:13'),(93,'credit_general_summary_report_month_profit','Credit','Summary Report Month Profit | Route: /dashboard/microfinance',1,'2026-06-10 07:59:13','2026-06-10 07:59:13'),(94,'credit_general_settings_workspace','Credit','Settings Workspace | Route: /dashboard/microfinance/settings',1,'2026-06-10 07:59:14','2026-06-10 07:59:14'),(95,'credit_general_create_route','Credit','Create Route | Create Route function',1,'2026-06-10 07:59:14','2026-06-10 07:59:14'),(96,'credit_general_create_center','Credit','Create Center | Create Center function',1,'2026-06-10 07:59:15','2026-06-10 07:59:15'),(97,'credit_general_create_group','Credit','Create Group | Create Group function',1,'2026-06-10 07:59:16','2026-06-10 07:59:16'),(98,'credit_general_mark_holiday','Credit','Mark Holiday | Mark Holiday function',1,'2026-06-10 07:59:16','2026-06-10 07:59:16'),(99,'credit_general_add_initial_penalty_rate','Credit','Add Initial Penalty Rate | Add Initial Penalty Rate function',1,'2026-06-10 07:59:17','2026-06-10 07:59:17'),(100,'credit_general_loan_hold_close_control','Credit','Loan Hold / Close Control',1,'2026-06-10 07:59:17','2026-06-10 07:59:17'),(101,'credit_general_mortgage_management','Credit','Mortgage Management | Route: /dashboard/mortgages',1,'2026-06-10 07:59:18','2026-06-10 07:59:18'),(102,'credit_general_create_mortgage','Credit','Create Mortgage | Route: /dashboard/mortgages/create',1,'2026-06-10 07:59:18','2026-06-10 07:59:18'),(103,'credit_general_mortgage_approvals','Credit','Mortgage Approvals | Route: /dashboard/mortgages/approvals',1,'2026-06-10 07:59:19','2026-06-10 07:59:19'),(104,'credit_general_mortgage_portfolio','Credit','Mortgage Portfolio | Route: /dashboard/mortgages/portfolio',1,'2026-06-10 07:59:20','2026-06-10 07:59:20'),(105,'credit_general_mortgage_reports','Credit','Mortgage Reports | Route: /dashboard/mortgages/reports',1,'2026-06-10 07:59:20','2026-06-10 07:59:20'),(106,'savings_deposits_dashboard_savings_deposits_general_manage_accounts','Savings & Deposits - /dashboard/savings-deposits','Manage Accounts | Route: /dashboard/savings-deposits/accounts',1,'2026-06-10 07:59:20','2026-06-10 07:59:20'),(107,'reports_general_micro_finance_related_reports','Reports','Micro Finance Related Reports',1,'2026-06-10 07:59:21','2026-06-10 07:59:21'),(108,'reports_general_collection_report','Reports','Collection Report | Route: /dashboard/microfinance/reports/collection',1,'2026-06-10 07:59:21','2026-06-10 07:59:21'),(109,'reports_general_field_officer_collection_report','Reports','Field Officer Collection Report | Route: /dashboard/microfinance/reports/field-officer-collection',1,'2026-06-10 07:59:22','2026-06-10 07:59:22'),(110,'reports_general_arrears_report','Reports','Arrears Report | Route: /dashboard/microfinance/reports/arrears',1,'2026-06-10 07:59:22','2026-06-10 07:59:22'),(111,'reports_general_active_member_report','Reports','Active Member Report | Route: /dashboard/microfinance/reports/active-members',1,'2026-06-10 07:59:22','2026-06-10 07:59:22'),(112,'reports_general_blacklisted_customer_report','Reports','Blacklisted Customer Report | Route: /dashboard/microfinance/reports/blacklisted-customers',1,'2026-06-10 07:59:23','2026-06-10 07:59:23'),(113,'reports_general_re_payment_report','Reports','Re-Payment Report | Route: /dashboard/microfinance/reports/repayment',1,'2026-06-10 07:59:23','2026-06-10 07:59:23'),(114,'reports_general_recovery_report','Reports','Recovery Report | Route: /dashboard/microfinance/reports/recovery',1,'2026-06-10 07:59:24','2026-06-10 07:59:24'),(115,'reports_general_mortgage_management_related_reports','Reports','Mortgage Management Related Reports',1,'2026-06-10 07:59:24','2026-06-10 07:59:24'),(116,'reports_general_mortgage_collection_report','Reports','Mortgage Collection Report | Route: /dashboard/mortgages/reports/collection',1,'2026-06-10 07:59:24','2026-06-10 07:59:24'),(117,'reports_general_mortgage_arrears_report','Reports','Mortgage Arrears Report | Route: /dashboard/mortgages/reports/arrears',1,'2026-06-10 07:59:25','2026-06-10 07:59:25'),(118,'reports_general_mortgage_portfolio_report','Reports','Mortgage Portfolio Report | Route: /dashboard/mortgages/reports/portfolio',1,'2026-06-10 07:59:25','2026-06-10 07:59:25'),(119,'reports_general_savings_and_deposit_related_reports','Reports','Savings and Deposit Related Reports',1,'2026-06-10 07:59:26','2026-06-10 07:59:26'),(120,'reports_general_savings_ledger_report','Reports','Savings Ledger Report | Route: /dashboard/savings-deposits/reports/ledger',1,'2026-06-10 07:59:26','2026-06-10 07:59:26'),(121,'reports_general_deposit_growth_report','Reports','Deposit Growth Report | Route: /dashboard/savings-deposits/reports/deposit-growth',1,'2026-06-10 07:59:26','2026-06-10 07:59:26'),(122,'reports_general_maturity_report','Reports','Maturity Report | Route: /dashboard/savings-deposits/reports/maturity',1,'2026-06-10 07:59:27','2026-06-10 07:59:27'),(123,'reports_general_finance_management_related_reports','Reports','Finance Management Related Reports',1,'2026-06-10 07:59:27','2026-06-10 07:59:27'),(124,'reports_general_income_and_expense_report','Reports','Income and Expense Report | Route: /dashboard/reports/income-expense',1,'2026-06-10 07:59:27','2026-06-10 07:59:27'),(125,'reports_general_cash_flow_report','Reports','Cash Flow Report | Route: /dashboard/mortgages/reports/arrears',1,'2026-06-10 07:59:28','2026-06-10 07:59:28'),(126,'reports_general_general_ledger_snapshot','Reports','General Ledger Snapshot | Route: /dashboard/reports/general-ledger',1,'2026-06-10 07:59:28','2026-06-10 07:59:28'),(127,'reports_general_branch_management_related_reports','Reports','Branch Management Related Reports',1,'2026-06-10 07:59:29','2026-06-10 07:59:29'),(128,'reports_general_branch_performance_report','Reports','Branch Performance Report',1,'2026-06-10 07:59:29','2026-06-10 07:59:29'),(129,'reports_general_branch_collection_report','Reports','Branch Collection Report',1,'2026-06-10 07:59:30','2026-06-10 07:59:30'),(130,'reports_general_branch_staff_productivity_report','Reports','Branch Staff Productivity Report',1,'2026-06-10 07:59:30','2026-06-10 07:59:30'),(131,'credit_summary_report_workspace_summary_report_total_outstanding_amount','Credit','Summary Report Total Outstanding Amount | Route: /dashboard/microfinance',1,'2026-06-10 07:59:31','2026-06-10 07:59:31'),(132,'credit_summary_report_workspace_summary_report_today_collection','Credit','Summary Report Today Collection | Route: /dashboard/microfinance',1,'2026-06-10 07:59:31','2026-06-10 07:59:31'),(133,'credit_summary_report_workspace_summary_report_asset_value_total','Credit','Summary Report Asset Value Total | Route: /dashboard/microfinance',1,'2026-06-10 07:59:31','2026-06-10 07:59:31'),(134,'credit_summary_report_workspace_summary_report_month_collection','Credit','Summary Report Month Collection | Route: /dashboard/microfinance',1,'2026-06-10 07:59:32','2026-06-10 07:59:32'),(135,'credit_summary_report_workspace_summary_report_imagine_profit','Credit','Summary Report Imagine Profit | Route: /dashboard/microfinance',1,'2026-06-10 07:59:32','2026-06-10 07:59:32'),(136,'credit_summary_report_workspace_summary_report_today_profit','Credit','Summary Report Today Profit | Route: /dashboard/microfinance',1,'2026-06-10 07:59:33','2026-06-10 07:59:33'),(137,'credit_summary_report_workspace_summary_report_month_profit','Credit','Summary Report Month Profit | Route: /dashboard/microfinance',1,'2026-06-10 07:59:33','2026-06-10 07:59:33');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (1,'App\\Models\\User',1,'API Token','cb9e425315ff6b4b7dbc1714e17a2f158bf307b1d2086827895310b71d298d23','[\"*\"]','2026-06-09 17:06:04',NULL,'2026-06-09 17:04:46','2026-06-09 17:06:04'),(2,'App\\Models\\User',1,'API Token','bb3c2ce440f00dcdd2b63556f52293d3e7570a2bb0288b2424f481b228511725','[\"*\"]','2026-06-10 02:12:41',NULL,'2026-06-10 02:12:30','2026-06-10 02:12:41'),(3,'App\\Models\\User',1,'API Token','ed04fcf64046cb3aacc48ac9e21b1c7362c457cb1116bec48874d0375248918c','[\"*\"]','2026-06-10 06:52:55',NULL,'2026-06-10 06:52:54','2026-06-10 06:52:55'),(4,'App\\Models\\User',1,'API Token','cac9ee53ca74edef8677e381f7bf4029ea104ddb7d3d9e413d3543647302e621','[\"*\"]','2026-06-10 06:53:07',NULL,'2026-06-10 06:52:55','2026-06-10 06:53:07'),(5,'App\\Models\\User',1,'API Token','d4c19c07799c057a63627cbb89b8e801fd28fbd161d5914fe718e1632ebb85ed','[\"*\"]','2026-06-10 07:07:23',NULL,'2026-06-10 06:54:35','2026-06-10 07:07:23'),(6,'App\\Models\\User',1,'API Token','41bbd8fb88875967171b91b7ebfbe0e2510c9c64839620f7c80d034e764633bd','[\"*\"]','2026-06-10 08:16:14',NULL,'2026-06-10 07:01:15','2026-06-10 08:16:14'),(7,'App\\Models\\User',1,'API Token','c3861b393f3fe5a773b407327d9fac9e3e5d8fd284d3014b725f5ceec3c53636','[\"*\"]','2026-06-10 08:16:29',NULL,'2026-06-10 08:05:54','2026-06-10 08:16:29'),(8,'App\\Models\\User',1,'API Token','a7bf5cd17b58f598862881f4cf11f2fb7b4d81810231453acb5c2fb67f9b5575','[\"*\"]','2026-06-10 09:38:59',NULL,'2026-06-10 08:10:04','2026-06-10 09:38:59'),(9,'App\\Models\\User',1,'API Token','5a574d3f14ea5dd3e39dfa56de38e192e6afbba16600912a2456d62fc0e6139a','[\"*\"]','2026-06-10 08:27:58',NULL,'2026-06-10 08:17:11','2026-06-10 08:27:58'),(10,'App\\Models\\User',1,'API Token','000f377714cfaf01b99f98ae34ed91cd72f87545cc345d39861a87a8fc8eb4c5','[\"*\"]','2026-06-10 09:44:08',NULL,'2026-06-10 08:22:03','2026-06-10 09:44:08'),(11,'App\\Models\\User',1,'API Token','1ef2484e80735902d6e74d26ab88b5cb10286059cd9f3e4fb6f023f5a647cc95','[\"*\"]','2026-06-10 11:42:02',NULL,'2026-06-10 08:28:36','2026-06-10 11:42:02'),(12,'App\\Models\\User',1,'API Token','a62efebf5802a56b2be4ba401b3a373f9844adf59522fa0a9b549fe7da6ac636','[\"*\"]','2026-06-11 01:35:53',NULL,'2026-06-10 09:45:53','2026-06-11 01:35:53'),(13,'App\\Models\\User',3,'API Token','c83cf60e9c25d7fe36d918555431ae41ab308c527b9060eb45d9e27592fc6c46','[\"*\"]','2026-06-10 10:49:37',NULL,'2026-06-10 10:36:29','2026-06-10 10:49:37'),(14,'App\\Models\\User',3,'API Token','ad89c2b4d6e52972ac3c2afaa126b07ed0cf01a9a53b864a85ecbaf6bcb5e091','[\"*\"]','2026-06-10 11:04:13',NULL,'2026-06-10 11:03:20','2026-06-10 11:04:13'),(15,'App\\Models\\User',3,'API Token','14b6a34be9de16f3b1c89b249fd8d1cc9dbe9668f61180708c5688c2ed764b0c','[\"*\"]','2026-06-10 11:07:53',NULL,'2026-06-10 11:07:17','2026-06-10 11:07:53'),(16,'App\\Models\\User',3,'API Token','7d52acb58c893a5d1f44d61dbfc5d34ff3ce1a64f96f26b85b46c6fe3ec94897','[\"*\"]','2026-06-10 11:19:14',NULL,'2026-06-10 11:18:20','2026-06-10 11:19:14'),(17,'App\\Models\\User',3,'API Token','c370f13b9fdfbb8beb7efcfd5b61299eb3b6bc0fd96529ba797ef205c0d1d4d8','[\"*\"]','2026-06-10 11:31:22',NULL,'2026-06-10 11:22:48','2026-06-10 11:31:22'),(18,'App\\Models\\User',3,'API Token','a1cc5074477b109059b0081f2527e19757b7dc6dbb4fc8933875e66c43187889','[\"*\"]','2026-06-10 11:55:00',NULL,'2026-06-10 11:31:59','2026-06-10 11:55:00'),(19,'App\\Models\\User',1,'API Token','588f7d92dec17a6d21be73480d809eff4c8f2beebd763fb3a0f3a6d046928ddd','[\"*\"]','2026-06-10 11:37:10',NULL,'2026-06-10 11:36:27','2026-06-10 11:37:10'),(20,'App\\Models\\User',3,'API Token','149655601ae31e89eb10fa0770b13e0ad4968fd679684d3ccc658d99e6d87381','[\"*\"]','2026-06-10 11:42:37',NULL,'2026-06-10 11:42:24','2026-06-10 11:42:37'),(21,'App\\Models\\User',1,'API Token','0231010f158a2cb06a331c873ce0f960d14daeb0ad9d8f0b667f9defaa533ad1','[\"*\"]','2026-06-10 13:47:04',NULL,'2026-06-10 11:46:49','2026-06-10 13:47:04'),(22,'App\\Models\\User',1,'API Token','49d4f713201733a4f6677250a55023c3b7cfbc29b71dec14a7f0ce795c7b349a','[\"*\"]','2026-06-10 17:24:24',NULL,'2026-06-10 12:01:25','2026-06-10 17:24:24'),(23,'App\\Models\\User',2,'API Token','1d39b2055a0bd9529dfae91013bc5b4b57564c1717a9616fe1f2f6a9ba48d8da','[\"*\"]','2026-06-10 13:49:32',NULL,'2026-06-10 13:48:10','2026-06-10 13:49:32'),(24,'App\\Models\\User',2,'API Token','37bf85ea71952ba849809be36888ab20b27f6343a7fa86a172c0f3ca807956e2','[\"*\"]','2026-06-10 15:47:54',NULL,'2026-06-10 15:45:59','2026-06-10 15:47:54'),(25,'App\\Models\\User',2,'API Token','4f430b1b8e1025a1f9e1aec5524b2d543b6807ce911f79a30849cd964f89e851','[\"*\"]','2026-06-10 21:46:09',NULL,'2026-06-10 21:43:35','2026-06-10 21:46:09'),(26,'App\\Models\\User',3,'API Token','b57932b509c760ede09c3786bb613e59ed5e4e163e802f972c824dabf75fe1e4','[\"*\"]','2026-06-11 07:29:01',NULL,'2026-06-11 07:28:55','2026-06-11 07:29:01'),(27,'App\\Models\\User',3,'API Token','e9613f21f237af507ac14c87b392867de98d945a188fb1e799376beb488e609a','[\"*\"]','2026-06-11 07:39:59',NULL,'2026-06-11 07:29:00','2026-06-11 07:39:59'),(28,'App\\Models\\User',1,'API Token','154958f238f5091523151cad60622e80cee440e48f7c8c23c1c72695668c0a5d','[\"*\"]','2026-06-14 06:26:25',NULL,'2026-06-11 07:34:32','2026-06-14 06:26:25'),(29,'App\\Models\\User',3,'API Token','b7f0aa83bd56176ac921960f6ce2774a80dbca079a86318417660a579700d8b2','[\"*\"]','2026-06-11 08:47:50',NULL,'2026-06-11 08:33:46','2026-06-11 08:47:50'),(30,'App\\Models\\User',3,'API Token','70dd9982c792182de605809a4a3a62bc98fe8d0aafa2ab301a08fbe2aa745181','[\"*\"]','2026-06-11 09:19:09',NULL,'2026-06-11 08:48:27','2026-06-11 09:19:09'),(31,'App\\Models\\User',3,'API Token','8d55e087052bc6930ad913a6d6adf18f0d0138d309273c1f26f711126abc75f6','[\"*\"]','2026-06-12 01:58:00',NULL,'2026-06-12 00:35:53','2026-06-12 01:58:00'),(32,'App\\Models\\User',2,'API Token','df1e9e4a12bac3dfc22e654d3f281245e9540e9637a60b51a89a3d1e266dfa46','[\"*\"]','2026-06-15 12:57:06',NULL,'2026-06-12 01:12:52','2026-06-15 12:57:06'),(33,'App\\Models\\User',2,'API Token','f6959e6cda65c5ddb1c4f2deb7e0597b2d93f42ee55cd3265aa9c97307fc3ef6','[\"*\"]','2026-06-12 02:12:40',NULL,'2026-06-12 02:05:39','2026-06-12 02:12:40'),(34,'App\\Models\\User',3,'API Token','c20dd9db50136f22041d443344b176ff7179bebccd38132f32235afbf697290f','[\"*\"]','2026-06-12 08:26:34',NULL,'2026-06-12 08:24:31','2026-06-12 08:26:34'),(35,'App\\Models\\User',3,'API Token','e998047361d02628084963cd8cfca59f141cce0661efe43a74494b6320dc8a4b','[\"*\"]','2026-06-15 04:08:07',NULL,'2026-06-15 04:07:34','2026-06-15 04:08:07'),(36,'App\\Models\\User',3,'API Token','2432fab4f02071748c2a37b9b8c071f5175db859ecedc9d925ca33d42b0870bf','[\"*\"]','2026-06-15 10:10:59',NULL,'2026-06-15 09:26:03','2026-06-15 10:10:59'),(37,'App\\Models\\User',2,'API Token','72795ab0053d28e8e5a5a3cd0c9c51247d2e5e714113364c6af4282489fb16d8','[\"*\"]','2026-06-15 10:12:45',NULL,'2026-06-15 09:26:53','2026-06-15 10:12:45'),(38,'App\\Models\\User',3,'API Token','9d280ca4e0bae6c64b83ccd58a623dfb79628f0dda3602f3af44d3fffd428eb3','[\"*\"]','2026-06-15 11:25:16',NULL,'2026-06-15 10:11:08','2026-06-15 11:25:16'),(39,'App\\Models\\User',3,'API Token','118d2f0ba0d557442d8a0d845498be7c65ab0f44b78c1d3436b8a0358afd3fca','[\"*\"]','2026-06-16 01:40:06',NULL,'2026-06-16 00:33:09','2026-06-16 01:40:06'),(40,'App\\Models\\User',1,'API Token','b6db125c6803296eace088d52ba335944eafbe1bc6403870979427b175cf1622','[\"*\"]','2026-06-16 05:29:14',NULL,'2026-06-16 01:12:41','2026-06-16 05:29:14'),(41,'App\\Models\\User',3,'API Token','32992c49c0d8fb1232210ebfb4bd94993172c582ed9ea0117ed73c2b8feff2d1','[\"*\"]','2026-06-16 03:23:21',NULL,'2026-06-16 01:42:06','2026-06-16 03:23:21'),(42,'App\\Models\\User',3,'API Token','a6da27be534225943a30e446c181a22a9a8cb07def6e7b06ab8c7b0fa8eb8e62','[\"*\"]','2026-06-16 05:43:56',NULL,'2026-06-16 01:42:16','2026-06-16 05:43:56'),(43,'App\\Models\\User',3,'API Token','0a04a3223986cd7a466e4ac290fc58bd92299b916fabd2f142650f2ddf3d8e8f','[\"*\"]','2026-06-16 02:26:13',NULL,'2026-06-16 02:14:12','2026-06-16 02:26:13'),(44,'App\\Models\\User',2,'API Token','22651d1a35118b227f4dd9f436a1f7438ca845caba0a5d9d48bc0b7d64d63822','[\"*\"]','2026-06-16 02:26:15',NULL,'2026-06-16 02:25:53','2026-06-16 02:26:15'),(45,'App\\Models\\User',2,'API Token','b2e2bad17b9ea86d809451128d49e77e395143abd089de4fd0cc8bb3fc79075f','[\"*\"]','2026-06-16 02:33:17',NULL,'2026-06-16 02:25:55','2026-06-16 02:33:17'),(46,'App\\Models\\User',1,'API Token','bd2ef0837ba6725c32a91cad31758397d2d946eb6602c73e233d43eb5c711a9b','[\"*\"]','2026-06-16 18:09:18',NULL,'2026-06-16 02:50:44','2026-06-16 18:09:18'),(47,'App\\Models\\User',1,'API Token','35f3bd92402c2df7ae61ee62220b23d913f7834802420a8026c1b7fdde141c82','[\"*\"]','2026-06-16 03:09:26',NULL,'2026-06-16 03:06:04','2026-06-16 03:09:26'),(48,'App\\Models\\User',3,'API Token','dd6d51632ef2062964863dac77d6beded68465f83e7d060f016769d67542e650','[\"*\"]','2026-06-16 03:40:00',NULL,'2026-06-16 03:23:54','2026-06-16 03:40:00'),(49,'App\\Models\\User',2,'API Token','667ee640aa1cd566140306bbfce5268b96b4c2c0ec6cfdd4207ad014e84a2d6d','[\"*\"]','2026-06-16 03:27:47',NULL,'2026-06-16 03:27:07','2026-06-16 03:27:47'),(50,'App\\Models\\User',3,'API Token','e573d781d2ddd1c788642a0152adb78c879db9be5961a8059a2b4ddd95bf0580','[\"*\"]','2026-06-16 03:29:27',NULL,'2026-06-16 03:28:18','2026-06-16 03:29:27'),(51,'App\\Models\\User',2,'API Token','9724adf9a509173848557e056e2f7b34a25fa9ccbb572e4710ea5f4670b0fc24','[\"*\"]','2026-06-16 03:44:16',NULL,'2026-06-16 03:36:57','2026-06-16 03:44:16'),(52,'App\\Models\\User',3,'API Token','5faf12279e3f273057408164250a1aaddac06dd20289677eccbc0a76e11f0e36','[\"*\"]','2026-06-16 04:45:12',NULL,'2026-06-16 04:43:44','2026-06-16 04:45:12'),(53,'App\\Models\\User',2,'API Token','96f6632c234c8bdfcf7221a2cd5d53c3e97ea1a8a34bacd77e740770601f5d1f','[\"*\"]','2026-06-16 05:44:59',NULL,'2026-06-16 05:44:58','2026-06-16 05:44:59'),(54,'App\\Models\\User',2,'API Token','8be34265e4bf7bb499ccb541c478b96f853810c82136edeec30a82ce997967c8','[\"*\"]','2026-06-16 05:50:43',NULL,'2026-06-16 05:44:59','2026-06-16 05:50:43'),(55,'App\\Models\\User',2,'API Token','a87536246db74495f0ec759d846820bf9e611ca9a5a3cf4e1d9702546ca629b7','[\"*\"]','2026-06-16 07:32:32',NULL,'2026-06-16 06:40:16','2026-06-16 07:32:32'),(56,'App\\Models\\User',2,'API Token','a1bc9b854e65239498e6c2dfa0a1a77c4b0dc9bc1baaa07ea877ab1709cc8966','[\"*\"]','2026-06-16 08:06:59',NULL,'2026-06-16 07:33:03','2026-06-16 08:06:59'),(57,'App\\Models\\User',1,'API Token','6f6639ffe9b58bee61146117c2eda80894d8dc61e24d09508cccabb1698d5571','[\"*\"]','2026-06-16 09:10:59',NULL,'2026-06-16 07:37:54','2026-06-16 09:10:59'),(58,'App\\Models\\User',2,'API Token','c4e738a1c4f2710f70ebe3148eb59737e6c9f64bb8521cd307a50ab0fb54de36','[\"*\"]','2026-06-16 08:54:55',NULL,'2026-06-16 08:07:58','2026-06-16 08:54:55'),(59,'App\\Models\\User',3,'API Token','82be7b371af6fe7dba29efa59ff7fec866568f37d04a4e11dfdbb45d08a8848f','[\"*\"]','2026-06-16 10:38:38',NULL,'2026-06-16 08:08:40','2026-06-16 10:38:38'),(60,'App\\Models\\User',3,'API Token','68890dde780c38999f8edbe612d9418886463260b4c0c8ffb327cbc222b9b7f6','[\"*\"]','2026-06-16 09:15:56',NULL,'2026-06-16 08:57:08','2026-06-16 09:15:56'),(61,'App\\Models\\User',2,'API Token','2f4e17fee5b9754665509015174eb3aabbd46a89b08b212ce41e825eaaf12a9b','[\"*\"]','2026-06-16 09:13:55',NULL,'2026-06-16 09:13:53','2026-06-16 09:13:55'),(62,'App\\Models\\User',2,'API Token','2912a447fcdeb226205ff1e6441c59276cfda400df3d15eb2eb80270df8b22a5','[\"*\"]','2026-06-16 13:10:24',NULL,'2026-06-16 09:13:55','2026-06-16 13:10:24'),(63,'App\\Models\\User',2,'API Token','92c84315a96131af6b17014845b86bb1b31ee0c926d16b7b0516e87ff1e7a06d','[\"*\"]','2026-06-16 09:46:36',NULL,'2026-06-16 09:16:42','2026-06-16 09:46:36'),(64,'App\\Models\\User',3,'API Token','b09bfc84544493bbfe497ee5d864844f0f86133e4296ebde75cae80ac7ca84d4','[\"*\"]','2026-06-17 01:39:46',NULL,'2026-06-17 01:39:45','2026-06-17 01:39:46'),(65,'App\\Models\\User',3,'API Token','5ced9b2611f1db7b702f3f8f0b10e1f32fd0a25cfcf7bdafacb9d71f6120ab24','[\"*\"]','2026-06-17 01:45:28',NULL,'2026-06-17 01:43:07','2026-06-17 01:45:28'),(66,'App\\Models\\User',3,'API Token','06aa7561a4212390a885a53de8e081289cbea944f48becf4d27806041cc027c7','[\"*\"]','2026-06-17 03:17:33',NULL,'2026-06-17 02:34:39','2026-06-17 03:17:33'),(67,'App\\Models\\User',1,'API Token','e0d190722a1634d048a0e868266b482de7cbe374b34ea708b2187a7449fbf9c3','[\"*\"]','2026-06-17 03:52:54',NULL,'2026-06-17 03:42:02','2026-06-17 03:52:54'),(68,'App\\Models\\User',3,'API Token','8fd70732c27fc72166fc69120b8a73355e9eeb73eb77a24aa2c0bde468a01aa7','[\"*\"]','2026-06-17 03:55:59',NULL,'2026-06-17 03:48:20','2026-06-17 03:55:59'),(69,'App\\Models\\User',1,'API Token','df2475593c1d5e47de231eb3988de51ec066acdd7672d114ee0dfc631c3fede5','[\"*\"]','2026-06-18 04:49:49',NULL,'2026-06-17 03:54:14','2026-06-18 04:49:49'),(70,'App\\Models\\User',3,'API Token','71f9a9d06d2aaa7937ac73a839bf75add89f9e4bc70cd001958730250efa2c48','[\"*\"]','2026-06-18 03:39:27',NULL,'2026-06-17 04:17:15','2026-06-18 03:39:27'),(71,'App\\Models\\User',2,'API Token','3dda414ae0b8acc5533781696d10c3b77e4551c10ee0f8b59e62f48bc31351d0','[\"*\"]','2026-06-17 07:24:37',NULL,'2026-06-17 07:17:13','2026-06-17 07:24:37'),(72,'App\\Models\\User',3,'API Token','87647c9604703ee9dac7a9d54a54d1737810ebb4dc6adbee2eeda037d6225844','[\"*\"]','2026-06-17 08:27:09',NULL,'2026-06-17 07:23:18','2026-06-17 08:27:09'),(73,'App\\Models\\User',2,'API Token','bb3b92ea4945bd3dc311ec53aacae9c00eee2d37b09f0cb68e21ef817638d68c','[\"*\"]','2026-06-17 08:49:48',NULL,'2026-06-17 08:09:27','2026-06-17 08:49:48'),(74,'App\\Models\\User',2,'API Token','ba2b8a2c496e65c906135ade9dbbc36cb0c4e78a710a71872513be0e7b968dce','[\"*\"]','2026-06-17 08:58:29',NULL,'2026-06-17 08:56:36','2026-06-17 08:58:29'),(75,'App\\Models\\User',2,'API Token','f074089f5ca24ae3df0d44a8991ee3733c9bcce5dcbd2c3be05cb7dd33cf3153','[\"*\"]','2026-06-18 01:55:09',NULL,'2026-06-17 11:23:32','2026-06-18 01:55:09'),(76,'App\\Models\\User',1,'API Token','db45989d45550557c45c984a3b79c1291b8eaff23849e9ff42c762f0f2ef13bc','[\"*\"]','2026-06-17 16:27:48',NULL,'2026-06-17 16:27:22','2026-06-17 16:27:48'),(77,'App\\Models\\User',2,'API Token','a39a6ab7bdb31706fecbfed18df3a46005e53f3350d084c7aa29326d2a028716','[\"*\"]','2026-06-18 02:16:07',NULL,'2026-06-18 01:09:56','2026-06-18 02:16:07'),(78,'App\\Models\\User',2,'API Token','dac9c887789d07910aca31ae2b33b6b15e387cfeb5ab9d6fb7c73e8751ee43bb','[\"*\"]','2026-06-18 01:56:07',NULL,'2026-06-18 01:55:15','2026-06-18 01:56:07'),(79,'App\\Models\\User',2,'API Token','62853fcec41bbd506f5e1c5bb39a58e603ecca3d0cea30a764d5b3044a131b67','[\"*\"]','2026-06-18 02:23:03',NULL,'2026-06-18 02:16:40','2026-06-18 02:23:03'),(80,'App\\Models\\User',3,'API Token','b78a7d0e6e09f1b5298e7e5472efa2b954617b71513d7e22c0c42c674227d64e','[\"*\"]','2026-06-18 02:23:30',NULL,'2026-06-18 02:23:22','2026-06-18 02:23:30'),(81,'App\\Models\\User',2,'API Token','c5c1d0788c6af08e9acfb31dee7a911b2ef1ce69068ab09955e7c86f3ad30b90','[\"*\"]','2026-06-18 03:23:43',NULL,'2026-06-18 02:25:17','2026-06-18 03:23:43'),(82,'App\\Models\\User',3,'API Token','b24e223b4ca76f52760044567a6797ec7185d418e08223664e9fc185f22f3aa2','[\"*\"]','2026-06-18 03:02:54',NULL,'2026-06-18 02:37:55','2026-06-18 03:02:54'),(83,'App\\Models\\User',3,'API Token','0bf2387408e975c960f988279905afaa1debbe20e8c87abdae3de601bda626a6','[\"*\"]','2026-06-18 03:08:08',NULL,'2026-06-18 03:05:43','2026-06-18 03:08:08'),(84,'App\\Models\\User',2,'API Token','c992642a6f457ac6ddbd7d4e6276b094e068e0445e3d95bed6019d5202400738','[\"*\"]','2026-06-18 03:08:02',NULL,'2026-06-18 03:06:50','2026-06-18 03:08:02'),(85,'App\\Models\\User',3,'API Token','af7efd88a74d0b9ac90f3b74c780f8492992623c25a6dea3968c4f11bd24f331','[\"*\"]','2026-06-18 04:21:16',NULL,'2026-06-18 04:13:39','2026-06-18 04:21:16');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_role_id_permission_id_unique` (`role_id`,`permission_id`),
  KEY `role_permissions_permission_id_foreign` (`permission_id`),
  CONSTRAINT `role_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=395 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (87,2,38,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(88,2,39,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(89,2,40,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(90,2,41,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(91,2,42,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(92,2,43,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(93,2,44,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(94,2,45,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(95,2,46,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(96,2,47,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(97,2,48,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(98,2,49,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(99,2,50,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(100,2,51,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(101,2,52,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(102,2,53,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(103,2,54,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(104,2,55,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(105,2,56,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(106,2,57,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(107,2,58,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(108,2,59,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(109,2,60,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(110,2,61,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(111,2,62,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(112,2,63,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(113,2,64,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(114,2,65,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(115,2,66,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(116,2,67,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(117,2,68,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(118,2,69,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(119,2,70,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(120,2,71,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(121,2,72,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(122,2,73,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(123,2,74,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(124,2,75,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(125,2,76,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(126,2,77,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(127,2,78,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(128,2,79,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(129,2,80,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(130,2,81,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(131,2,82,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(132,2,83,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(133,2,84,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(134,2,85,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(135,2,86,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(136,2,87,'2026-06-10 07:59:35','2026-06-10 07:59:35'),(137,2,88,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(138,2,89,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(139,2,90,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(140,2,91,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(141,2,92,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(142,2,93,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(143,2,94,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(144,2,95,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(145,2,96,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(146,2,97,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(147,2,98,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(148,2,99,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(149,2,100,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(150,2,101,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(151,2,102,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(152,2,103,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(153,2,104,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(154,2,105,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(155,2,106,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(156,2,107,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(157,2,108,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(158,2,109,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(159,2,110,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(160,2,111,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(161,2,112,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(162,2,113,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(163,2,114,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(164,2,115,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(165,2,116,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(166,2,117,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(167,2,118,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(168,2,119,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(169,2,120,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(170,2,121,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(171,2,122,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(172,2,123,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(173,2,124,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(174,2,125,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(175,2,126,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(176,2,127,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(177,2,128,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(178,2,129,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(179,2,130,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(180,2,131,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(181,2,132,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(182,2,133,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(183,2,134,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(184,2,135,'2026-06-10 07:59:36','2026-06-10 07:59:36'),(185,2,136,'2026-06-10 07:59:37','2026-06-10 07:59:37'),(186,2,137,'2026-06-10 07:59:37','2026-06-10 07:59:37'),(187,7,38,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(188,7,39,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(189,7,40,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(190,7,41,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(191,7,42,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(192,7,43,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(193,7,44,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(194,7,45,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(195,7,46,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(196,7,47,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(197,7,48,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(198,7,49,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(199,7,50,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(200,7,51,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(201,7,52,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(202,7,53,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(203,7,54,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(204,7,55,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(205,7,56,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(206,7,57,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(207,7,58,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(208,7,59,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(209,7,60,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(210,7,61,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(211,7,62,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(212,7,63,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(213,7,64,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(214,7,65,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(215,7,66,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(216,7,67,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(217,7,68,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(218,7,69,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(219,7,70,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(220,7,71,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(221,7,72,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(222,7,73,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(223,7,74,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(224,7,75,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(225,7,76,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(226,7,77,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(227,7,78,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(228,7,79,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(229,7,80,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(230,7,81,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(231,7,82,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(232,7,83,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(233,7,84,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(234,7,85,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(235,7,86,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(236,7,87,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(237,7,88,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(238,7,89,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(239,7,90,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(240,7,91,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(241,7,92,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(242,7,93,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(243,7,94,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(244,7,95,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(245,7,96,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(246,7,97,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(247,7,98,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(248,7,99,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(249,7,100,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(250,7,101,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(251,7,102,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(252,7,103,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(253,7,104,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(254,7,105,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(255,7,106,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(256,7,107,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(257,7,108,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(258,7,109,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(259,7,110,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(260,7,111,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(261,7,112,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(262,7,113,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(263,7,114,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(264,7,115,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(265,7,116,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(266,7,117,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(267,7,118,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(268,7,119,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(269,7,120,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(270,7,121,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(271,7,122,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(272,7,123,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(273,7,124,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(274,7,125,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(275,7,126,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(276,7,127,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(277,7,128,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(278,7,129,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(279,7,130,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(280,7,131,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(281,7,132,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(282,7,133,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(283,7,134,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(284,7,135,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(285,7,136,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(286,7,137,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(287,8,38,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(288,8,39,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(289,8,40,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(290,8,41,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(291,8,42,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(292,8,43,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(293,8,44,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(294,8,45,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(295,8,46,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(296,8,47,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(297,8,48,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(298,8,49,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(299,8,50,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(300,8,51,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(301,8,52,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(302,8,53,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(303,8,54,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(304,8,55,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(305,8,56,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(306,8,57,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(307,8,58,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(308,8,59,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(309,8,60,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(310,8,61,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(311,8,62,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(312,8,63,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(313,8,64,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(314,8,65,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(315,8,66,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(316,8,67,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(317,8,68,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(318,8,69,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(319,8,70,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(320,8,71,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(321,8,72,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(322,8,73,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(323,8,74,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(324,8,75,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(325,8,76,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(326,8,77,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(327,8,78,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(328,8,79,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(329,8,80,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(330,8,81,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(331,8,82,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(332,8,83,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(333,8,84,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(334,8,85,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(335,8,86,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(336,8,87,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(337,8,88,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(338,8,89,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(339,8,90,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(340,8,91,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(341,8,92,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(342,8,93,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(343,8,94,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(344,8,95,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(345,8,96,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(346,8,97,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(347,8,98,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(348,8,99,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(349,8,100,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(350,8,101,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(351,8,102,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(352,8,103,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(353,8,104,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(354,8,105,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(355,8,106,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(356,8,107,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(357,8,108,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(358,8,109,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(359,8,110,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(360,8,111,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(361,8,112,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(362,8,113,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(363,8,114,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(364,8,115,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(365,8,116,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(366,8,117,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(367,8,118,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(368,8,119,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(369,8,120,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(370,8,121,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(371,8,122,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(372,8,123,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(373,8,124,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(374,8,125,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(375,8,126,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(376,8,127,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(377,8,128,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(378,8,129,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(379,8,130,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(380,8,131,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(381,8,132,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(382,8,133,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(383,8,134,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(384,8,135,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(385,8,136,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(386,8,137,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(387,11,76,'2026-06-10 10:38:56','2026-06-10 10:38:56'),(388,11,77,'2026-06-10 10:38:56','2026-06-10 10:38:56'),(389,11,80,'2026-06-10 10:38:56','2026-06-10 10:38:56'),(390,11,81,'2026-06-10 10:38:56','2026-06-10 10:38:56'),(391,11,82,'2026-06-10 10:38:56','2026-06-10 10:38:56'),(392,11,85,'2026-06-10 10:38:57','2026-06-10 10:38:57'),(393,11,108,'2026-06-10 10:38:57','2026-06-10 10:38:57'),(394,11,113,'2026-06-10 10:38:57','2026-06-10 10:38:57');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (2,'Super Admin','Full system access with all permissions',1,'2026-06-09 17:03:05','2026-06-09 17:03:05'),(7,'Admin / System Admin','Admin / System Admin',1,'2026-06-10 08:02:44','2026-06-10 08:02:44'),(8,'Branch Manager','Branch Manager',1,'2026-06-10 08:27:46','2026-06-10 08:27:46'),(9,'Loan Officer','Loan Officer',1,'2026-06-10 08:31:33','2026-06-10 08:31:33'),(10,'Credit Officer / Risk Officer','Credit Officer / Risk Officer',1,'2026-06-10 08:31:52','2026-06-10 08:31:52'),(11,'Collection Officer (Field Officer)','Collection Officer (Field Officer)',1,'2026-06-10 08:50:07','2026-06-10 08:50:07'),(12,'Collection Supervisor','Collection Supervisor',1,'2026-06-10 08:50:28','2026-06-10 08:50:28'),(13,'Recovery Officer','Recovery Officer',1,'2026-06-10 08:50:47','2026-06-10 08:50:47'),(14,'Accountant','Accountant',1,'2026-06-10 08:50:58','2026-06-10 08:50:58'),(15,'Finance Manager','Finance Manager',1,'2026-06-10 08:51:25','2026-06-10 08:51:25'),(16,'Cashier','Cashier',1,'2026-06-10 08:51:43','2026-06-10 08:51:43'),(17,'Customer Service Officer','Customer Service Officer',1,'2026-06-10 08:51:51','2026-06-10 08:51:51'),(18,'Data Entry Operator','Data Entry Operator',1,'2026-06-10 08:51:59','2026-06-10 08:51:59'),(19,'HR Manager','HR Manager',1,'2026-06-10 08:52:08','2026-06-10 08:52:08'),(20,'Admin Officer','Admin Officer',1,'2026-06-10 08:52:18','2026-06-10 08:52:18'),(21,'IT Administrator','IT Administrator',1,'2026-06-10 08:52:30','2026-06-10 08:52:30'),(22,'Auditor','Auditor',1,'2026-06-10 08:52:42','2026-06-10 08:52:42'),(23,'Marketing Executive','Marketing Executive',1,'2026-06-10 08:52:50','2026-06-10 08:52:50'),(24,'Business Analyst','Business Analyst',1,'2026-06-10 08:53:00','2026-06-10 08:53:00');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `savings_account_transactions`
--

DROP TABLE IF EXISTS `savings_account_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `savings_account_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `savings_account_id` bigint unsigned NOT NULL,
  `transaction_type` enum('deposit','withdrawal','interest_credit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `balance_before` decimal(15,2) NOT NULL DEFAULT '0.00',
  `balance_after` decimal(15,2) NOT NULL DEFAULT '0.00',
  `transaction_date` date DEFAULT NULL,
  `reference_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sat_account_date_idx` (`savings_account_id`,`transaction_date`),
  KEY `sat_type_date_idx` (`transaction_type`,`transaction_date`),
  CONSTRAINT `savings_account_transactions_savings_account_id_foreign` FOREIGN KEY (`savings_account_id`) REFERENCES `savings_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `savings_account_transactions`
--

LOCK TABLES `savings_account_transactions` WRITE;
/*!40000 ALTER TABLE `savings_account_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `savings_account_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `savings_accounts`
--

DROP TABLE IF EXISTS `savings_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `savings_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL DEFAULT '1',
  `branch_id` bigint unsigned DEFAULT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `account_number` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` enum('savings','current','fixed_deposit','investment') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'savings',
  `opening_deposit` decimal(15,2) NOT NULL DEFAULT '0.00',
  `balance` decimal(15,2) NOT NULL DEFAULT '0.00',
  `interest_rate` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `interest_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'simple_interest',
  `opened_at` date DEFAULT NULL,
  `status` enum('active','dormant','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `savings_accounts_account_number_unique` (`account_number`),
  KEY `savings_accounts_customer_id_status_index` (`customer_id`,`status`),
  KEY `savings_accounts_account_type_status_index` (`account_type`,`status`),
  CONSTRAINT `savings_accounts_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `savings_accounts`
--

LOCK TABLES `savings_accounts` WRITE;
/*!40000 ALTER TABLE `savings_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `savings_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('9PHQgxbO7oWgMs7KNAdtLqgl4JnktqRHHNVYrTcp',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','YTozOntzOjY6Il90b2tlbiI7czo0MDoiUXBWMHl1bmJtako3M3NsTW14ZXVjdWJBQlFQTmxzdnFnV1FwWE01NyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NTM6Imh0dHA6Ly9nbG9iYWxjYXBpdGFsLmNleWxvbmVycC5jb20vbWVkaWEvY29tcGFueS9sb2dvIjtzOjU6InJvdXRlIjtzOjIwOiJjb21wYW55LmxvZ28uY3VycmVudCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=',1781761167),('EByM4oaMQCL9hADKGfLjAw9VySZU3TbDiygWmvua',NULL,'127.0.0.1','Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36','YTozOntzOjY6Il90b2tlbiI7czo0MDoiWk5ZOG9MSHA3b1lSc1pnbzBhUTdqeG12RkVTRVVUcXpIdXhxZlJZaiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NTM6Imh0dHA6Ly9nbG9iYWxjYXBpdGFsLmNleWxvbmVycC5jb20vbWVkaWEvY29tcGFueS9sb2dvIjtzOjU6InJvdXRlIjtzOjIwOiJjb21wYW55LmxvZ28uY3VycmVudCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=',1781765372),('erqjNBpMfNwf5bsRGrd9AlpH0WbuNMqkq6mIKpIc',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','YTozOntzOjY6Il90b2tlbiI7czo0MDoia2JLdEVETlRsdjZaM0dkVWw4M2hRRTNPQXE3dUxoeGppT0VaUkJqMiI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NTM6Imh0dHA6Ly9nbG9iYWxjYXBpdGFsLmNleWxvbmVycC5jb20vbWVkaWEvY29tcGFueS9sb2dvIjtzOjU6InJvdXRlIjtzOjIwOiJjb21wYW55LmxvZ28uY3VycmVudCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=',1781760221),('Q9I0Q2p8PdkHAKdWdggkcSylsYWPQsUWWwNcwrZy',NULL,'127.0.0.1','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','YTozOntzOjY6Il90b2tlbiI7czo0MDoiTDNoUWpNdjEwSUJBYnduakNleG9ETWQwUXF3eGpRS0I2Z280Mm5hbCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NTM6Imh0dHA6Ly9nbG9iYWxjYXBpdGFsLmNleWxvbmVycC5jb20vbWVkaWEvY29tcGFueS9sb2dvIjtzOjU6InJvdXRlIjtzOjIwOiJjb21wYW55LmxvZ28uY3VycmVudCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=',1781763170),('srysK6dyUHRk03Dp31cVeogOMd82yuekfFbGxqgQ',NULL,'127.0.0.1','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36','YTozOntzOjY6Il90b2tlbiI7czo0MDoiNm9KN0xGY3BkUUZYV09xWkZzd0diTmVqY3NGdkVlT21hRmJOVUNyTCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NTM6Imh0dHA6Ly9nbG9iYWxjYXBpdGFsLmNleWxvbmVycC5jb20vbWVkaWEvY29tcGFueS9sb2dvIjtzOjU6InJvdXRlIjtzOjIwOiJjb21wYW55LmxvZ28uY3VycmVudCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=',1781759135),('t9wCz9OpWNJtvC2OgCCc1cYpnmxyjYAfl0oCgpfz',NULL,'127.0.0.1','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','YTozOntzOjY6Il90b2tlbiI7czo0MDoiNk1xSndFcU14NFAyM2J2NkFnbXo2VmU5czY3RVlxMzM1OWhYNzN5eCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NTM6Imh0dHA6Ly9nbG9iYWxjYXBpdGFsLmNleWxvbmVycC5jb20vbWVkaWEvY29tcGFueS9sb2dvIjtzOjU6InJvdXRlIjtzOjIwOiJjb21wYW55LmxvZ28uY3VycmVudCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=',1781763171),('u2nL2mHXDsLMlM3x2KwCaFHbcUDhspTxZMFgPSSE',NULL,'127.0.0.1','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36','YTozOntzOjY6Il90b2tlbiI7czo0MDoiQmJlVzFYbERteXJieHpNR3dydXFXUTc0TzE0SjdrdFliaGFGTGhrTCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NTM6Imh0dHA6Ly9nbG9iYWxjYXBpdGFsLmNleWxvbmVycC5jb20vbWVkaWEvY29tcGFueS9sb2dvIjtzOjU6InJvdXRlIjtzOjIwOiJjb21wYW55LmxvZ28uY3VycmVudCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=',1781763220),('yRxUl9pGkOZX29dS9TOG6BS54yQICq25YPEXnCPk',NULL,'127.0.0.1','Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36','YTozOntzOjY6Il90b2tlbiI7czo0MDoib3VSR2huem5oc0hNRlJ0Q1NtdHI1RzNpWHY5NTR5alhER2lVRXBYUCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6NTM6Imh0dHA6Ly9nbG9iYWxjYXBpdGFsLmNleWxvbmVycC5jb20vbWVkaWEvY29tcGFueS9sb2dvIjtzOjU6InJvdXRlIjtzOjIwOiJjb21wYW55LmxvZ28uY3VycmVudCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=',1781759283);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_settings_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,'system_online','1','2026-06-09 16:32:13','2026-06-09 16:32:13');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `test`
--

DROP TABLE IF EXISTS `test`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `test`
--

LOCK TABLES `test` WRITE;
/*!40000 ALTER TABLE `test` DISABLE KEYS */;
/*!40000 ALTER TABLE `test` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `assigned_at` timestamp NOT NULL,
  `assigned_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_roles_user_id_role_id_unique` (`user_id`,`role_id`),
  KEY `user_roles_role_id_foreign` (`role_id`),
  KEY `user_roles_assigned_by_foreign` (`assigned_by`),
  CONSTRAINT `user_roles_assigned_by_foreign` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1,2,'2026-06-09 17:03:06',1,NULL,NULL),(2,3,11,'2026-06-10 10:36:30',3,NULL,NULL),(3,2,7,'2026-06-10 13:48:11',2,NULL,NULL);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id` bigint unsigned DEFAULT NULL,
  `branch_id` bigint unsigned DEFAULT NULL,
  `designation_id` bigint unsigned DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_employee_id_foreign` (`employee_id`),
  KEY `users_branch_id_foreign` (`branch_id`),
  KEY `users_designation_id_foreign` (`designation_id`),
  CONSTRAINT `users_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `users_designation_id_foreign` FOREIGN KEY (`designation_id`) REFERENCES `designations` (`id`),
  CONSTRAINT `users_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Super Admin','superadmin@softcodelk.com',NULL,'$2y$12$rs4EPvAVs6u8HjmZk1SUX.4qnDIF4e5Wo6KnSYK0f1bg.3skQINgG',NULL,NULL,NULL,NULL,'2026-06-09 17:03:06','2026-06-09 17:03:06'),(2,'Dinusha Adhikari','dinushaprabath00@gmail.com',NULL,'$2y$12$cblSUSviiK3qxWQEQjSXf.ITj5ogD8NzZCb9av.BWdZla25NvSwbW',1,1,1,NULL,'2026-06-10 08:45:14','2026-06-10 08:45:14'),(3,'Pasindu Madushan','pasindumadhushan@gmail.com',NULL,'$2y$12$h7fXeQybiqpSFe.RhqPvSu08ghPRNwoau63SnCCL8VaDvNx0ISZHS',2,1,5,NULL,'2026-06-10 10:33:26','2026-06-10 10:33:26'),(4,'Dinusha Adikari','manager.adikari@gmaial.com',NULL,'$2y$12$DGtFo4AKlwkTzg/DIjMbpOIg8wwBvxw9AZ0n0KbcRFBvBB6MGFy2u',3,1,2,NULL,'2026-06-13 15:36:00','2026-06-13 15:36:00');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'globalcapitaldb'
--

--
-- Dumping routines for database 'globalcapitaldb'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-18  8:49:49
