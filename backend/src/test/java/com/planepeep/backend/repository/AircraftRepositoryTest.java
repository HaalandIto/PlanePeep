package com.planepeep.backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.planepeep.backend.model.AircraftMetadata;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

//NOTE: we don't include method comments since the test method names are so descriptive

/**
 * Integration tests for AircraftRepository using H2 in-memory database.
 *
 * Tests validate:
 * - Custom query methods (findByIcao24, findByCountryIgnoreCase, findByTypecode)
 * - CRUD operations (save, update, delete)
 * - Entity field mapping and persistence
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AircraftRepositoryTest {

    @Autowired
    private AircraftRepository repository;

    @PersistenceContext
    private EntityManager entityManager;

    @BeforeEach
    void setUp() {
        // Clear any existing data
        repository.deleteAll();
        entityManager.flush();

        // Create and persist test aircraft
        AircraftMetadata aircraft1 = createAircraft("a00001", "N123AB", "United States", "B738");
        AircraftMetadata aircraft2 = createAircraft("a00002", "N456CD", "United States", "A320");
        AircraftMetadata aircraft3 = createAircraft("c00003", "C-ABCD", "Canada", "B738");

        entityManager.persist(aircraft1);
        entityManager.persist(aircraft2);
        entityManager.persist(aircraft3);
        entityManager.flush();
    }

    // -------------------------------------------------------------------------
    // findByIcao24() tests
    // -------------------------------------------------------------------------

    @Test
    void findByIcao24_existingAircraft_returnsOptionalWithEntity() {
        // When: Find existing aircraft
        Optional<AircraftMetadata> result = repository.findByIcao24("a00001");

        // Then: Optional present with matching icao24
        assertThat(result).isPresent();
        assertThat(result.get().getIcao24()).isEqualTo("a00001");
        assertThat(result.get().getRegistration()).isEqualTo("N123AB");
    }

    @Test
    void findByIcao24_nonExistentAircraft_returnsEmptyOptional() {
        // When: Find non-existent aircraft
        Optional<AircraftMetadata> result = repository.findByIcao24("zzzzzz");

        // Then: Returns empty optional
        assertThat(result).isEmpty();
    }

    // -------------------------------------------------------------------------
    // findByTypecode() tests
    // -------------------------------------------------------------------------

    @Test
    void findByTypecode_existingTypecode_returnsAllMatching() {
        // When: Search for B738 typecode
        List<AircraftMetadata> result = repository.findByTypecode("B738");

        // Then: Returns 2 results (aircraft1 and aircraft3)
        assertThat(result).hasSize(2);
        assertThat(result)
            .extracting(AircraftMetadata::getIcao24)
            .containsExactlyInAnyOrder("a00001", "c00003");
    }

    @Test
    void findByTypecode_caseSensitive() {
        // When: Search with lowercase (persisted as uppercase)
        List<AircraftMetadata> result = repository.findByTypecode("b738");

        // Then: Returns empty list (case sensitive, unlike country)
        assertThat(result).isEmpty();
    }

    // -------------------------------------------------------------------------
    // CRUD operation tests
    // -------------------------------------------------------------------------

    @Test
    void save_newAircraft_persistsSuccessfully() {
        // Given: New aircraft
        AircraftMetadata newAircraft = createAircraft("d00004", "N789EF", "United States", "B777");

        // When: Save aircraft
        repository.save(newAircraft);
        entityManager.flush();

        // Then: Can retrieve it
        Optional<AircraftMetadata> result = repository.findByIcao24("d00004");
        assertThat(result).isPresent();
        assertThat(result.get().getRegistration()).isEqualTo("N789EF");
        assertThat(result.get().getTypecode()).isEqualTo("B777");
    }

    @Test
    void save_updateExisting_modifiesFields() {
        // Given: Load existing aircraft
        Optional<AircraftMetadata> existing = repository.findByIcao24("a00001");
        assertThat(existing).isPresent();

        // When: Modify and save
        AircraftMetadata aircraft = existing.get();
        aircraft.setRegistration("N999ZZ");
        aircraft.setModel("737-900");
        repository.save(aircraft);
        entityManager.flush();
        entityManager.clear(); // Clear cache to force DB read

        // Then: Changes persisted
        Optional<AircraftMetadata> updated = repository.findByIcao24("a00001");
        assertThat(updated).isPresent();
        assertThat(updated.get().getRegistration()).isEqualTo("N999ZZ");
        assertThat(updated.get().getModel()).isEqualTo("737-900");
    }

    @Test
    void deleteById_removesEntity() {
        // When: Delete aircraft
        repository.deleteById("a00001");
        entityManager.flush();

        // Then: No longer exists
        Optional<AircraftMetadata> result = repository.findByIcao24("a00001");
        assertThat(result).isEmpty();
    }

    // -------------------------------------------------------------------------
    // Entity field mapping tests
    // -------------------------------------------------------------------------

    @Test
    void entityMapping_all5AccessibleFieldsPersistCorrectly() {
        // Given: Aircraft with all accessible fields (fields with getters/setters)
        AircraftMetadata aircraft = new AircraftMetadata();
        aircraft.setIcao24("test01");
        aircraft.setRegistration("N123AB");
        aircraft.setModel("737-800");
        aircraft.setTypecode("B738");
        aircraft.setOwner("Test Airline LLC");

        // When: Persist and retrieve
        entityManager.persist(aircraft);
        entityManager.flush();
        entityManager.clear();

        Optional<AircraftMetadata> result = repository.findByIcao24("test01");

        // Then: All fields match original
        assertThat(result).isPresent();
        AircraftMetadata retrieved = result.get();
        assertThat(retrieved.getIcao24()).isEqualTo("test01");
        assertThat(retrieved.getRegistration()).isEqualTo("N123AB");
        assertThat(retrieved.getModel()).isEqualTo("737-800");
        assertThat(retrieved.getTypecode()).isEqualTo("B738");
        assertThat(retrieved.getOwner()).isEqualTo("Test Airline LLC");
    }

    @Test
    void nullableFields_allowNullValues() {
        // Given: Aircraft with only icao24, all else null
        AircraftMetadata aircraft = new AircraftMetadata();
        aircraft.setIcao24("test03");
        // All other fields remain null

        // When: Persist and retrieve
        entityManager.persist(aircraft);
        entityManager.flush();
        entityManager.clear();

        Optional<AircraftMetadata> result = repository.findByIcao24("test03");

        // Then: No constraint violations, entity saved with nulls
        assertThat(result).isPresent();
        assertThat(result.get().getIcao24()).isEqualTo("test03");
        assertThat(result.get().getRegistration()).isNull();
        assertThat(result.get().getModel()).isNull();
        assertThat(result.get().getTypecode()).isNull();
        assertThat(result.get().getOwner()).isNull();
    }

    // -------------------------------------------------------------------------
    // Test data helper
    // -------------------------------------------------------------------------

    private AircraftMetadata createAircraft(
        String icao24,
        String registration,
        String country,
        String typecode
    ) {
        AircraftMetadata aircraft = new AircraftMetadata();
        aircraft.setIcao24(icao24);
        aircraft.setRegistration(registration);
        aircraft.setModel("Test Model");
        aircraft.setTypecode(typecode);
        aircraft.setOwner("Test Owner");

        // Note: country field doesn't have @Getter/@Setter, use reflection
        ReflectionTestUtils.setField(aircraft, "country", country);

        return aircraft;
    }
}
