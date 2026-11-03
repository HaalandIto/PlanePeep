package com.planepeep.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.planepeep.backend.dto.AircraftPositionDTO;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.opensky.api.OpenSkyApi;
import org.opensky.model.OpenSkyStates;
import org.opensky.model.StateVector;
import org.springframework.core.env.Environment;

//NOTE: we don't include method comments since the test method names are so descriptive

/**
 * Unit tests for ConusAircraftCache: the OpenSky fetch, null-coordinate filtering,
 * DTO field mapping, and error handling that previously lived in AircraftService.
 */
class ConusAircraftCacheTest {

    private OpenSkyApi api;
    private ConusAircraftCache cache;
    private Environment env;

    @BeforeEach
    void setUp() {
        api = mock(OpenSkyApi.class);
        env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[] {});
        cache = new ConusAircraftCache(api, env);
    }

    // OpenSky API interaction

    @Test
    void get_callsApiWithConusBoundingBox() throws IOException {
        // Given: API returns null (we only care about the call, not the result)
        when(api.getStates(eq(0), isNull(), any(OpenSkyApi.BoundingBox.class))).thenReturn(null);

        // When: cache is refreshed
        cache.refresh();

        // Then: API was called with a bounding box (CONUS constants defined in the class)
        verify(api).getStates(eq(0), isNull(), any(OpenSkyApi.BoundingBox.class));
    }

    @Test
    void get_nullStatesResponse_returnsEmptyList() throws IOException {
        // Given: API returns null
        when(api.getStates(eq(0), isNull(), any(OpenSkyApi.BoundingBox.class))).thenReturn(null);

        // When/Then: returns empty list without error
        cache.refresh();
        assertThat(cache.get()).isEmpty();
    }

    @Test
    void get_ioException_returnsEmptyList() throws IOException {
        // Given: API throws IOException
        when(api.getStates(eq(0), isNull(), any(OpenSkyApi.BoundingBox.class))).thenThrow(
            new IOException("Network error")
        );

        // When/Then: exception is swallowed, empty list returned
        cache.refresh();
        assertThat(cache.get()).isEmpty();
    }

    // Null coordinate filtering

    @Test
    void get_filtersNullLatitude() throws IOException {
        // Given: one valid aircraft, one with null latitude
        StateVector valid = createStateVector("a00001", 43.0, -89.0, "TEST1");
        StateVector nullLat = createStateVector("a00002", null, -89.5, "TEST2");
        OpenSkyStates states = createOpenSkyStates(valid, nullLat);
        when(api.getStates(eq(0), isNull(), any(OpenSkyApi.BoundingBox.class))).thenReturn(states);

        // When/Then: only the aircraft with a known position is returned
        cache.refresh();
        List<AircraftPositionDTO> result = cache.get();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).icao24()).isEqualTo("a00001");
    }

    @Test
    void get_filtersNullLongitude() throws IOException {
        // Given: one valid aircraft, one with null longitude
        StateVector valid = createStateVector("a00001", 43.0, -89.0, "TEST1");
        StateVector nullLon = createStateVector("a00002", 43.0, null, "TEST2");
        OpenSkyStates states = createOpenSkyStates(valid, nullLon);
        when(api.getStates(eq(0), isNull(), any(OpenSkyApi.BoundingBox.class))).thenReturn(states);

        // When/Then: only the aircraft with a known position is returned
        cache.refresh();
        List<AircraftPositionDTO> result = cache.get();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).icao24()).isEqualTo("a00001");
    }

    // DTO field mapping

    @Test
    void get_mapsAllFieldsCorrectly() throws IOException {
        // Given: a fully populated StateVector
        StateVector sv = createCompleteStateVector("a00001", 43.0, -89.0, "TEST123", 1234567890.0);
        when(sv.getOriginCountry()).thenReturn("United States");
        when(sv.getBaroAltitude()).thenReturn(10000.0);
        when(sv.getVelocity()).thenReturn(250.5);
        when(sv.getHeading()).thenReturn(180.0);
        when(sv.getVerticalRate()).thenReturn(5.2);
        OpenSkyStates states = createOpenSkyStates(sv);
        when(api.getStates(eq(0), isNull(), any(OpenSkyApi.BoundingBox.class))).thenReturn(states);

        // When: cache is refreshed and result retrieved
        cache.refresh();
        AircraftPositionDTO dto = cache.get().get(0);

        // Then: each DTO field matches the corresponding StateVector field
        assertThat(dto.icao24()).isEqualTo("a00001");
        assertThat(dto.callsign()).isEqualTo("TEST123");
        assertThat(dto.originCountry()).isEqualTo("United States");
        assertThat(dto.lastUpdated()).isEqualTo(1234567890L);
        assertThat(dto.longitude()).isEqualTo(-89.0);
        assertThat(dto.latitude()).isEqualTo(43.0);
        assertThat(dto.altitude()).isEqualTo(10000.0);
        assertThat(dto.velocity()).isEqualTo(250.5);
        assertThat(dto.heading()).isEqualTo(180.0);
        assertThat(dto.verticalRate()).isEqualTo(5.2);
    }

    @Test
    void get_handlesNullCallsign() throws IOException {
        // Given: StateVector with null callsign
        StateVector sv = createStateVector("a00001", 43.0, -89.0, null);
        OpenSkyStates states = createOpenSkyStates(sv);
        when(api.getStates(eq(0), isNull(), any(OpenSkyApi.BoundingBox.class))).thenReturn(states);

        // When/Then: null callsign does not throw NPE
        cache.refresh();
        assertThat(cache.get().get(0).callsign()).isNull();
    }

    // Test data helpers

    /**
     * Create a StateVector with specified params.
     *
     * Other fields left default since they're not relevant for most tests.
     */
    private StateVector createStateVector(String icao24, Double lat, Double lon, String callsign) {
        StateVector sv = mock(StateVector.class);
        when(sv.getIcao24()).thenReturn(icao24);
        when(sv.getLatitude()).thenReturn(lat);
        when(sv.getLongitude()).thenReturn(lon);
        when(sv.getCallsign()).thenReturn(callsign);
        return sv;
    }

    /**
     * Create a StateVector with an additional lastUpdate field, which is needed for testing the DTO mapping of that field.
     */
    private StateVector createCompleteStateVector(
        String icao24,
        Double lat,
        Double lon,
        String callsign,
        Double lastUpdate
    ) {
        StateVector sv = createStateVector(icao24, lat, lon, callsign);
        when(sv.getLastPositionUpdate()).thenReturn(lastUpdate);
        return sv;
    }

    /**
     * Create an OpenSkyStates object containing the given StateVectors. Useful for stubbing API responses.
     *
     * Must be evaluated before stubbing the API call since the API needs to return this object. Specifically, before when() starts.
     */
    private OpenSkyStates createOpenSkyStates(StateVector... vectors) {
        OpenSkyStates states = mock(OpenSkyStates.class);
        when(states.getStates()).thenReturn(Arrays.asList(vectors));
        return states;
    }
}
