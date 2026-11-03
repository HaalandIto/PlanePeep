package com.planepeep.backend.service;

import com.planepeep.backend.dto.AircraftMetadataDTO;
import com.planepeep.backend.dto.AircraftPositionDTO;
import com.planepeep.backend.model.AircraftMetadata;
import com.planepeep.backend.repository.AircraftRepository;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

/**
 * Business logic for aircraft data. Position queries are served from the CONUS cache
 * (one OpenSky call per minute) and filtered to the requested viewport in memory.
 * Metadata queries combine static records from the local DB with live state from OpenSky.
 */
@Service
public class AircraftService {

    private final AircraftRepository aircraftRepository;
    private final ConusAircraftCache conusCache;
    private final Environment env;

    public AircraftService(
        AircraftRepository aircraftRepository,
        ConusAircraftCache conusCache,
        Environment env
    ) {
        this.aircraftRepository = aircraftRepository;
        this.conusCache = conusCache;
        this.env = env;
    }

    /**
     * Returns live aircraft positions within the given bounding box. Results are filtered
     * from the shared CONUS cache, so no OpenSky API call is made unless the cache is cold.
     */
    public List<AircraftPositionDTO> getPositions(
        double minLat,
        double maxLat,
        double minLon,
        double maxLon
    ) {
        List<AircraftPositionDTO> allPositions = conusCache.get();
        if (Arrays.asList(env.getActiveProfiles()).contains("dev")) {
            System.out.println("Retrieved " + allPositions.size() + " positions from cache");
        }
        return allPositions
            .stream()
            .filter(
                (dto) ->
                    dto.latitude() >= minLat &&
                    dto.latitude() <= maxLat &&
                    dto.longitude() >= minLon &&
                    dto.longitude() <= maxLon
            )
            .toList();
    }

    /**
     * Returns stored metadata for a single aircraft from the local DB. Result is cached
     * per ICAO24 for 30 seconds.
     */
    @Cacheable(value = "metadata", key = "#icao24")
    public AircraftMetadataDTO getMetadata(String icao24) {
        // attempt to fetch static metadata from the local database
        Optional<AircraftMetadata> dbRecord = aircraftRepository.findByIcao24(icao24);
        String registration = dbRecord.map(AircraftMetadata::getRegistration).orElse(null);
        String model = dbRecord.map(AircraftMetadata::getModel).orElse(null);
        String typecode = dbRecord.map(AircraftMetadata::getTypecode).orElse(null);
        String owner = dbRecord.map(AircraftMetadata::getOwner).orElse(null);

        Boolean obscured = registration == null || registration.isBlank();
        if (icao24 == null || icao24.isBlank()) {
            obscured = null;
        }

        String originCountry = icao24ToCountry(icao24);

        // Return stored DB metadata only; live fields are intentionally null.
        return new AircraftMetadataDTO(
            icao24, // NOTE: this is the only guaranteed field since it's the lookup key
            null,
            originCountry,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            registration,
            model,
            typecode,
            owner,
            obscured
        );
    }

    /**
     * Derives the country of registration from an icao24 address based on contiguous hex ranges.
     *
     * @param icao24
     * @return country name, or null if the address is unrecognised
     */
    private static String icao24ToCountry(String icao24) {
        if (icao24 == null || icao24.length() != 6) return null;

        int addr;
        // safely convert address to hex
        try {
            addr = Integer.parseInt(icao24, 16);
        } catch (NumberFormatException e) {
            return null;
        }

        // block allocs
        if (addr >= 0x008000 && addr <= 0x00FFFF) return "South Africa";
        if (addr >= 0x010000 && addr <= 0x017FFF) return "Egypt";
        if (addr >= 0x018000 && addr <= 0x01FFFF) return "Libya";
        if (addr >= 0x020000 && addr <= 0x027FFF) return "Morocco";
        if (addr >= 0x028000 && addr <= 0x02FFFF) return "Tunisia";
        if (addr >= 0x0D0000 && addr <= 0x0FFFFF) return "Mexico";
        if (addr >= 0x100000 && addr <= 0x1FFFFF) return "Russia";
        if (addr >= 0x300000 && addr <= 0x33FFFF) return "Italy";
        if (addr >= 0x340000 && addr <= 0x37FFFF) return "Spain";
        if (addr >= 0x380000 && addr <= 0x3BFFFF) return "France";
        if (addr >= 0x3C0000 && addr <= 0x3FFFFF) return "Germany";
        if (addr >= 0x400000 && addr <= 0x43FFFF) return "United Kingdom";
        if (addr >= 0x440000 && addr <= 0x447FFF) return "Austria";
        if (addr >= 0x448000 && addr <= 0x44FFFF) return "Belgium";
        if (addr >= 0x450000 && addr <= 0x457FFF) return "Bulgaria";
        if (addr >= 0x458000 && addr <= 0x45FFFF) return "Denmark";
        if (addr >= 0x460000 && addr <= 0x467FFF) return "Finland";
        if (addr >= 0x468000 && addr <= 0x46FFFF) return "Greece";
        if (addr >= 0x470000 && addr <= 0x477FFF) return "Hungary";
        if (addr >= 0x478000 && addr <= 0x47FFFF) return "Norway";
        if (addr >= 0x480000 && addr <= 0x487FFF) return "Netherlands";
        if (addr >= 0x488000 && addr <= 0x48FFFF) return "Poland";
        if (addr >= 0x490000 && addr <= 0x497FFF) return "Portugal";
        if (addr >= 0x498000 && addr <= 0x49FFFF) return "Czech Republic";
        if (addr >= 0x4A0000 && addr <= 0x4AFFFF) return "Romania";
        if (addr >= 0x4B0000 && addr <= 0x4B7FFF) return "Sweden";
        if (addr >= 0x4B8000 && addr <= 0x4BFFFF) return "Switzerland";
        if (addr >= 0x4C0000 && addr <= 0x4C7FFF) return "Turkey";
        if (addr >= 0x780000 && addr <= 0x7BFFFF) return "China";
        if (addr >= 0x7C0000 && addr <= 0x7FFFFF) return "Australia";
        if (addr >= 0x800000 && addr <= 0x83FFFF) return "India";
        if (addr >= 0x840000 && addr <= 0x87FFFF) return "Japan";
        if (addr >= 0x880000 && addr <= 0x887FFF) return "South Korea";
        if (addr >= 0xA00000 && addr <= 0xAFFFFF) return "United States";
        if (addr >= 0xC00000 && addr <= 0xC3FFFF) return "Canada";
        if (addr >= 0xE40000 && addr <= 0xE7FFFF) return "Brazil";

        return null;
    }
}
