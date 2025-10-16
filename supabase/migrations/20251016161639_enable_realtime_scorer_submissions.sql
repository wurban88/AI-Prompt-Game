/*
  # Enable Realtime for Scorer Submissions

  1. Configuration
    - Enable REPLICA IDENTITY FULL on scorer_submissions table
    - Add scorer_submissions table to realtime publication

  2. Notes
    - Required for real-time updates to work properly
    - Without this, UI requires page refresh to see new scores
*/

ALTER TABLE scorer_submissions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE scorer_submissions;