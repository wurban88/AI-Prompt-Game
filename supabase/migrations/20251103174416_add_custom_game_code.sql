/*
  # Add Custom Game Code

  1. Changes
    - Add `custom_code` column to games table (optional text field, unique)
    - Allows facilitators to create memorable, custom game URLs
    - Falls back to UUID-based URLs if no custom code provided

  2. Notes
    - Custom codes must be unique across all games
    - Supports URLs like ?game=my-event-2024 instead of ?game=uuid
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'custom_code'
  ) THEN
    ALTER TABLE games ADD COLUMN custom_code text UNIQUE;
  END IF;
END $$;