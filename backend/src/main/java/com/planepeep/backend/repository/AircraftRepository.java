package com.planepeep.backend.repository;

import com.planepeep.backend.model.AircraftMetadata;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for accessing aircraft metadata stored in the local database.
 *
 * Metadata is a large amount of static information about aircraft preloaded from OpenSky.
 */
@Repository
public interface AircraftRepository extends JpaRepository<AircraftMetadata, String> {
    Optional<AircraftMetadata> findByIcao24(String icao24); //TODO make case insensitive?
    Optional<AircraftMetadata> findByRegistrationIgnoreCase(String registration);
    List<AircraftMetadata> findByTypecode(String typecode);
}
