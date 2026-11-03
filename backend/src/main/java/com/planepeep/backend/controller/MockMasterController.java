package com.planepeep.backend.controller;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MockMasterController {

    // In-memory users and favorites for mock-only development.
    private final Map<String, Map<String, Object>> mockUsersByName = new HashMap<>();
    private final List<Map<String, Object>> mockFavorites = new ArrayList<>();

    public MockMasterController() {
        Map<String, Object> demoUser = new HashMap<>();
        demoUser.put("userId", 1L);
        demoUser.put("username", "Pilot_Guest");
        mockUsersByName.put("pilot_guest", demoUser);

        mockFavorites.add(
            createFavorite(1L, "a8192b", "KMSN", "KATL", "Madison, WI", "Atlanta, GA", "B738")
        );
        mockFavorites.add(
            createFavorite(2L, "c05a12", "KMKE", "KORD", "Milwaukee, WI", "Chicago, IL", "A320")
        );
    }

    /*
     * AUTHENTICATION MOCK DISABLED
     *
     * These mock endpoints were used for early frontend development, but they now
     * conflict with the real authentication endpoints implemented in AccountController:
     *
     *   POST /api/auth/register
     *   POST /api/auth/login
     *
     * Keep the helper methods and mock user data for now, but do not expose these
     * routes while the real backend auth implementation is active.
     */

    // --- FAVORITES MOCK HELPERS ONLY ---
    // These helpers remain for legacy account-scoped mock routes below,
    // but the real /api/favorites endpoints are now handled by FavoriteController.

    private List<Map<String, Object>> getFavorites() {
        return mockFavorites;
    }

    private Map<String, Object> addFavorite(Map<String, String> body) {
        String id = firstNonBlank(
            body.get("id"),
            body.get("externalItemId"),
            body.get("icao24"),
            randomIcao()
        );
        Map<String, Object> favorite = createFavorite(
            mockFavorites.size() + 1L,
            id,
            firstNonBlank(body.get("origin"), "KMSN"),
            firstNonBlank(body.get("destination"), "KORD"),
            firstNonBlank(body.get("originName"), "Madison, WI"),
            firstNonBlank(body.get("destinationName"), "Chicago, IL"),
            firstNonBlank(body.get("aircraftTypeCode"), "B738")
        );
        mockFavorites.add(favorite);
        return favorite;
    }

    private void removeFavorite(String favoriteId) {
        mockFavorites.removeIf((f) -> favoriteId.equals(String.valueOf(f.get("id"))));
    }

    // User-scoped aliases for legacy contract compatibility.

    @GetMapping("/account/{accountId}/favorite")
    public List<Map<String, Object>> getFavoritesForAccount(@PathVariable Long accountId) {
        return getFavorites();
    }

    @PostMapping("/account/{accountId}/favorite")
    public Map<String, Object> addFavoriteForAccount(
        @PathVariable Long accountId,
        @RequestBody Map<String, String> body
    ) {
        return addFavorite(body);
    }

    @DeleteMapping("/account/{accountId}/favorite/{externalItemId}")
    public void removeFavoriteForAccount(
        @PathVariable Long accountId,
        @PathVariable String externalItemId
    ) {
        removeFavorite(externalItemId);
    }

    private Map<String, Object> createFavorite(
        Long id,
        String flightId,
        String origin,
        String destination,
        String originName,
        String destinationName,
        String aircraftTypeCode
    ) {
        Map<String, Object> favorite = new HashMap<>();
        favorite.put("id", id);
        favorite.put("externalItemId", flightId);
        favorite.put("origin", origin);
        favorite.put("destination", destination);
        favorite.put("originName", originName);
        favorite.put("destinationName", destinationName);
        favorite.put("aircraftTypeCode", aircraftTypeCode);
        favorite.put("name", "Saved on " + new Date());
        favorite.put("lastUpdated", new Date().toString());
        return favorite;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return null;
    }

    private static String randomIcao() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 6);
    }
}
