-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 19, 2026 at 07:07 PM
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
  `district_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patient`
--

INSERT INTO `patient` (`patient_id`, `name`, `email`, `phone`, `date_of_birth`, `income_bracket`, `preferred_language`, `created_at`, `latitude`, `longitude`, `street`, `city`, `zip_code`, `district_id`) VALUES
(1, 'Tamzid Nawfel', 'tamzid.nawfel08@gmail.com', '01646743373', '2004-08-08', NULL, NULL, '2026-08-17 15:15:21', NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'Sanjid Hasnat', 'sanjid.hasnat@gmaill.com', '1235834560', '2004-12-22', NULL, NULL, '2026-08-17 15:16:39', NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'Ashraful', 'ashraful@gmail.com', '01717324849', '2005-05-04', NULL, NULL, '2026-08-17 16:10:15', NULL, NULL, NULL, NULL, NULL, NULL),
(4, 'sandjid hasnat', 'nasdomac@gmail.com', '01646743374', '2003-12-04', NULL, NULL, '2026-08-18 08:33:45', NULL, NULL, NULL, NULL, NULL, NULL);

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
(5, 'Dr. Sarah Smith', 1500.00, 20, 4.80, 23.81030000, 90.41250000, 1, 1),
(6, 'Dr. Michael Rahman', 1200.00, 15, 4.50, 23.78060000, 90.40700000, 1, 2),
(7, 'Dr. Emily Johnson', 2000.00, 10, 4.90, 23.75090000, 90.39370000, 0, 3),
(8, 'Dr. Ahmed Khan', 1000.00, 25, 4.20, 23.79250000, 90.40780000, 1, 1);

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
) ;

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
-- Indexes for table `region`
--
ALTER TABLE `region`
  ADD PRIMARY KEY (`district_id`);

--
-- Indexes for table `specialization`
--
ALTER TABLE `specialization`
  ADD PRIMARY KEY (`spec_id`),
  ADD UNIQUE KEY `uq_spec_name` (`spec_name`);

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
-- AUTO_INCREMENT for table `patient`
--
ALTER TABLE `patient`
  MODIFY `patient_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `provider`
--
ALTER TABLE `provider`
  MODIFY `provider_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `specialization`
--
ALTER TABLE `specialization`
  MODIFY `spec_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `waitlist`
--
ALTER TABLE `waitlist`
  MODIFY `waitlist_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

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
-- Constraints for table `waitlist`
--
ALTER TABLE `waitlist`
  ADD CONSTRAINT `fk_waitlist_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_waitlist_specialization` FOREIGN KEY (`spec_id`) REFERENCES `specialization` (`spec_id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
