# EchoWall
A social media web application where users can post rants, react, comment, and interact with others anonymously or publicly.



## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: PHP
- Database: MySQL (via XAMPP)
- Libraries: TCPDF (PDF export), Chart.js (analytics charts)
- Version Control: Git / GitHub

---

## Requirements
- [XAMPP](https://www.apachefriends.org/) (PHP 8.0+ & MySQL)
- A modern web browser (Chrome, Firefox, Edge)

---

## Installation & Setup

### 1. Clone the repository
git clone <repository-url>

### 2. Move to XAMPP's htdocs
Place the project folder inside XAMPP's `htdocs` folder.

### 3. Import the database
- Open phpMyAdmin at http://localhost/phpmyadmin
- Create a new database named `echowall`
- Click Import and upload `echowall.sql`
- Create another database named `echowall_olap`
- Import `echowall_olap.sql`

### 4. Configure the database
Open `database.php` and make sure the credentials match:
$conn = new mysqli('localhost', 'root', '', 'echowall');

### 5. Start XAMPP
- Start Apache and MySQL in the XAMPP Control Panel

### 6. Open the app
Go to: http://localhost/EchoWall/

---

## Default Accounts

|   Username   |    Password    | Role  |
|--------------|----------------|-------|
| Sierra_Admin | Sierra_pass123 | Admin |
| 		User       |(your password) | User  |

---

## Features
-  Post rants (public or anonymous)
-  React to rants with emojis
-  Comment and reply on rants
-  Repost rants
-  Follow / unfollow users
-  Direct messaging
-  Notifications
-  Search users and rants
-  Admin panel with analytics (OLAP)
-  Export PDF reports
-  Report system

---

## Security
- Passwords hashed using password_hash() / password_verify()
- SQL injection prevention via prepared statements
- Session-based authentication
- Admin routes protected

---

## Admin Panel
Access at http://localhost/EchoWall/admin.php
- Login as *Sierra_Admin*
- View analytics, manage users, rants, comments, and reports
- Sync OLAP data via the *Sync OLAP Data* button
- Export analytics as PDF via the *Export PDF Report* button

## Project Structure 

```text
EchoWall/
├── api/                        # PHP API endpoints
├── assets/
│   ├── css/                    # Stylesheets
│   └── js/                     # JavaScript files
├── database/                   # Database SQL files
├── tcpdf/                      # PDF generation library
├── tests/                      # Test files
├── uploads/                    # User uploaded images
│
├── admin.php                   # Admin panel
├── database.php                # Database connection
├── delete_comment.php          # Delete comment handler
├── edit_rant.php               # Edit rant handler
├── etl.php                     # OLAP sync handler
├── export_pdf.php              # PDF export handler
├── get_chart_data.php          # OLAP chart data
├── get_comments.php            # Get comments handler
├── get_stats.php               # Stats handler
├── index.php                   # Main app entry
├── login.php                   # Login page
├── login_process.php           # Login handler
├── profile.php                 # Profile page
├── report_rant.php             # Report rant handler
├── save_comment.php            # Save comment handler
├── save_comment_reaction.php   # Comment reaction handler
├── save_notification.php       # Notification handler
├── save_rant.php               # Save rant handler
├── signup.php                  # Registration page
├── storage_api.php             # Storage API handler
├── terms.php                   # Terms page
├── upload_image.php            # Image upload handler
└── README.md                   # This file  

---

## Developers
- Built as a school project - Team Sierra 2.0

---

## 📄 License
For educational purposes only.
www.apachefriends.org
