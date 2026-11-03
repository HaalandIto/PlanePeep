package com.planepeep.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.planepeep.backend.model.User;
import com.planepeep.backend.model.UserFavorite;
import com.planepeep.backend.repository.FavoriteRepository;
import com.planepeep.backend.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Unit tests for FavoriteController.
 */
class FavoriteControllerTest {

    private MockMvc mockMvc;
    private FavoriteRepository favoriteRepository;
    private UserRepository userRepository;
    private User currentUser;

    @BeforeEach
    void setUp() {
        favoriteRepository = Mockito.mock(FavoriteRepository.class);
        userRepository = Mockito.mock(UserRepository.class);

        // user common to all tests for protected endpoints
        currentUser = new User();
        currentUser.setUserId(1L);
        currentUser.setUsername("hunter");

        mockMvc = MockMvcBuilders.standaloneSetup(
            new FavoriteController(favoriteRepository, userRepository)
        ).build();

        // Simulate the authenticated username that would normally be set by JwtAuthenticationFilter.
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("hunter", null)
        );

        // Resolve the authenticated user for all tests — the controller checks this before validation.
        when(userRepository.findByUsername("hunter")).thenReturn(Optional.of(currentUser));
    }

    @Test
    void listFavorites_returnsCurrentUsersFavorites() throws Exception {
        UserFavorite favorite = new UserFavorite();
        favorite.setFavoriteId(10L);
        favorite.setUser(currentUser);
        favorite.setExternalItemId("abc123");
        favorite.setName("My flight");
        favorite.setSortOrder(0);

        when(favoriteRepository.findByUser_UserIdOrderBySortOrderAscFavoriteIdAsc(1L)).thenReturn(
            List.of(favorite)
        );

        mockMvc
            .perform(get("/api/favorites"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].favoriteId").value(10))
            .andExpect(jsonPath("$[0].externalItemId").value("abc123"))
            .andExpect(jsonPath("$[0].name").value("My flight"))
            .andExpect(jsonPath("$[0].sortOrder").value(0));
    }

    @Test
    void addFavorite_blankExternalItemId_returns400() throws Exception {
        mockMvc
            .perform(
                post("/api/favorites")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"externalItemId\":\"   \"}")
            )
            .andExpect(status().isBadRequest());

        verify(favoriteRepository, never()).save(any());
    }

    @Test
    void addFavorite_invalidExternalItemId_returns400() throws Exception {
        mockMvc
            .perform(
                post("/api/favorites")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"externalItemId\":\"@@@\"}")
            )
            .andExpect(status().isBadRequest());

        verify(favoriteRepository, never()).save(any());
    }

    @Test
    void addFavorite_existingFavorite_returns200() throws Exception {
        UserFavorite existing = new UserFavorite();
        existing.setFavoriteId(10L);
        existing.setUser(currentUser);
        existing.setExternalItemId("abc123");

        when(favoriteRepository.findByUser_UserIdAndExternalItemId(1L, "abc123")).thenReturn(
            Optional.of(existing)
        );

        mockMvc
            .perform(
                post("/api/favorites")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"externalItemId\":\"abc123\"}")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.favoriteId").value(10))
            .andExpect(jsonPath("$.externalItemId").value("abc123"));

        verify(favoriteRepository, never()).save(any());
    }

    @Test
    void addFavorite_newFavorite_returns201() throws Exception {
        UserFavorite saved = new UserFavorite();
        saved.setFavoriteId(11L);
        saved.setUser(currentUser);
        saved.setExternalItemId("new123");
        saved.setName("new123");
        saved.setSortOrder(0);

        when(favoriteRepository.findByUser_UserIdAndExternalItemId(1L, "new123")).thenReturn(
            Optional.empty()
        );
        when(favoriteRepository.findByUser_UserIdOrderBySortOrderAscFavoriteIdAsc(1L)).thenReturn(
            List.of()
        );
        when(favoriteRepository.save(any(UserFavorite.class))).thenReturn(saved);

        mockMvc
            .perform(
                post("/api/favorites")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"externalItemId\":\"new123\"}")
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.favoriteId").value(11))
            .andExpect(jsonPath("$.externalItemId").value("new123"))
            .andExpect(jsonPath("$.name").value("new123"))
            .andExpect(jsonPath("$.sortOrder").value(0));
    }

    @Test
    void removeFavorite_notOwnedByUser_returns404() throws Exception {
        when(favoriteRepository.findByFavoriteIdAndUser_UserId(99L, 1L)).thenReturn(
            Optional.empty()
        );

        mockMvc.perform(delete("/api/favorites/99")).andExpect(status().isNotFound());
    }

    @Test
    void removeFavorite_ownedFavorite_returns204() throws Exception {
        UserFavorite favorite = new UserFavorite();
        favorite.setFavoriteId(10L);
        favorite.setUser(currentUser);
        favorite.setExternalItemId("abc123");

        when(favoriteRepository.findByFavoriteIdAndUser_UserId(10L, 1L)).thenReturn(
            Optional.of(favorite)
        );

        mockMvc.perform(delete("/api/favorites/10")).andExpect(status().isNoContent());
    }

    @Test
    void renameFavorite_updatesName() throws Exception {
        UserFavorite favorite = new UserFavorite();
        favorite.setFavoriteId(10L);
        favorite.setUser(currentUser);
        favorite.setExternalItemId("abc123");
        favorite.setName("Old name");

        when(favoriteRepository.findByFavoriteIdAndUser_UserId(10L, 1L)).thenReturn(
            Optional.of(favorite)
        );
        when(favoriteRepository.save(any(UserFavorite.class))).thenReturn(favorite);

        mockMvc
            .perform(
                patch("/api/favorites/10/name")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"New name\"}")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("New name"));
    }

    @Test
    void updatePosition_moveDown_returns200() throws Exception {
        UserFavorite first = new UserFavorite();
        first.setFavoriteId(10L);
        first.setUser(currentUser);
        first.setExternalItemId("abc123");
        first.setSortOrder(0);

        UserFavorite second = new UserFavorite();
        second.setFavoriteId(11L);
        second.setUser(currentUser);
        second.setExternalItemId("def456");
        second.setSortOrder(1);

        when(favoriteRepository.findByUser_UserIdOrderBySortOrderAscFavoriteIdAsc(1L)).thenReturn(
            List.of(first, second)
        );
        when(favoriteRepository.save(any(UserFavorite.class))).thenReturn(first);

        mockMvc
            .perform(
                patch("/api/favorites/10/order")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"direction\":\"down\"}")
            )
            .andExpect(status().isOk());
    }
}
