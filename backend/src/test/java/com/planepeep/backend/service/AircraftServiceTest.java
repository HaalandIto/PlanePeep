package com.planepeep.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.planepeep.backend.dto.AircraftMetadataDTO;
import com.planepeep.backend.dto.AircraftPositionDTO;
import com.planepeep.backend.model.AircraftMetadata;
import com.planepeep.backend.repository.AircraftRepository;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;

//NOTE: we don't include method comments since the test method names are so descriptive

/**
 * Unit tests for AircraftService business logic using Mockito.
 *
 * Tests validate:
 * - Viewport filtering applied to cached CONUS positions
 * - Metadata retrieval from local DB records
 * - ICAO24-based origin-country derivation for metadata responses
 * - Correct parameter passing to dependencies
 *
 * Testing model:
 * - Given: Set up mocks and test data
 * - When: Call the service method under test
 * - Then: Assert results and verify interactions
 */
class AircraftServiceTest {

    private AircraftRepository repository;
    private ConusAircraftCache conusCache;
    private Environment env;
    private AircraftService service;

    @BeforeEach
    void setUp() {
        repository = mock(AircraftRepository.class);
        conusCache = mock(ConusAircraftCache.class);
        env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[] {});
        service = new AircraftService(repository, conusCache, env);
    }

    // -------------------------------------------------------------------------
    // getPositions() - Viewport filtering against the CONUS cache
    // -------------------------------------------------------------------------

    @Test
    void getPositions_returnsAircraftWithinBoundingBox() {
        // Given: cache contains one aircraft inside and one outside the viewport
        AircraftPositionDTO inside = buildPositionDTO("a00001", 43.0, -89.0);
        AircraftPositionDTO outside = buildPositionDTO("a00002", 50.0, -89.0); // lat too high
        when(conusCache.get()).thenReturn(Arrays.asList(inside, outside));

        // When: viewport covers 42–44 lat, -90 to -88 lon
        List<AircraftPositionDTO> result = service.getPositions(42.0, 44.0, -90.0, -88.0);

        // Then: only the aircraft within the viewport is returned
        assertThat(result).containsExactly(inside);
    }

    @Test
    void getPositions_excludesAircraftOutsideAllFourEdges() {
        // Given: one aircraft beyond each edge of the viewport, plus one inside
        AircraftPositionDTO tooFarNorth = buildPositionDTO("a00001", 50.0, -89.0);
        AircraftPositionDTO tooFarSouth = buildPositionDTO("a00002", 41.0, -89.0);
        AircraftPositionDTO tooFarEast = buildPositionDTO("a00003", 43.0, -87.0);
        AircraftPositionDTO tooFarWest = buildPositionDTO("a00004", 43.0, -91.0);
        AircraftPositionDTO inside = buildPositionDTO("a00005", 43.0, -89.0);
        when(conusCache.get()).thenReturn(
            Arrays.asList(tooFarNorth, tooFarSouth, tooFarEast, tooFarWest, inside)
        );

        // When/Then: all four out-of-bounds aircraft are excluded
        List<AircraftPositionDTO> result = service.getPositions(42.0, 44.0, -90.0, -88.0);
        assertThat(result).containsExactly(inside);
    }

    @Test
    void getPositions_emptyCacheReturnsEmptyList() {
        // Given: cache has no aircraft (e.g. first call before OpenSky responds)
        when(conusCache.get()).thenReturn(Collections.emptyList());

        // When/Then: returns empty list without error
        List<AircraftPositionDTO> result = service.getPositions(42.0, 44.0, -90.0, -88.0);
        assertThat(result).isEmpty();
    }

    @Test
    void getPositions_delegatesToConusCache() {
        // Given: empty cache
        when(conusCache.get()).thenReturn(Collections.emptyList());

        // When: positions are requested
        service.getPositions(42.0, 44.0, -90.0, -88.0);

        // Then: the CONUS cache was consulted
        verify(conusCache).get();
    }

    // -------------------------------------------------------------------------
    // getMetadata() - Stored metadata from DB only
    // -------------------------------------------------------------------------

    @Test
    void getMetadata_foundInDb_returnsDbFieldsWithNullLive() {
        // Given: DB has metadata
        AircraftMetadata dbMetadata = createDbMetadata(
            "a00001",
            "N123AB",
            "737-800",
            "B738",
            "Test Airline"
        );
        when(repository.findByIcao24("a00001")).thenReturn(Optional.of(dbMetadata));

        // When: metadata is requested
        AircraftMetadataDTO result = service.getMetadata("a00001");

        // Then: DB fields are populated and dynamic fields are null
        assertThat(result.icao24()).isEqualTo("a00001");
        assertThat(result.originCountry()).isEqualTo("United States");
        assertThat(result.callsign()).isNull();
        assertThat(result.lastUpdated()).isNull();
        assertThat(result.longitude()).isNull();
        assertThat(result.latitude()).isNull();
        assertThat(result.altitude()).isNull();
        assertThat(result.velocity()).isNull();
        assertThat(result.heading()).isNull();
        assertThat(result.verticalRate()).isNull();
        assertThat(result.registration()).isEqualTo("N123AB");
        assertThat(result.model()).isEqualTo("737-800");
        assertThat(result.typecode()).isEqualTo("B738");
        assertThat(result.owner()).isEqualTo("Test Airline");
    }

    @Test
    void getMetadata_notFoundInDb_returnsIcaoAndOriginCountryOnly() {
        // Given: DB has no record
        when(repository.findByIcao24("a00001")).thenReturn(Optional.empty());

        // When: metadata is requested
        AircraftMetadataDTO result = service.getMetadata("a00001");

        // Then: only lookup key and derived origin country are populated
        assertThat(result.icao24()).isEqualTo("a00001");
        assertThat(result.originCountry()).isEqualTo("United States");
        assertThat(result.callsign()).isNull();
        assertThat(result.latitude()).isNull();
        assertThat(result.registration()).isNull();
        assertThat(result.model()).isNull();
        assertThat(result.typecode()).isNull();
        assertThat(result.owner()).isNull();
    }

    @Test
    void getMetadata_blankIcao_returnsNullOriginCountryAndObscured() {
        // Given: blank icao24
        when(repository.findByIcao24("   ")).thenReturn(Optional.empty());

        // When
        AircraftMetadataDTO result = service.getMetadata("   ");

        // Then
        assertThat(result.originCountry()).isNull();
        assertThat(result.isObscured()).isNull();
    }

    @Test
    void getMetadata_unknownIcao_returnsNullOriginCountry() {
        // Given: no DB record with unknown icao24 country block
        when(repository.findByIcao24("zzzzzz")).thenReturn(Optional.empty());

        // When/Then: icao24 is returned and origin country cannot be derived
        AircraftMetadataDTO result = service.getMetadata("zzzzzz");
        assertThat(result.icao24()).isEqualTo("zzzzzz");
        assertThat(result.originCountry()).isNull();
    }

    @Test
    void getMetadata_queriesRepositoryByIcao24() {
        // Given: empty DB
        when(repository.findByIcao24("a00001")).thenReturn(Optional.empty());

        // When: metadata is requested
        service.getMetadata("a00001");

        // Then: repository was queried with the correct icao24
        verify(repository).findByIcao24("a00001");
    }

    // -------------------------------------------------------------------------
    // Test data helpers
    // -------------------------------------------------------------------------

    private AircraftPositionDTO buildPositionDTO(String icao24, double lat, double lon) {
        return new AircraftPositionDTO(
            icao24,
            "TEST",
            "United States",
            null,
            lon,
            lat,
            null,
            null,
            null,
            null
        );
    }

    private AircraftMetadata createDbMetadata(
        String icao24,
        String registration,
        String model,
        String typecode,
        String owner
    ) {
        AircraftMetadata metadata = new AircraftMetadata();
        metadata.setIcao24(icao24);
        metadata.setRegistration(registration);
        metadata.setModel(model);
        metadata.setTypecode(typecode);
        metadata.setOwner(owner);
        return metadata;
    }
}
