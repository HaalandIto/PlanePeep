CREATE TABLE users (
                       user_id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_favorites (
                                favorite_id INT AUTO_INCREMENT PRIMARY KEY,
                                user_id INT NOT NULL,
                                external_item_id VARCHAR(100) NOT NULL,
                                display_name VARCHAR(255),
                                sort_order INT NOT NULL DEFAULT 0,
                                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Links to the users table
                                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

    -- Prevents a user from favoriting the same item twice
                                UNIQUE KEY unique_user_favorite (user_id, external_item_id)
);

CREATE TABLE aircraft_metadata (
                                   icao24 CHAR(6) NOT NULL PRIMARY KEY, -- OpenSky uses 6-character hex strings
                                   last_updated VARCHAR(32),
                                   acars VARCHAR(32),
                                   adsb VARCHAR(32),
                                   built VARCHAR(32),
                                   category_description VARCHAR(255),
                                   country VARCHAR(128),
                                   engines VARCHAR(32),
                                   first_flight_date VARCHAR(32),
                                   first_seen VARCHAR(32),
                                   icao_aircraft_class VARCHAR(64),
                                   line_number VARCHAR(64),
                                   manufacturer_icao VARCHAR(64),
                                   manufacturer_name VARCHAR(255),
                                   model VARCHAR(255),
                                   modes VARCHAR(64),
                                   next_reg VARCHAR(64),
                                   notes TEXT,
                                   operator VARCHAR(255),
                                   operator_callsign VARCHAR(128),
                                   operator_iata VARCHAR(32),
                                   operator_icao VARCHAR(32),
                                   owner VARCHAR(255),
                                   prev_reg VARCHAR(64),
                                   reg_until VARCHAR(32),
                                   registered VARCHAR(32),
                                   registration VARCHAR(20),
                                   sel_cal VARCHAR(32),
                                   serial_number VARCHAR(128),
                                   status VARCHAR(128),
                                   aircraft_type VARCHAR(32),
                                   vdl VARCHAR(32),

                                   INDEX idx_registration (registration),
                                   INDEX idx_country (country),
                                   INDEX idx_typecode (aircraft_type)
);