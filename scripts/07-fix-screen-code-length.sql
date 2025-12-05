-- Increase screen_code column length to accommodate generated codes
ALTER TABLE screens ALTER COLUMN screen_code TYPE VARCHAR(20);
