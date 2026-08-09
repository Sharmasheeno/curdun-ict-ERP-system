-- database.sql
-- Create database
CREATE DATABASE IF NOT EXISTS curdun_erp;
USE curdun_erp;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'staff', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy Module: Medicines
CREATE TABLE IF NOT EXISTS pharmacy_medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    quantity INT DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hospital Module: Patients
CREATE TABLE IF NOT EXISTS hospital_patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender ENUM('Male', 'Female', 'Other'),
    dob DATE,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- University Module: Students
CREATE TABLE IF NOT EXISTS university_students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    faculty VARCHAR(100),
    enrollment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hotel Module: Rooms
CREATE TABLE IF NOT EXISTS hotel_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(20) UNIQUE NOT NULL,
    type ENUM('Single', 'Double', 'Suite') DEFAULT 'Single',
    price_per_night DECIMAL(10, 2) NOT NULL,
    status ENUM('Available', 'Occupied', 'Maintenance') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- POS Module: Products
CREATE TABLE IF NOT EXISTS pos_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    stock INT DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Finance Module: Transactions
CREATE TABLE IF NOT EXISTS finance_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_type ENUM('Income', 'Expense') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert dummy admin user (password is 'admin123' hashed)
INSERT INTO users (name, email, password, role) VALUES 
('System Admin', 'admin@curdun.so', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
