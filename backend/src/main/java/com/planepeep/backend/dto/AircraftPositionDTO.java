package com.planepeep.backend.dto;

/**
 * DTO for an aircraft's live state for the /api/aircraft/positions endpoint.
 *
 * <p>Field names mirror the OpenSky StateVector API:
 * -  https://openskynetwork.github.io/opensky-api/rest.html#response
 * -  https://openskynetwork.github.io/opensky-api/javadoc/org/opensky/model/StateVector.html
 *
 * <p>Commented fields are available in the OpenSky API but not provided in the DTO.
 */
public record AircraftPositionDTO(
    /**
     * ICAO 24-bit hex address of the transponder.
     */
    String icao24,

    /**
     * Callsign of the vehicle (8 chars, space-padded). Null if not available.
     */
    String callsign,

    /**
     * Country name inferred from the ICAO 24-bit address.
     */
    String originCountry,

    /**
     * Unix timestamp (seconds) of the last position update, null if no position.
     */
    Long lastUpdated,

    /**
     * Unix timestamp (seconds) for the last update in general.
     */
    // long lastContact,

    /**
     * WGS-84 longitude in decimal degrees. Null if not available.
     */
    Double longitude,

    /**
     * WGS-84 latitude in decimal degrees. Null if not available.
     */
    Double latitude,

    /**
     * MSL (meters). Null if none/grounded.
     */
    Double altitude,

    /**
     * True if the aircraft is on the ground (surface position was received).
     */
    // boolean onGround,

    /**
     * Velocity over ground in m/s. Null if not available.
     */
    Double velocity,

    /**
     * True track / heading in decimal degrees clockwise from north (0–360).
     * Null if not available.
     */
    Double heading,

    /** Vertical rate in m/s. Positive = climbing, negative = descending. Null if not available. */
    Double verticalRate

    /**
     * Geometric GPS altitude (meters). Null if not available.
     */
    // Double geoAltitude,

    /**
     * //TODO Transponder code (squawk). Null if not available.
     */
    // String squawk,

    /**
     * Origin of the state's position:
     *   0 = ADS-B, 1 = ASTERIX, 2 = MLAT, 3 = FLARM.
     */
    // int positionSource
) {}
