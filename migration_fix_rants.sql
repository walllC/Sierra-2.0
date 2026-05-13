-- Migration: Add missing columns to rants table
-- Run this in phpMyAdmin or MySQL CLI if the rants table already exists

-- Check if rants table exists and add anonymous column if missing
ALTER TABLE rants ADD COLUMN anonymous BOOLEAN DEFAULT FALSE AFTER content;
