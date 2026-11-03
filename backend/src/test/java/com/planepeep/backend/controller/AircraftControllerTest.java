package com.planepeep.backend.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.planepeep.backend.dto.AircraftMetadataDTO;
import com.planepeep.backend.dto.AircraftPositionDTO;
import com.planepeep.backend.service.AircraftService;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

//NOTE: we don't include method comments since the test method names are so descriptive

/**
 * Unit tests for AircraftController using standalone MockMvc with mocked AircraftService.
 *
 * Tests validate HTTP layer behavior without Spring context, focusing on:
 * - Request parameter validation
 * - Response status codes and JSON structure
 * - Service method invocation with correct parameters
 */
class AircraftControllerTest {

    private MockMvc mockMvc;
    private AircraftService aircraftService;

    @BeforeEach
    void setUp() {
        aircraftService = mock(AircraftService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new AircraftController(aircraftService)).build();
    }

    // Aircraft positions - GET /api/aircraft/positions

    @Test
    void getPositions_validBoundingBox_returns200WithAircraftList() throws Exception {
        // Given: Service returns 2 aircraft
        List<AircraftPositionDTO> positions = Arrays.asList(
            buildPositionDTO("a00001", 43.0, -89.0),
            buildPositionDTO("a00002", 43.5, -89.5)
        );
        when(aircraftService.getPositions(42.0, 44.0, -90.0, -88.0)).thenReturn(positions);

        // When/Then: Request with valid bounding box returns 200 with 2 aircraft
        mockMvc
            .perform(
                get("/api/aircraft/positions")
                    .param("minLat", "42.0")
                    .param("maxLat", "44.0")
                    .param("minLon", "-90.0")
                    .param("maxLon", "-88.0")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].icao24", is("a00001")))
            .andExpect(jsonPath("$[1].icao24", is("a00002")))
            .andExpect(jsonPath("$[0].callsign", is("TEST123"))) // check presence of all fields
            .andExpect(jsonPath("$[0].originCountry", is("United States")))
            .andExpect(jsonPath("$[0].lastUpdated", is(1234567890)))
            .andExpect(jsonPath("$[0].longitude", is(-89.0)))
            .andExpect(jsonPath("$[0].latitude", is(43.0)))
            .andExpect(jsonPath("$[0].altitude", is(10000.0)))
            .andExpect(jsonPath("$[0].velocity", is(250.5)))
            .andExpect(jsonPath("$[0].heading", is(180.0)))
            .andExpect(jsonPath("$[0].verticalRate", is(5.2)));

        verify(aircraftService).getPositions(42.0, 44.0, -90.0, -88.0);
    }

    @Test
    void getPositions_emptyResults_returns200WithEmptyArray() throws Exception {
        // Given: Service returns empty list
        when(aircraftService.getPositions(42.0, 44.0, -90.0, -88.0)).thenReturn(
            Collections.emptyList()
        );

        // When/Then: Request returns 200 with empty array
        mockMvc
            .perform(
                get("/api/aircraft/positions")
                    .param("minLat", "42.0")
                    .param("maxLat", "44.0")
                    .param("minLon", "-90.0")
                    .param("maxLon", "-88.0")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void getPositions_missingRequiredParams_returns400() throws Exception {
        // When: Request without parameters
        // Then: Returns 400 Bad Request
        mockMvc.perform(get("/api/aircraft/positions")).andExpect(status().isBadRequest()); //TODO more specific error msg

        // Service should never be called, request should be rejected at controller
        verify(aircraftService, never()).getPositions(
            anyDouble(),
            anyDouble(),
            anyDouble(),
            anyDouble()
        );
    }

    @Test
    void getPositions_invalidParamTypes_returns400() throws Exception {
        // When: Request with non-numeric parameter
        // Then: Returns 400 Bad Request
        mockMvc
            .perform(
                get("/api/aircraft/positions")
                    .param("minLat", "invalid")
                    .param("maxLat", "44.0")
                    .param("minLon", "-90.0")
                    .param("maxLon", "-88.0")
            )
            .andExpect(status().isBadRequest()); //TODO more specific error msg
    }

    @Test
    void getPositions_nullableFieldsHandledCorrectly() throws Exception {
        // Given: DTO with nullable fields set to null
        AircraftPositionDTO dto = new AircraftPositionDTO(
            "a00001", // icao24 (required)
            null, // callsign (nullable)
            "United States", // originCountry (required)
            null, // lastUpdated (nullable)
            -89.0, // longitude (required)
            43.0, // latitude (required)
            null, // altitude (nullable)
            null, // velocity (nullable)
            null, // heading (nullable)
            null // verticalRate (nullable)
        );
        when(aircraftService.getPositions(42.0, 44.0, -90.0, -88.0)).thenReturn(
            Collections.singletonList(dto)
        );

        // When/Then: Null fields present in response with null values
        mockMvc
            .perform(
                get("/api/aircraft/positions")
                    .param("minLat", "42.0")
                    .param("maxLat", "44.0")
                    .param("minLon", "-90.0")
                    .param("maxLon", "-88.0")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].callsign", nullValue()))
            .andExpect(jsonPath("$[0].lastUpdated", nullValue()))
            .andExpect(jsonPath("$[0].altitude", nullValue()))
            .andExpect(jsonPath("$[0].velocity", nullValue()))
            .andExpect(jsonPath("$[0].heading", nullValue()))
            .andExpect(jsonPath("$[0].verticalRate", nullValue()));
    }

    // Aircraft metadata - GET /api/aircraft/metadata/{icao24}

    @Test
    void getMetadata_knownAircraft_returns200WithFullMetadata() throws Exception {
        // Given: Service returns complete metadata DTO (14 fields)
        AircraftMetadataDTO dto = buildMetadataDTO("a00001", "N123AB", "737-800");
        when(aircraftService.getMetadata("a00001")).thenReturn(dto);

        // When/Then: Request returns 200 with all fields
        mockMvc
            .perform(get("/api/aircraft/metadata/a00001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.icao24", is("a00001")))
            .andExpect(jsonPath("$.callsign", is("TEST123")))
            .andExpect(jsonPath("$.originCountry", is("United States")))
            .andExpect(jsonPath("$.lastUpdated", is(1234567890)))
            .andExpect(jsonPath("$.longitude", is(-89.0)))
            .andExpect(jsonPath("$.latitude", is(43.0)))
            .andExpect(jsonPath("$.altitude", is(10000.0)))
            .andExpect(jsonPath("$.velocity", is(250.5)))
            .andExpect(jsonPath("$.heading", is(180.0)))
            .andExpect(jsonPath("$.verticalRate", is(5.2)))
            .andExpect(jsonPath("$.registration", is("N123AB")))
            .andExpect(jsonPath("$.model", is("737-800")))
            .andExpect(jsonPath("$.typecode", is("B738")))
            .andExpect(jsonPath("$.owner", is("Test Airline")));

        verify(aircraftService).getMetadata("a00001");
    }

    @Test
    void getMetadata_unknownAircraft_returns200WithIcao24Only() throws Exception {
        // Given: Service returns DTO with only icao24, all other fields null
        AircraftMetadataDTO dto = new AircraftMetadataDTO(
            "zzzzzz", // icao24
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null, // live fields
            null,
            null,
            null,
            null, // DB fields
            null
        );
        when(aircraftService.getMetadata("zzzzzz")).thenReturn(dto);

        // When/Then: Request returns 200 with icao24 only
        mockMvc
            .perform(get("/api/aircraft/metadata/zzzzzz"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.icao24", is("zzzzzz")))
            .andExpect(jsonPath("$.callsign", nullValue()))
            .andExpect(jsonPath("$.registration", nullValue()))
            .andExpect(jsonPath("$.model", nullValue()));
    }

    // Test data helpers

    private AircraftPositionDTO buildPositionDTO(String icao24, Double lat, Double lon) {
        return new AircraftPositionDTO(
            icao24,
            "TEST123",
            "United States",
            1234567890L,
            lon,
            lat,
            10000.0,
            250.5,
            180.0,
            5.2
        );
    }

    private AircraftMetadataDTO buildMetadataDTO(String icao24, String registration, String model) {
        return new AircraftMetadataDTO(
            icao24,
            "TEST123", // callsign
            "United States", // originCountry
            1234567890L, // lastUpdated
            -89.0, // longitude
            43.0, // latitude
            10000.0, // altitude
            250.5, // velocity
            180.0, // heading
            5.2, // verticalRate
            registration, // registration
            model, // model
            "B738", // typecode
            "Test Airline", // owner
            false
        );
    }
}
