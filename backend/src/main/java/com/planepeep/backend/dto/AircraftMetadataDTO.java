package com.planepeep.backend.dto;

/**
 * DTO for detailed aircraft information for /api/aircraft/metadata/{icao24}.
 *
 * Live position fields match AircraftPositionDTO and are combined with
 * local database metadata fields.
 *
 * 1. Live state vector fields from /states/all (OpenSky StateVector)
 *
 * 2. Static aircraft metadata from the local DB: registration, model, typecode, owner
 *
 * References:
 *   https://openskynetwork.github.io/opensky-api/rest.html#response
 *   https://opensky-network.org/apidoc/
 */
public record AircraftMetadataDTO(
    /** ICAO 24-bit hex address of the transponder. */
    String icao24,
    /** Callsign broadcast by the aircraft (8 chars). Null if not available. */
    String callsign,

    /** Country inferred from the ICAO 24 address. */
    String originCountry,

    /** Unix timestamp of the last position update. Null if unavailable. */
    Long lastUpdated,

    //TODO is ui falling back to stored position?
    /** Long in decimal degrees. Null if not available. UI should fallback to stored position. */
    Double longitude,

    /** Lat in decimal degrees. Null if not available. UI should fallback to stored position. */
    Double latitude,

    /**
     * Barometric altitude in meters. Null if not available.
     */
    Double altitude,

    /** Velocity over ground in m/s. Null if not available. */
    Double velocity,

    /** True track / heading in decimal degrees clockwise from north. Null if not available. */
    Double heading,

    /** Vertical rate in m/s. Positive = climbing, negative = descending. Null if not available. */
    Double verticalRate,

    /** DB FIELD: Aircraft registration number ("N123AB"). */
    String registration,

    /** DB FIELD: Aircraft model / series ("737-800"). */
    String model,

    /** DB FIELD: ICAO aircraft type designator ("B738"). */
    String typecode,

    /** DB FIELD: Registered owner of the aircraft. */
    String owner,

    /** Logical field indicating whether the registration is obscured via BARR or LADD */
    Boolean isObscured
) {}
