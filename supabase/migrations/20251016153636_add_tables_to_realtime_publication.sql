/*
  # Add Tables to Realtime Publication

  ## Overview
  Adds all game tables to the supabase_realtime publication so that
  postgres_changes listeners can receive real-time updates.

  ## Changes
  - Add games table to realtime publication
  - Add teams table to realtime publication
  - Add submissions table to realtime publication
  - Add scores table to realtime publication

  ## Critical
  Without this, real-time subscriptions will NOT work. Tables must be
  explicitly added to the publication for clients to receive updates.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
