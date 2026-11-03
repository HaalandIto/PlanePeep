package com.planepeep.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Static metadata about an aircraft from the local db.
 *
 * Includes fields not available from OpenSky ENDPOINTS, but that are from a static OpenSky dataset.
 */
@Entity
@Table(name = "aircraft_metadata")
@NoArgsConstructor
@SuppressWarnings("unused") //NOTE: we have columns for all fields, not all are used in the DTO
public class AircraftMetadata {

    @Id
    @Column(length = 6)
    @Getter
    @Setter
    private String icao24;

    @Column(name = "last_updated")
    private String timestamp;

    private String acars;

    private String adsb;

    private String built;

    private String categoryDescription;

    private String country;

    private String engines;

    private String firstFlightDate;

    private String firstSeen;

    private String icaoAircraftClass;

    private String lineNumber;

    private String manufacturerIcao;

    private String manufacturerName;

    /** Aircraft model / series (e.g. "737-800"). */
    @Getter
    @Setter
    private String model;

    private String modes;

    private String nextReg;

    private String notes;

    private String operator;

    private String operatorCallsign;

    private String operatorIata;

    private String operatorIcao;

    /** Registered owner of the aircraft. */
    @Getter
    @Setter
    private String owner;

    private String prevReg;

    private String regUntil;

    private String registered;

    @Getter
    @Setter
    private String registration;

    private String selCal;

    private String serialNumber;

    private String status;

    /** ICAO aircraft type designator (e.g. "B738"). */
    @Getter
    @Setter
    @Column(name = "aircraft_type")
    private String typecode;

    private String vdl;
}
