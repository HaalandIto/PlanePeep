package com.planepeep.backend.controller;

import com.planepeep.backend.model.User;
import com.planepeep.backend.model.UserFavorite;
import com.planepeep.backend.repository.FavoriteRepository;
import com.planepeep.backend.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Real favorites API backed by persistent storage.
 *
 * <p>Uses the authenticated username from Spring Security and resolves the matching {@link User}
 * from the database; it does not trust any user id from the client.
 *
 * <p>Disabled under the {@code test} profile so standalone mock tests can target the controller
 * without loading the full secured application context.
 */
@Profile("!test")
@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    /**
     * ICAO24 format: exactly 6 hexadecimal characters.
     */
    private static final Pattern ICAO24_PATTERN = Pattern.compile("^[0-9A-Fa-f]{6}$");

    /**
     * Tail / general aircraft id: 2–16 alphanumeric or hyphen (after trim).
     */
    private static final Pattern AIRCRAFT_ID_PATTERN = Pattern.compile("^[A-Za-z0-9-]{2,16}$");

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;

    public FavoriteController(
        FavoriteRepository favoriteRepository,
        UserRepository userRepository
    ) {
        this.favoriteRepository = favoriteRepository;
        this.userRepository = userRepository;
    }

    /**
     * Request body for creating a favorite.
     */
    public record FavoriteRequest(String externalItemId, String tailNumber, String typecode) {}

    /** Request body for renaming a favorite. */
    public record FavoriteNameRequest(String name) {}

    /** Request body for updating favorite order ({@code up} or {@code down}). */
    public record FavoritePositionRequest(String direction) {}

    /**
     * GET /api/favorites — returns the current user's favorites ordered by position.
     */
    @GetMapping
    public ResponseEntity<List<UserFavorite>> listFavorites() {
        User currentUser = resolveCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(
            favoriteRepository.findByUser_UserIdOrderBySortOrderAscFavoriteIdAsc(
                currentUser.getUserId()
            )
        );
    }

    /**
     * POST /api/favorites — creates a favorite or returns the existing row with 200 if already present.
     */
    @PostMapping
    public ResponseEntity<?> addFavorite(@RequestBody FavoriteRequest body) {
        User currentUser = resolveCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (body == null || body.externalItemId() == null || body.externalItemId().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        String externalItemId = body.externalItemId().trim();
        if (!isValidAircraftIdentifier(externalItemId)) {
            return ResponseEntity.badRequest().build();
        }

        // if a favorite already exists, return it
        Optional<UserFavorite> existing = favoriteRepository.findByUser_UserIdAndExternalItemId(
            currentUser.getUserId(),
            externalItemId
        );

        if (existing.isPresent()) {
            return ResponseEntity.ok(existing.get());
        }

        String tailNumber = (body.tailNumber() == null || body.tailNumber().isBlank())
            ? null
            : body.tailNumber().trim();
        String typecode = (body.typecode() == null || body.typecode().isBlank())
            ? null
            : body.typecode().trim();

        String name = tailNumber != null ? tailNumber : externalItemId;

        UserFavorite favorite = new UserFavorite();
        favorite.setUser(currentUser);
        favorite.setExternalItemId(externalItemId);
        favorite.setName(name);
        favorite.setTailNumber(tailNumber);
        favorite.setSortOrder(nextPositionForUser(currentUser.getUserId()));
        favorite.setTypecode(typecode);

        UserFavorite saved = favoriteRepository.save(favorite);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * DELETE /api/favorites/{favoriteId} — deletes a favorite owned by the current user.
     */
    @DeleteMapping("/{favoriteId}")
    public ResponseEntity<Void> removeFavorite(@PathVariable Long favoriteId) {
        User currentUser = resolveCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<UserFavorite> favoriteOpt = favoriteRepository.findByFavoriteIdAndUser_UserId(
            favoriteId,
            currentUser.getUserId()
        );

        if (favoriteOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        favoriteRepository.delete(favoriteOpt.get());
        compactSortOrders(currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    /**
     * PATCH /api/favorites/{favoriteId}/name — updates the display name for an owned favorite.
     */
    @PatchMapping("/{favoriteId}/name")
    public ResponseEntity<UserFavorite> renameFavorite(
        @PathVariable Long favoriteId,
        @RequestBody FavoriteNameRequest body
    ) {
        if (body == null || body.name() == null || body.name().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        UserFavorite favorite = findOwnedFavorite(favoriteId);
        if (favorite == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        favorite.setName(body.name().trim());
        return ResponseEntity.ok(favoriteRepository.save(favorite));
    }

    /**
     * PATCH /api/favorites/{favoriteId}/order — moves a favorite up or down in sort order.
     */
    @PatchMapping("/{favoriteId}/order")
    public ResponseEntity<UserFavorite> updatePosition(
        @PathVariable Long favoriteId,
        @RequestBody FavoritePositionRequest body
    ) {
        User currentUser = resolveCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (body == null || (!"up".equals(body.direction()) && !"down".equals(body.direction()))) {
            return ResponseEntity.badRequest().build();
        }

        List<UserFavorite> favorites =
            favoriteRepository.findByUser_UserIdOrderBySortOrderAscFavoriteIdAsc(
                currentUser.getUserId()
            );
        UserFavorite favorite = null;
        // find favorite and current position
        int currentPosition = -1;
        for (UserFavorite f : favorites) {
            if (f.getFavoriteId().equals(favoriteId)) {
                currentPosition = f.getSortOrder();
                favorite = f;
                break;
            }
        }
        // check for existence and boundary conditions
        if (currentPosition == -1 || favorite == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        if (
            ("up".equals(body.direction()) && currentPosition == 0) ||
            ("down".equals(body.direction()) && currentPosition == favorites.size() - 1)
        ) {
            return ResponseEntity.ok(favorite);
        }
        // find the adjacent favorite and swap sort order
        for (UserFavorite other : favorites) {
            if (other.getFavoriteId().equals(favoriteId)) {
                continue;
            }

            if ("up".equals(body.direction()) && other.getSortOrder() == currentPosition - 1) {
                other.setSortOrder(currentPosition);
                favoriteRepository.save(other);
                currentPosition--;
                favorite.setSortOrder(currentPosition);
                favoriteRepository.save(favorite);
                break;
            } else if (
                "down".equals(body.direction()) && other.getSortOrder() == currentPosition + 1
            ) {
                other.setSortOrder(currentPosition);
                favoriteRepository.save(other);
                currentPosition++;
                favorite.setSortOrder(currentPosition);
                favoriteRepository.save(favorite);
                break;
            }
        }
        return ResponseEntity.ok(favorite);
    }

    /**
     * Helper method to find a favorite by id that is owned by the current user. Returns null if not found or if there is no authenticated user.
     */
    private UserFavorite findOwnedFavorite(Long favoriteId) {
        User currentUser = resolveCurrentUser();
        if (currentUser == null) {
            return null;
        }

        return favoriteRepository
            .findByFavoriteIdAndUser_UserId(favoriteId, currentUser.getUserId())
            .orElse(null);
    }

    /**
     * Resolves the current user from the security context (JWT filter sets the principal name).
     */
    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return null;
        }

        String username = authentication.getName();
        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            return null;
        }

        return userRepository.findByUsername(username).orElse(null);
    }

    /**
     * Make sort order contiguous for a user. Called after a deletion to close any gap left by the
     * removed entry so that the swap logic in {@link #updatePosition} stays correct.
     */
    private void compactSortOrders(Long userId) {
        List<UserFavorite> favorites =
            favoriteRepository.findByUser_UserIdOrderBySortOrderAscFavoriteIdAsc(userId);
        for (int i = 0; i < favorites.size(); i++) {
            UserFavorite f = favorites.get(i);
            if (f.getSortOrder() != i) {
                f.setSortOrder(i);
                favoriteRepository.save(f);
            }
        }
    }

    /**
     * Determines the next position index for a new favorite for the given user by counting existing favorites. Ensures new favorites given end position.
     */
    private int nextPositionForUser(Long userId) {
        //NOTE race condition
        return favoriteRepository.findByUser_UserIdOrderBySortOrderAscFavoriteIdAsc(userId).size();
    }

    /**
     * Accept either a 6-character ICAO24 (hex) or a 2–16 character tail-style identifier.
     */
    private boolean isValidAircraftIdentifier(String value) {
        return (
            ICAO24_PATTERN.matcher(value).matches() || AIRCRAFT_ID_PATTERN.matcher(value).matches()
        );
    }
}
