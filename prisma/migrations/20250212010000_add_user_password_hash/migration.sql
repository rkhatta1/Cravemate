-- Add optional password hash for credentials auth
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
