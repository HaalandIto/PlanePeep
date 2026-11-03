package com.planepeep.backend.service;

import com.planepeep.backend.dto.AircraftPositionDTO;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.opensky.api.OpenSkyApi;
import org.opensky.model.OpenSkyStates;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Fetches and caches all aircraft positions over the contiguous United States (CONUS).
 * Exists as a separate bean so that {@link AircraftService} can call it through Spring's
 * proxy, ensuring {@code @Cacheable} is honored. A single OpenSky API call is made at
 * most once per minute, shared across all viewport queries.
 */
@Service
public class ConusAircraftCache {

    static final double MIN_LAT = 24.0;
    static final double MAX_LAT = 49.5;
    static final double MIN_LON = -125.0;
    static final double MAX_LON = -66.0;

    private final OpenSkyApi api;
    private final AtomicReference<List<AircraftPositionDTO>> cached = new AtomicReference<>(
        Collections.emptyList()
    );
    private final Environment env;

    public ConusAircraftCache(OpenSkyApi api, Environment env) {
        this.api = api;
        this.env = env;
    }

    /**
     * Scheduled task to refresh the CONUS aircraft cache every minute.
     * On API failure, the old cache value is retained. API error is not propagated.
     */
    @Scheduled(fixedDelay = 60_000)
    public void refresh() {
        try {
            OpenSkyStates states = api.getStates(
                0,
                null,
                new OpenSkyApi.BoundingBox(MIN_LAT, MAX_LAT, MIN_LON, MAX_LON)
            );

            if (states == null || states.getStates() == null) {
                System.err.println("OpenSky API: Request failed");
                return;
            }

            if (Arrays.asList(env.getActiveProfiles()).contains("dev")) {
                System.out.println(
                    "OpenSky API: Refreshing CONUS aircraft cache with " +
                        states.getStates().size() +
                        " positions"
                );
            }

            List<AircraftPositionDTO> positions = states
                .getStates()
                .stream()
                .filter((sv) -> sv.getLatitude() != null && sv.getLongitude() != null)
                .map((sv) ->
                    new AircraftPositionDTO(
                        sv.getIcao24(),
                        sv.getCallsign() != null ? sv.getCallsign().trim() : null,
                        sv.getOriginCountry(),
                        sv.getLastPositionUpdate() != null
                            ? sv.getLastPositionUpdate().longValue()
                            : null,
                        sv.getLongitude(),
                        sv.getLatitude(),
                        sv.getBaroAltitude(),
                        sv.getVelocity(),
                        sv.getHeading(),
                        sv.getVerticalRate()
                    )
                )
                .toList();

            cached.set(positions);
            // on null/empty: silently keep old value
        } catch (IOException e) {
            // keep old value
            System.err.println("OpenSky API: Request failed with error: " + e.getMessage());
        }
    }

    /**
     * Returns all aircraft over CONUS with known positions, cached for 1 minute.
     * On API failure, the old cache value is retained.
     */
    // @Cacheable(value = "positions", key = "'conus'")
    public List<AircraftPositionDTO> get() {
        return cached.get();
    }
}
