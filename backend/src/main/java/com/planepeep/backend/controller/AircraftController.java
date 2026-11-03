package com.planepeep.backend.controller;

import com.planepeep.backend.dto.AircraftMetadataDTO;
import com.planepeep.backend.dto.AircraftPositionDTO;
import com.planepeep.backend.service.AircraftService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/aircraft")
public class AircraftController {

    private final AircraftService aircraftService;

    public AircraftController(AircraftService aircraftService) {
        this.aircraftService = aircraftService;
    }

    /**
     * Returns live aircraft positions within the given bounding box. Results are cached for 1 minute.
     * Only aircraft with known position data are included.
     */
    @GetMapping("/positions")
    public List<AircraftPositionDTO> getPositions(
        @RequestParam double minLat,
        @RequestParam double maxLat,
        @RequestParam double minLon,
        @RequestParam double maxLon
    ) {
        return aircraftService.getPositions(minLat, maxLat, minLon, maxLon);
    }

    /**
     * Returns metadata for a specific aircraft by its ICAO 24-bit address.
     *
     * This is mostly static information. It combines db data + cached position data, cross-referenced by icao24. If the aircraft is not in the database, it will return a DTO with only the icao24 field populated.
     */
    @GetMapping("/metadata/{icao24}")
    public ResponseEntity<AircraftMetadataDTO> getMetadata(@PathVariable String icao24) {
        return ResponseEntity.ok(aircraftService.getMetadata(icao24));
    }
}
