-- Migration: add system specification columns to assets table
-- Run once on uiicdb_v2

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS machine_type     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS model            VARCHAR(120),
  ADD COLUMN IF NOT EXISTS ram              VARCHAR(20),
  ADD COLUMN IF NOT EXISTS hdd              VARCHAR(20),
  ADD COLUMN IF NOT EXISTS monitor_serial   VARCHAR(80),
  ADD COLUMN IF NOT EXISTS monitor_make     VARCHAR(80),
  ADD COLUMN IF NOT EXISTS system_ip        VARCHAR(45),
  ADD COLUMN IF NOT EXISTS port             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ms_office_ver    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS os               VARCHAR(60),
  ADD COLUMN IF NOT EXISTS host_id          VARCHAR(60),
  ADD COLUMN IF NOT EXISTS floor            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS branch           VARCHAR(60);
