-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 09, 2026 at 02:59 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `echowall_olap`
--

-- --------------------------------------------------------

--
-- Table structure for table `dim_rant_type`
--

CREATE TABLE `dim_rant_type` (
  `rant_type_key` int(11) NOT NULL,
  `is_anonymous` tinyint(1) NOT NULL,
  `is_archived` tinyint(1) NOT NULL,
  `type_label` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dim_rant_type`
--

INSERT INTO `dim_rant_type` (`rant_type_key`, `is_anonymous`, `is_archived`, `type_label`) VALUES
(1, 0, 0, 'Named - Active'),
(2, 1, 0, 'Anonymous - Active'),
(3, 0, 1, 'Named - Archived'),
(4, 1, 1, 'Anonymous - Archived');

-- --------------------------------------------------------

--
-- Table structure for table `dim_time`
--

CREATE TABLE `dim_time` (
  `time_key` int(11) NOT NULL,
  `full_date` date NOT NULL,
  `hour` tinyint(4) NOT NULL DEFAULT 0,
  `day_of_week` varchar(10) NOT NULL,
  `day_of_month` tinyint(4) NOT NULL,
  `week_of_year` tinyint(4) NOT NULL,
  `month_num` tinyint(4) NOT NULL,
  `month_name` varchar(10) NOT NULL,
  `quarter` tinyint(4) NOT NULL,
  `year` smallint(6) NOT NULL,
  `is_weekend` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dim_time`
--

INSERT INTO `dim_time` (`time_key`, `full_date`, `hour`, `day_of_week`, `day_of_month`, `week_of_year`, `month_num`, `month_name`, `quarter`, `year`, `is_weekend`) VALUES
(1, '2026-06-01', 11, 'Monday', 1, 23, 6, 'June', 2, 2026, 0),
(2, '2026-06-01', 19, 'Monday', 1, 23, 6, 'June', 2, 2026, 0),
(3, '2026-06-01', 20, 'Monday', 1, 23, 6, 'June', 2, 2026, 0),
(4, '2026-06-02', 21, 'Tuesday', 2, 23, 6, 'June', 2, 2026, 0),
(5, '2026-06-06', 21, 'Saturday', 6, 23, 6, 'June', 2, 2026, 1),
(26, '2026-06-08', 19, 'Monday', 8, 24, 6, 'June', 2, 2026, 0),
(27, '2026-06-09', 8, 'Tuesday', 9, 24, 6, 'June', 2, 2026, 0);

-- --------------------------------------------------------

--
-- Table structure for table `dim_user`
--

CREATE TABLE `dim_user` (
  `user_key` int(11) NOT NULL,
  `source_user_id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'user',
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dim_user`
--

INSERT INTO `dim_user` (`user_key`, `source_user_id`, `username`, `role`, `status`, `created_at`) VALUES
(1, 5, 'Sierra_Admin', 'admin', 'active', '2026-05-29 10:16:46'),
(2, 6, 'test_user', 'user', 'active', '2026-06-01 19:19:10'),
(3, 7, 'ashley', 'user', 'active', '2026-06-01 19:23:02'),
(4, 8, 'carline', 'user', 'active', '2026-06-01 20:31:50'),
(21, 9, 'test_pass', 'user', 'active', '2026-06-08 12:59:25'),
(22, 10, 'another', 'user', 'active', '2026-06-08 18:56:50');

-- --------------------------------------------------------

--
-- Table structure for table `fact_rants`
--

CREATE TABLE `fact_rants` (
  `fact_id` int(11) NOT NULL,
  `source_rant_id` int(11) NOT NULL,
  `time_key` int(11) NOT NULL,
  `user_key` int(11) NOT NULL,
  `rant_type_key` int(11) NOT NULL,
  `reaction_count` int(11) NOT NULL DEFAULT 0,
  `comment_count` int(11) NOT NULL DEFAULT 0,
  `is_repost` tinyint(1) NOT NULL DEFAULT 0,
  `loaded_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fact_rants`
--

INSERT INTO `fact_rants` (`fact_id`, `source_rant_id`, `time_key`, `user_key`, `rant_type_key`, `reaction_count`, `comment_count`, `is_repost`, `loaded_at`) VALUES
(1, 36, 1, 2, 1, 0, 0, 0, '2026-06-06 21:37:43'),
(2, 37, 1, 2, 2, 0, 0, 0, '2026-06-06 21:37:43'),
(3, 38, 1, 1, 1, 0, 0, 0, '2026-06-06 21:37:43'),
(4, 39, 1, 2, 2, 0, 0, 0, '2026-06-06 21:37:43'),
(5, 40, 1, 3, 1, 1, 0, 0, '2026-06-06 21:37:43'),
(6, 41, 2, 2, 1, 1, 0, 0, '2026-06-06 21:37:43'),
(7, 42, 2, 2, 2, 0, 0, 0, '2026-06-06 21:37:43'),
(8, 43, 3, 3, 1, 1, 0, 0, '2026-06-06 21:37:43'),
(9, 44, 3, 3, 2, 0, 0, 0, '2026-06-06 21:37:43'),
(10, 45, 3, 2, 1, 2, 1, 0, '2026-06-06 21:37:43'),
(11, 46, 3, 4, 1, 0, 0, 0, '2026-06-06 21:37:43'),
(12, 47, 3, 4, 1, 0, 0, 1, '2026-06-06 21:37:43'),
(13, 48, 4, 2, 1, 0, 0, 0, '2026-06-06 21:37:43'),
(14, 49, 4, 2, 1, 0, 0, 0, '2026-06-06 21:37:43'),
(15, 50, 4, 4, 1, 1, 0, 0, '2026-06-06 21:37:43'),
(16, 51, 5, 4, 2, 0, 0, 0, '2026-06-06 21:37:43'),
(17, 52, 5, 4, 2, 0, 0, 0, '2026-06-06 21:37:43'),
(18, 53, 5, 4, 2, 1, 0, 0, '2026-06-06 21:37:43'),
(19, 54, 5, 4, 2, 1, 0, 0, '2026-06-06 21:37:43'),
(91, 55, 26, 22, 1, 1, 0, 0, '2026-06-09 08:44:46'),
(92, 56, 27, 4, 1, 0, 0, 0, '2026-06-09 08:44:46'),
(93, 57, 27, 4, 1, 0, 0, 1, '2026-06-09 08:44:46');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `dim_rant_type`
--
ALTER TABLE `dim_rant_type`
  ADD PRIMARY KEY (`rant_type_key`),
  ADD UNIQUE KEY `uq_type` (`is_anonymous`,`is_archived`);

--
-- Indexes for table `dim_time`
--
ALTER TABLE `dim_time`
  ADD PRIMARY KEY (`time_key`),
  ADD UNIQUE KEY `uq_time` (`full_date`,`hour`);

--
-- Indexes for table `dim_user`
--
ALTER TABLE `dim_user`
  ADD PRIMARY KEY (`user_key`),
  ADD UNIQUE KEY `uq_user` (`source_user_id`);

--
-- Indexes for table `fact_rants`
--
ALTER TABLE `fact_rants`
  ADD PRIMARY KEY (`fact_id`),
  ADD UNIQUE KEY `uq_rant` (`source_rant_id`),
  ADD KEY `time_key` (`time_key`),
  ADD KEY `user_key` (`user_key`),
  ADD KEY `rant_type_key` (`rant_type_key`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `dim_rant_type`
--
ALTER TABLE `dim_rant_type`
  MODIFY `rant_type_key` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `dim_time`
--
ALTER TABLE `dim_time`
  MODIFY `time_key` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `dim_user`
--
ALTER TABLE `dim_user`
  MODIFY `user_key` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `fact_rants`
--
ALTER TABLE `fact_rants`
  MODIFY `fact_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=94;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `fact_rants`
--
ALTER TABLE `fact_rants`
  ADD CONSTRAINT `fact_rants_ibfk_1` FOREIGN KEY (`time_key`) REFERENCES `dim_time` (`time_key`),
  ADD CONSTRAINT `fact_rants_ibfk_2` FOREIGN KEY (`user_key`) REFERENCES `dim_user` (`user_key`),
  ADD CONSTRAINT `fact_rants_ibfk_3` FOREIGN KEY (`rant_type_key`) REFERENCES `dim_rant_type` (`rant_type_key`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
