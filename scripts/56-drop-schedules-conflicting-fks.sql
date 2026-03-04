-- Drop both FK constraints on default_content_id in the schedules table.
-- Having fk_default_playlist (-> playlists) AND fk_default_media (-> media) on the
-- same column means ANY value must exist in BOTH tables simultaneously — impossible.
-- The existing CHECK constraints already enforce type/id consistency, so FKs are not needed.
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS fk_default_playlist;
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS fk_default_media;
