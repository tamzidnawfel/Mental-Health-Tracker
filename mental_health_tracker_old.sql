-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 21, 2026 at 11:33 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mental_health_tracker`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `appointment_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `referral_id` int(11) DEFAULT NULL,
  `appointment_date` date NOT NULL,
  `status` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clinics`
--

CREATE TABLE `clinics` (
  `provider_id` int(11) NOT NULL,
  `registration_no` varchar(100) NOT NULL,
  `total_beds` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clinics`
--

INSERT INTO `clinics` (`provider_id`, `registration_no`, `total_beds`) VALUES
(31, 'CL-REG-031', 40),
(32, 'CL-REG-032', 35),
(33, 'CL-REG-033', 30),
(34, 'CL-REG-034', 50),
(35, 'CL-REG-035', 25),
(36, 'CL-REG-036', 32),
(37, 'CL-REG-037', 45),
(38, 'CL-REG-038', 28),
(39, 'CL-REG-039', 36),
(40, 'CL-REG-040', 42),
(41, 'CL-REG-041', 22),
(42, 'CL-REG-042', 55),
(43, 'CL-REG-043', 30),
(44, 'CL-REG-044', 38),
(45, 'CL-REG-045', 48),
(46, 'CL-REG-046', 27),
(47, 'CL-REG-047', 34),
(48, 'CL-REG-048', 31),
(49, 'CL-REG-049', 60),
(50, 'CL-REG-050', 33);

--
-- Triggers `clinics`
--
DELIMITER $$
CREATE TRIGGER `clinic_disjoint` BEFORE INSERT ON `clinics` FOR EACH ROW BEGIN
    IF EXISTS (SELECT 1 FROM therapists WHERE provider_id = NEW.provider_id)
       OR EXISTS (SELECT 1 FROM hotlines WHERE provider_id = NEW.provider_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Provider already belongs to another subclass';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `hotlines`
--

CREATE TABLE `hotlines` (
  `provider_id` int(11) NOT NULL,
  `max_capacity` int(11) DEFAULT NULL,
  `active_connections` int(11) DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `hotlines`
--

INSERT INTO `hotlines` (`provider_id`, `max_capacity`, `active_connections`, `status`) VALUES
(51, 50, 12, 'Active'),
(52, 40, 8, 'Active'),
(53, 35, 0, 'Inactive'),
(54, 60, 25, 'Active'),
(55, 45, 17, 'Active'),
(56, 30, 0, 'Inactive'),
(57, 55, 31, 'Active'),
(58, 38, 9, 'Active'),
(59, 65, 42, 'Active'),
(60, 70, 28, 'Active');

--
-- Triggers `hotlines`
--
DELIMITER $$
CREATE TRIGGER `hotline_disjoint` BEFORE INSERT ON `hotlines` FOR EACH ROW BEGIN
    IF EXISTS (SELECT 1 FROM therapists WHERE provider_id = NEW.provider_id)
       OR EXISTS (SELECT 1 FROM clinics WHERE provider_id = NEW.provider_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Provider already belongs to another subclass';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `languages`
--

CREATE TABLE `languages` (
  `language_code` varchar(10) NOT NULL,
  `language_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `languages`
--

INSERT INTO `languages` (`language_code`, `language_name`) VALUES
('001', 'English'),
('002', 'Bengali');

-- --------------------------------------------------------

--
-- Table structure for table `patient`
--

CREATE TABLE `patient` (
  `patient_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `date_of_birth` date NOT NULL,
  `income_bracket` varchar(100) DEFAULT NULL,
  `preferred_language` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `street` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `age` int(11) GENERATED ALWAYS AS (timestampdiff(YEAR,`date_of_birth`,curdate())) VIRTUAL,
  `district_id` int(11) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patient`
--

INSERT INTO `patient` (`patient_id`, `name`, `email`, `phone`, `date_of_birth`, `income_bracket`, `preferred_language`, `created_at`, `latitude`, `longitude`, `street`, `city`, `zip_code`, `district_id`, `password`) VALUES
(1, 'Tamzid Nawfel', 'tamzid.nawfel08@gmail.com', '01646743373', '2004-08-08', NULL, NULL, '2026-08-17 15:15:21', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'Sanjid Hasnat', 'sanjid.hasnat@gmaill.com', '1235834560', '2004-12-22', NULL, NULL, '2026-08-17 15:16:39', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'Ashraful', 'ashraful@gmail.com', '01717324849', '2005-05-04', NULL, NULL, '2026-08-17 16:10:15', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 'sandjid hasnat', 'nasdomac@gmail.com', '01646743374', '2003-12-04', NULL, NULL, '2026-08-18 08:33:45', NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `provider`
--

CREATE TABLE `provider` (
  `provider_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `session_fee` decimal(10,2) DEFAULT NULL,
  `max_capacity` int(11) DEFAULT NULL,
  `rating_avg` decimal(3,2) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `accepts_insurance` tinyint(1) DEFAULT NULL,
  `district_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `provider`
--

INSERT INTO `provider` (`provider_id`, `name`, `session_fee`, `max_capacity`, `rating_avg`, `latitude`, `longitude`, `accepts_insurance`, `district_id`) VALUES
(1, 'Dr. Sarah Smith', 1500.00, 20, 4.80, 23.81030000, 90.41250000, 1, 1),
(2, 'Dr. Michael Rahman', 1200.00, 15, 4.50, 23.78060000, 90.40700000, 1, 2),
(3, 'Dr. Emily Johnson', 2000.00, 10, 4.90, 23.75090000, 90.39370000, 0, 3),
(4, 'Dr. Ahmed Khan', 1000.00, 25, 4.20, 23.79250000, 90.40780000, 1, 4),
(5, 'Dr. Nadia Islam', 1400.00, 18, 4.70, 23.81520000, 90.42130000, 1, 5),
(6, 'Dr. James Wilson', 1800.00, 12, 4.60, 23.77040000, 90.40560000, 0, 6),
(7, 'Dr. Farhana Akter', 1100.00, 20, 4.40, 23.74580000, 90.39820000, 1, 7),
(8, 'Dr. Daniel Brown', 1600.00, 15, 4.75, 23.80410000, 90.41570000, 1, 1),
(9, 'Dr. Rafiq Hasan', 1300.00, 22, 4.30, 23.78560000, 90.40190000, 1, 2),
(10, 'Dr. Jessica Miller', 2200.00, 10, 4.95, 23.75820000, 90.38950000, 0, 3),
(11, 'Dr. Tanvir Hossain', 1250.00, 18, 4.55, 23.81270000, 90.40980000, 1, 4),
(12, 'Dr. Olivia Davis', 1700.00, 14, 4.65, 23.77430000, 90.41420000, 1, 5),
(13, 'Dr. Nusrat Jahan', 1450.00, 20, 4.85, 23.73890000, 90.39610000, 1, 6),
(14, 'Dr. Robert Taylor', 1900.00, 12, 4.70, 23.79950000, 90.42360000, 0, 7),
(15, 'Dr. Samira Chowdhury', 1150.00, 24, 4.35, 23.78320000, 90.40940000, 1, 2),
(16, 'Dr. William Anderson', 1550.00, 16, 4.60, 23.75240000, 90.40270000, 1, 3),
(17, 'Dr. Mahmud Karim', 1350.00, 20, 4.45, 23.80680000, 90.41850000, 1, 1),
(18, 'Dr. Sophia Martinez', 2100.00, 10, 4.88, 23.77810000, 90.39970000, 0, 2),
(19, 'Dr. Ayesha Sultana', 1250.00, 18, 4.72, 23.74670000, 90.39180000, 1, 3),
(20, 'Dr. Christopher Lee', 1750.00, 14, 4.58, 23.81730000, 90.40650000, 1, 1),
(21, 'Dr. Shakil Ahmed', 1050.00, 25, 4.25, 23.78940000, 90.41310000, 1, 2),
(22, 'Dr. Rachel Thompson', 2000.00, 11, 4.91, 23.76150000, 90.39760000, 0, 3),
(23, 'Dr. Imran Hossain', 1400.00, 19, 4.52, 23.80170000, 90.41090000, 1, 1),
(24, 'Dr. Maria Garcia', 1650.00, 15, 4.67, 23.77280000, 90.40430000, 1, 2),
(25, 'Dr. Tahmina Begum', 1200.00, 21, 4.78, 23.75460000, 90.39070000, 1, 6),
(26, 'Dr. Andrew Clark', 1850.00, 13, 4.62, 23.80850000, 90.42510000, 0, 7),
(27, 'Dr. Sadia Rahman', 1300.00, 20, 4.48, 23.78190000, 90.41680000, 1, 2),
(28, 'Dr. Benjamin Moore', 1950.00, 12, 4.82, 23.74350000, 90.40150000, 1, 3),
(29, 'Dr. Rezaul Karim', 1100.00, 23, 4.38, 23.79620000, 90.41160000, 1, 1),
(30, 'Dr. Hannah Williams', 1750.00, 14, 4.73, 23.76970000, 90.40890000, 0, 4),
(31, 'Harmony Mental Health Clinic', 2500.00, 40, 4.60, 23.81240000, 90.41780000, 1, 1),
(32, 'Hope Wellness Center', 2200.00, 35, 4.50, 23.78510000, 90.40920000, 1, 2),
(33, 'Serenity Care Clinic', 2800.00, 30, 4.80, 23.75430000, 90.39560000, 0, 3),
(34, 'Dhaka Mind Care Hospital', 3000.00, 50, 4.70, 23.79870000, 90.42150000, 1, 4),
(35, 'Wellness First Clinic', 2000.00, 25, 4.30, 23.77650000, 90.40280000, 1, 5),
(36, 'Peaceful Minds Center', 2400.00, 32, 4.55, 23.74260000, 90.39910000, 1, 6),
(37, 'Bright Future Clinic', 2600.00, 45, 4.65, 23.80730000, 90.41460000, 0, 7),
(38, 'CarePoint Mental Health', 2300.00, 28, 4.40, 23.76920000, 90.41170000, 1, 2),
(39, 'New Horizon Clinic', 2700.00, 36, 4.75, 23.75980000, 90.38790000, 1, 1),
(40, 'LifeBalance Wellness Clinic', 2900.00, 42, 4.85, 23.81950000, 90.40830000, 1, 6),
(41, 'MindCare Community Clinic', 1900.00, 22, 4.20, 23.79170000, 90.41940000, 1, 2),
(42, 'Tranquil Minds Hospital', 3200.00, 55, 4.90, 23.74890000, 90.39450000, 0, 7),
(43, 'Healthy Mind Center', 2100.00, 30, 4.45, 23.80360000, 90.42670000, 1, 1),
(44, 'Inner Peace Clinic', 2500.00, 38, 4.60, 23.77340000, 90.39860000, 1, 2),
(45, 'Wellbeing Medical Center', 3100.00, 48, 4.75, 23.75710000, 90.40480000, 1, 3),
(46, 'Renew Mental Wellness Clinic', 2250.00, 27, 4.35, 23.81480000, 90.41210000, 0, 1),
(47, 'Mind & Life Care Center', 2600.00, 34, 4.55, 23.78260000, 90.42390000, 1, 2),
(48, 'Hope Springs Clinic', 2350.00, 31, 4.65, 23.74970000, 90.40870000, 1, 6),
(49, 'Calm Horizons Hospital', 3300.00, 60, 4.88, 23.80120000, 90.41620000, 1, 1),
(50, 'Complete Care Mental Health', 2450.00, 33, 4.50, 23.77880000, 90.40550000, 1, 2),
(51, 'National Mental Health Helpline', 0.00, 50, 4.70, 23.81090000, 90.41530000, 0, 1),
(52, 'HopeLine Bangladesh', 0.00, 40, 4.60, 23.78240000, 90.40810000, 0, 2),
(53, 'Mind Support Hotline', 0.00, 35, 4.50, 23.75180000, 90.39740000, 0, 3),
(54, 'Crisis Care Helpline', 0.00, 60, 4.80, 23.79820000, 90.42070000, 0, 4),
(55, 'SafeTalk Mental Health Line', 0.00, 45, 4.55, 23.77460000, 90.40350000, 0, 5),
(56, 'Wellness Support Hotline', 0.00, 30, 4.40, 23.74490000, 90.39280000, 0, 6),
(57, 'CareConnect Helpline', 0.00, 55, 4.65, 23.80650000, 90.41790000, 0, 7),
(58, 'Mental Wellness Support Line', 0.00, 38, 4.35, 23.78730000, 90.41060000, 0, 2),
(59, 'Community Crisis Hotline', 0.00, 65, 4.75, 23.75870000, 90.40120000, 0, 6),
(60, '24 Hour Mental Health Support', 0.00, 70, 4.85, 23.81570000, 90.42430000, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `provider_languages`
--

CREATE TABLE `provider_languages` (
  `provider_id` int(11) NOT NULL,
  `language_code` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `provider_specializations`
--

CREATE TABLE `provider_specializations` (
  `provider_id` int(11) NOT NULL,
  `spec_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `referrals`
--

CREATE TABLE `referrals` (
  `referral_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `source_provider_id` int(11) NOT NULL,
  `target_provider_id` int(11) NOT NULL,
  `referral_date` date NOT NULL,
  `status` varchar(50) NOT NULL,
  `notes` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `region`
--

CREATE TABLE `region` (
  `district_id` int(11) NOT NULL,
  `district_name` varchar(255) NOT NULL,
  `population` int(11) DEFAULT NULL,
  `risk_index` decimal(5,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `region`
--

INSERT INTO `region` (`district_id`, `district_name`, `population`, `risk_index`) VALUES
(1, 'Dhaka Central', 15000000, 8.50),
(2, 'Chittagong Metropolitan', 5000000, 7.20),
(3, 'Sylhet Sadar', 2500000, 6.00),
(4, 'Rajshahi', 3000000, 5.50),
(5, 'Khulna', 2800000, 6.20),
(6, 'Barisal', 2000000, 7.00),
(7, 'Rangpur', 2200000, 6.80);

-- --------------------------------------------------------

--
-- Table structure for table `resource_access_logs`
--

CREATE TABLE `resource_access_logs` (
  `log_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `resource_type` varchar(100) NOT NULL,
  `access_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `specialization`
--

CREATE TABLE `specialization` (
  `spec_id` int(11) NOT NULL,
  `spec_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `specialization`
--

INSERT INTO `specialization` (`spec_id`, `spec_name`) VALUES
(1, 'Anxiety & Mood Disorders'),
(4, 'Child & Adolescent Counseling'),
(5, 'Crisis Intervention & Suicide Prevention'),
(7, 'General Psychotherapy'),
(3, 'Major Depressive Disorder'),
(2, 'PTSD & Trauma Recovery'),
(6, 'Substance Abuse & Rehabilitation');

-- --------------------------------------------------------

--
-- Table structure for table `system_alerts`
--

CREATE TABLE `system_alerts` (
  `alert_id` int(11) NOT NULL,
  `district_id` int(11) NOT NULL,
  `alert_type` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `therapists`
--

CREATE TABLE `therapists` (
  `provider_id` int(11) NOT NULL,
  `license_no` varchar(100) NOT NULL,
  `years_of_experience` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `therapists`
--

INSERT INTO `therapists` (`provider_id`, `license_no`, `years_of_experience`) VALUES
(1, 'TH-LIC-001', 12),
(2, 'TH-LIC-002', 8),
(3, 'TH-LIC-003', 15),
(4, 'TH-LIC-004', 6),
(5, 'TH-LIC-005', 10),
(6, 'TH-LIC-006', 9),
(7, 'TH-LIC-007', 7),
(8, 'TH-LIC-008', 11),
(9, 'TH-LIC-009', 5),
(10, 'TH-LIC-010', 14),
(11, 'TH-LIC-011', 8),
(12, 'TH-LIC-012', 10),
(13, 'TH-LIC-013', 13),
(14, 'TH-LIC-014', 16),
(15, 'TH-LIC-015', 6),
(16, 'TH-LIC-016', 9),
(17, 'TH-LIC-017', 11),
(18, 'TH-LIC-018', 17),
(19, 'TH-LIC-019', 12),
(20, 'TH-LIC-020', 7),
(21, 'TH-LIC-021', 5),
(22, 'TH-LIC-022', 14),
(23, 'TH-LIC-023', 10),
(24, 'TH-LIC-024', 8),
(25, 'TH-LIC-025', 13),
(26, 'TH-LIC-026', 15),
(27, 'TH-LIC-027', 6),
(28, 'TH-LIC-028', 11),
(29, 'TH-LIC-029', 9),
(30, 'TH-LIC-030', 16);

--
-- Triggers `therapists`
--
DELIMITER $$
CREATE TRIGGER `therapist_disjoint` BEFORE INSERT ON `therapists` FOR EACH ROW BEGIN
    IF EXISTS (SELECT 1 FROM clinics WHERE provider_id = NEW.provider_id)
       OR EXISTS (SELECT 1 FROM hotlines WHERE provider_id = NEW.provider_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Provider already belongs to another subclass';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `waitlist`
--

CREATE TABLE `waitlist` (
  `waitlist_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `spec_id` int(11) NOT NULL,
  `request_date` date NOT NULL DEFAULT curdate(),
  `crisis_score` int(11) NOT NULL,
  `priority_level` enum('ROUTINE','MODERATE','HIGH','CRITICAL') NOT NULL DEFAULT 'ROUTINE',
  `status` enum('Active','Assigned','Cancelled') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `waitlist`
--

INSERT INTO `waitlist` (`waitlist_id`, `patient_id`, `spec_id`, `request_date`, `crisis_score`, `priority_level`, `status`) VALUES
(1, 1, 1, '2026-08-17', 7, 'HIGH', 'Active'),
(2, 3, 3, '2026-08-17', 8, 'HIGH', 'Active');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`appointment_id`),
  ADD KEY `fk_appointments_patient` (`patient_id`),
  ADD KEY `fk_appointments_provider` (`provider_id`),
  ADD KEY `fk_appointments_referral` (`referral_id`);

--
-- Indexes for table `clinics`
--
ALTER TABLE `clinics`
  ADD PRIMARY KEY (`provider_id`);

--
-- Indexes for table `hotlines`
--
ALTER TABLE `hotlines`
  ADD PRIMARY KEY (`provider_id`);

--
-- Indexes for table `languages`
--
ALTER TABLE `languages`
  ADD PRIMARY KEY (`language_code`);

--
-- Indexes for table `patient`
--
ALTER TABLE `patient`
  ADD PRIMARY KEY (`patient_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `district_id` (`district_id`);

--
-- Indexes for table `provider`
--
ALTER TABLE `provider`
  ADD PRIMARY KEY (`provider_id`),
  ADD KEY `district_id` (`district_id`);

--
-- Indexes for table `provider_languages`
--
ALTER TABLE `provider_languages`
  ADD PRIMARY KEY (`provider_id`,`language_code`),
  ADD KEY `fk_provider_languages_language` (`language_code`);

--
-- Indexes for table `provider_specializations`
--
ALTER TABLE `provider_specializations`
  ADD PRIMARY KEY (`provider_id`,`spec_id`),
  ADD KEY `fk_provider_specializations_spec` (`spec_id`);

--
-- Indexes for table `referrals`
--
ALTER TABLE `referrals`
  ADD PRIMARY KEY (`referral_id`),
  ADD KEY `fk_referrals_patient` (`patient_id`),
  ADD KEY `fk_referrals_source_provider` (`source_provider_id`),
  ADD KEY `fk_referrals_target_provider` (`target_provider_id`);

--
-- Indexes for table `region`
--
ALTER TABLE `region`
  ADD PRIMARY KEY (`district_id`);

--
-- Indexes for table `resource_access_logs`
--
ALTER TABLE `resource_access_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `fk_resource_access_logs_patient` (`patient_id`);

--
-- Indexes for table `specialization`
--
ALTER TABLE `specialization`
  ADD PRIMARY KEY (`spec_id`),
  ADD UNIQUE KEY `uq_spec_name` (`spec_name`);

--
-- Indexes for table `system_alerts`
--
ALTER TABLE `system_alerts`
  ADD PRIMARY KEY (`alert_id`),
  ADD KEY `fk_system_alerts_region` (`district_id`);

--
-- Indexes for table `therapists`
--
ALTER TABLE `therapists`
  ADD PRIMARY KEY (`provider_id`);

--
-- Indexes for table `waitlist`
--
ALTER TABLE `waitlist`
  ADD PRIMARY KEY (`waitlist_id`),
  ADD KEY `fk_waitlist_patient` (`patient_id`),
  ADD KEY `fk_waitlist_specialization` (`spec_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `appointment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patient`
--
ALTER TABLE `patient`
  MODIFY `patient_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `provider`
--
ALTER TABLE `provider`
  MODIFY `provider_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `referrals`
--
ALTER TABLE `referrals`
  MODIFY `referral_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `resource_access_logs`
--
ALTER TABLE `resource_access_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `specialization`
--
ALTER TABLE `specialization`
  MODIFY `spec_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `system_alerts`
--
ALTER TABLE `system_alerts`
  MODIFY `alert_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `waitlist`
--
ALTER TABLE `waitlist`
  MODIFY `waitlist_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `fk_appointments_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_provider` FOREIGN KEY (`provider_id`) REFERENCES `provider` (`provider_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_appointments_referral` FOREIGN KEY (`referral_id`) REFERENCES `referrals` (`referral_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `clinics`
--
ALTER TABLE `clinics`
  ADD CONSTRAINT `fk_clinics_provider` FOREIGN KEY (`provider_id`) REFERENCES `provider` (`provider_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `hotlines`
--
ALTER TABLE `hotlines`
  ADD CONSTRAINT `fk_hotlines_provider` FOREIGN KEY (`provider_id`) REFERENCES `provider` (`provider_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `patient`
--
ALTER TABLE `patient`
  ADD CONSTRAINT `patient_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `region` (`district_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `provider`
--
ALTER TABLE `provider`
  ADD CONSTRAINT `provider_ibfk_1` FOREIGN KEY (`district_id`) REFERENCES `region` (`district_id`);

--
-- Constraints for table `provider_languages`
--
ALTER TABLE `provider_languages`
  ADD CONSTRAINT `fk_provider_languages_language` FOREIGN KEY (`language_code`) REFERENCES `languages` (`language_code`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_provider_languages_provider` FOREIGN KEY (`provider_id`) REFERENCES `provider` (`provider_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `provider_specializations`
--
ALTER TABLE `provider_specializations`
  ADD CONSTRAINT `fk_provider_specializations_provider` FOREIGN KEY (`provider_id`) REFERENCES `provider` (`provider_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_provider_specializations_spec` FOREIGN KEY (`spec_id`) REFERENCES `specialization` (`spec_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `referrals`
--
ALTER TABLE `referrals`
  ADD CONSTRAINT `fk_referrals_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_referrals_source_provider` FOREIGN KEY (`source_provider_id`) REFERENCES `provider` (`provider_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_referrals_target_provider` FOREIGN KEY (`target_provider_id`) REFERENCES `provider` (`provider_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `resource_access_logs`
--
ALTER TABLE `resource_access_logs`
  ADD CONSTRAINT `fk_resource_access_logs_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `system_alerts`
--
ALTER TABLE `system_alerts`
  ADD CONSTRAINT `fk_system_alerts_region` FOREIGN KEY (`district_id`) REFERENCES `region` (`district_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `therapists`
--
ALTER TABLE `therapists`
  ADD CONSTRAINT `fk_therapists_provider` FOREIGN KEY (`provider_id`) REFERENCES `provider` (`provider_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `waitlist`
--
ALTER TABLE `waitlist`
  ADD CONSTRAINT `fk_waitlist_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_waitlist_specialization` FOREIGN KEY (`spec_id`) REFERENCES `specialization` (`spec_id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;