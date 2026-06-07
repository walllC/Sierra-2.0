-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 07, 2026 at 11:22 AM
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
-- Database: `echowall`
--

-- --------------------------------------------------------

--
-- Table structure for table `blocks`
--

CREATE TABLE `blocks` (
  `block_ID` int(11) NOT NULL,
  `blocker` varchar(50) NOT NULL,
  `blocked` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `comments`
--

CREATE TABLE `comments` (
  `comment_ID` int(11) NOT NULL,
  `rant_ID` int(11) NOT NULL,
  `user_ID` int(11) NOT NULL,
  `comment_text` text NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `comments`
--

INSERT INTO `comments` (`comment_ID`, `rant_ID`, `user_ID`, `comment_text`, `parent_id`, `created_at`) VALUES
(19, 45, 8, 'HAHAHAHH', NULL, '2026-06-01 12:32:16');

-- --------------------------------------------------------

--
-- Table structure for table `comment_reactions`
--

CREATE TABLE `comment_reactions` (
  `id` int(11) NOT NULL,
  `comment_ID` int(11) NOT NULL,
  `user_ID` int(11) NOT NULL,
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `follows`
--

CREATE TABLE `follows` (
  `follow_ID` int(11) NOT NULL,
  `follower` varchar(50) NOT NULL,
  `following` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `follows`
--

INSERT INTO `follows` (`follow_ID`, `follower`, `following`, `created_at`) VALUES
(3, 'edrian', 'perrin', '2026-05-23 17:19:08'),
(4, 'perrin', 'edrian', '2026-05-24 10:12:03'),
(5, 'tite', 'ashley', '2026-06-07 09:12:21');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `message_ID` int(11) NOT NULL,
  `from_user` varchar(50) NOT NULL,
  `to_user` varchar(50) NOT NULL,
  `msg_text` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notif_ID` int(11) NOT NULL,
  `from_user_ID` int(11) NOT NULL,
  `to_user_ID` int(11) NOT NULL,
  `type` varchar(20) NOT NULL,
  `message` text NOT NULL,
  `rant_ID` int(11) DEFAULT NULL,
  `comment_ID` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `read_status` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notif_ID`, `from_user_ID`, `to_user_ID`, `type`, `message`, `rant_ID`, `comment_ID`, `created_at`, `read_status`) VALUES
(19, 8, 6, 'reaction', 'reacted 😂 to your rant.', 45, NULL, '2026-06-01 12:32:11', 1),
(20, 8, 6, 'comment', 'commented on your rant.', 45, NULL, '2026-06-01 12:32:16', 1),
(21, 8, 6, 'reaction', 'reacted ❤️ to your rant.', 41, NULL, '2026-06-01 12:32:22', 1),
(22, 8, 7, 'reaction', 'reacted ❤️ to your rant.', 43, NULL, '2026-06-01 12:32:25', 1),
(23, 8, 7, 'repost', 'reposted your rant.', 43, NULL, '2026-06-01 12:32:28', 1),
(24, 7, 6, 'reaction', 'reacted ❤️ to your rant.', 45, NULL, '2026-06-01 12:52:56', 1),
(25, 6, 8, 'reaction', 'reacted 😂 to your rant.', 50, NULL, '2026-06-04 09:06:30', 0),
(26, 6, 7, 'follow', 'started following you.', NULL, NULL, '2026-06-07 09:12:21', 0),
(27, 6, 7, 'reaction', 'reacted 😡 to your rant.', 40, NULL, '2026-06-07 09:14:46', 0);

-- --------------------------------------------------------

--
-- Table structure for table `rants`
--

CREATE TABLE `rants` (
  `rant_ID` int(11) NOT NULL,
  `user_ID` int(11) NOT NULL,
  `content` varchar(300) NOT NULL,
  `anonymous` tinyint(1) DEFAULT 0,
  `is_anonymous` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `repost_of_id` int(11) DEFAULT NULL,
  `repost_of_user` varchar(50) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `is_archived` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rants`
--

INSERT INTO `rants` (`rant_ID`, `user_ID`, `content`, `anonymous`, `is_anonymous`, `created_at`, `repost_of_id`, `repost_of_user`, `updated_at`, `is_archived`) VALUES
(36, 6, 'FIRST EVER POST', 0, 0, '2026-06-01 03:19:24', NULL, NULL, NULL, 0),
(37, 6, '2ND POST', 1, 0, '2026-06-01 03:19:36', NULL, NULL, NULL, 0),
(38, 5, 'tado', 0, 0, '2026-06-01 03:20:59', NULL, NULL, NULL, 0),
(39, 6, 'ANON ITO', 1, 0, '2026-06-01 03:21:56', NULL, NULL, NULL, 0),
(40, 7, 'post ni ash', 0, 0, '2026-06-01 03:27:48', NULL, NULL, NULL, 0),
(41, 6, 'POST CHECK', 0, 0, '2026-06-01 11:47:10', NULL, NULL, NULL, 0),
(42, 6, 'POST CHECK', 1, 0, '2026-06-01 11:47:16', NULL, NULL, NULL, 0),
(43, 7, 'Post Check', 0, 0, '2026-06-01 12:23:45', NULL, NULL, NULL, 0),
(44, 7, 'Test uli after admin', 1, 0, '2026-06-01 12:23:56', NULL, NULL, NULL, 0),
(45, 6, 'TITE ONLINE CHECK', 0, 0, '2026-06-01 12:24:12', NULL, NULL, NULL, 0),
(46, 8, 'CARLINE FIRST POST', 0, 0, '2026-06-01 12:32:04', NULL, NULL, NULL, 0),
(47, 8, 'Post Check', 0, 0, '2026-06-01 12:32:27', 43, 'ashley', NULL, 0),
(48, 6, 'post', 0, 0, '2026-06-02 13:38:50', NULL, NULL, NULL, 0),
(49, 6, 'tite\r\nka ba', 0, 0, '2026-06-02 13:38:58', NULL, NULL, NULL, 0),
(50, 8, 'ttttt', 0, 0, '2026-06-02 13:55:09', NULL, NULL, NULL, 0),
(51, 8, 'test anon', 1, 0, '2026-06-06 13:19:38', NULL, NULL, NULL, 0),
(52, 8, 'test anon 1', 1, 0, '2026-06-06 13:19:46', NULL, NULL, NULL, 0),
(53, 8, 'test anon 2', 1, 0, '2026-06-06 13:19:51', NULL, NULL, NULL, 0),
(54, 8, 'test anon 3', 1, 0, '2026-06-06 13:19:57', NULL, NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `reactions`
--

CREATE TABLE `reactions` (
  `reaction_ID` int(11) NOT NULL,
  `rant_ID` int(11) NOT NULL,
  `user_ID` int(11) NOT NULL,
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reactions`
--

INSERT INTO `reactions` (`reaction_ID`, `rant_ID`, `user_ID`, `type`) VALUES
(182, 40, 6, '😡'),
(178, 41, 8, '❤️'),
(179, 43, 8, '❤️'),
(180, 45, 7, '❤️'),
(177, 45, 8, '😂'),
(181, 50, 6, '😂');

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `rant_id` int(11) NOT NULL,
  `reporter_id` int(11) NOT NULL,
  `reason` varchar(100) NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_ID` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `status` enum('active','banned','deactivated') DEFAULT 'active',
  `avatar` longtext DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_active_at` datetime DEFAULT NULL,
  `theme` varchar(10) NOT NULL DEFAULT 'dark',
  `cover` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_ID`, `username`, `password`, `role`, `status`, `avatar`, `bio`, `created_at`, `last_active_at`, `theme`, `cover`) VALUES
(5, 'Sierra_Admin', '123456', 'admin', 'active', NULL, NULL, '2026-05-29 02:16:46', '2026-06-06 22:18:08', 'dark', NULL),
(6, 'tite', '111111', 'user', 'active', 'uploads/avatar_6_1780557923.jpg', '', '2026-06-01 11:19:10', '2026-06-07 17:15:13', 'dark', 'uploads/cover_6_1780557929.jpg'),
(7, 'ashley', '111111', 'user', 'active', NULL, NULL, '2026-06-01 11:23:02', '2026-06-01 20:53:00', 'dark', NULL),
(8, 'carline', '111111', 'user', 'active', NULL, NULL, '2026-06-01 12:31:50', '2026-06-06 21:19:57', 'dark', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `blocks`
--
ALTER TABLE `blocks`
  ADD PRIMARY KEY (`block_ID`),
  ADD UNIQUE KEY `uq_block` (`blocker`,`blocked`),
  ADD KEY `idx_blocker` (`blocker`);

--
-- Indexes for table `comments`
--
ALTER TABLE `comments`
  ADD PRIMARY KEY (`comment_ID`),
  ADD KEY `rant_ID` (`rant_ID`),
  ADD KEY `user_ID` (`user_ID`);

--
-- Indexes for table `comment_reactions`
--
ALTER TABLE `comment_reactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_reaction` (`comment_ID`,`user_ID`);

--
-- Indexes for table `follows`
--
ALTER TABLE `follows`
  ADD PRIMARY KEY (`follow_ID`),
  ADD UNIQUE KEY `uq_follow` (`follower`,`following`),
  ADD KEY `idx_follower` (`follower`),
  ADD KEY `idx_following` (`following`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`message_ID`),
  ADD KEY `idx_from` (`from_user`),
  ADD KEY `idx_to` (`to_user`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notif_ID`),
  ADD KEY `to_user_ID` (`to_user_ID`),
  ADD KEY `from_user_ID` (`from_user_ID`),
  ADD KEY `rant_ID` (`rant_ID`),
  ADD KEY `comment_ID` (`comment_ID`);

--
-- Indexes for table `rants`
--
ALTER TABLE `rants`
  ADD PRIMARY KEY (`rant_ID`),
  ADD KEY `user_ID` (`user_ID`);

--
-- Indexes for table `reactions`
--
ALTER TABLE `reactions`
  ADD PRIMARY KEY (`reaction_ID`),
  ADD UNIQUE KEY `unique_reaction` (`rant_ID`,`user_ID`,`type`),
  ADD KEY `user_ID` (`user_ID`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_report` (`rant_id`,`reporter_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_ID`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `blocks`
--
ALTER TABLE `blocks`
  MODIFY `block_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `comments`
--
ALTER TABLE `comments`
  MODIFY `comment_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `comment_reactions`
--
ALTER TABLE `comment_reactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `follows`
--
ALTER TABLE `follows`
  MODIFY `follow_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `message_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notif_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `rants`
--
ALTER TABLE `rants`
  MODIFY `rant_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT for table `reactions`
--
ALTER TABLE `reactions`
  MODIFY `reaction_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=183;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `comments`
--
ALTER TABLE `comments`
  ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`rant_ID`) REFERENCES `rants` (`rant_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`user_ID`) REFERENCES `users` (`user_ID`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`from_user_ID`) REFERENCES `users` (`user_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`to_user_ID`) REFERENCES `users` (`user_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_3` FOREIGN KEY (`rant_ID`) REFERENCES `rants` (`rant_ID`) ON DELETE SET NULL,
  ADD CONSTRAINT `notifications_ibfk_4` FOREIGN KEY (`comment_ID`) REFERENCES `comments` (`comment_ID`) ON DELETE SET NULL;

--
-- Constraints for table `rants`
--
ALTER TABLE `rants`
  ADD CONSTRAINT `rants_ibfk_1` FOREIGN KEY (`user_ID`) REFERENCES `users` (`user_ID`) ON DELETE CASCADE;

--
-- Constraints for table `reactions`
--
ALTER TABLE `reactions`
  ADD CONSTRAINT `reactions_ibfk_1` FOREIGN KEY (`rant_ID`) REFERENCES `rants` (`rant_ID`) ON DELETE CASCADE,
  ADD CONSTRAINT `reactions_ibfk_2` FOREIGN KEY (`user_ID`) REFERENCES `users` (`user_ID`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
