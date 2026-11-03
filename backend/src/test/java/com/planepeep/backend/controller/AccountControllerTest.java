package com.planepeep.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.planepeep.backend.model.User;
import com.planepeep.backend.repository.UserRepository;
import com.planepeep.backend.security.JwtService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Unit tests for auth endpoints.
 *
 * <p>These tests use MockMvc with a standalone AccountController instance.
 * The UserRepository and JwtService are mocked so controller behavior can be
 * tested without starting a full Spring context or connecting to the database.
 *
 * <p>Repository behavior is stubbed with Mockito:
 * <ul>
 *   <li>findByUsername(...) -> Optional.empty() or Optional.of(user)</li>
 *   <li>save(...) -> returns a user with an assigned userId</li>
 * </ul>
 *
 * <p>JWT behavior is stubbed with Mockito:
 * <ul>
 *   <li>generateToken(...) -> returns a fixed mock token</li>
 *   <li>isTokenValid(...) -> true/false depending on test case</li>
 *   <li>extractUserId(...) -> returns the mocked userId</li>
 *   <li>extractUsername(...) -> returns the mocked username (login only; /me uses DB username)</li>
 *   <li>findById(...) -> used by GET /api/auth/me after JWT validation</li>
 * </ul>
 *
 * <p>This allows validation of:
 * <ul>
 *   <li>successful registration (201, no JWT)</li>
 *   <li>duplicate username (409)</li>
 *   <li>invalid registration input (400)</li>
 *   <li>authentication success/failure (200 / 401)</li>
 *   <li>JWT token returned on successful login</li>
 *   <li>session restore via GET /api/auth/me</li>
 * </ul>
 */
class AccountControllerTest {

    private MockMvc mockMvc;
    private UserRepository userRepository;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        jwtService = mock(JwtService.class);

        BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        AccountController controller = new AccountController(
            userRepository,
            passwordEncoder,
            jwtService
        );

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    // -------------------------------------------------------------------------
    // Register
    // -------------------------------------------------------------------------

    @Test
    void register_success_returns201Created_omitTokenInJson() throws Exception {
        when(userRepository.findByUsername("JACK")).thenReturn(Optional.empty());

        User saved = new User();
        saved.setUserId(1L);
        saved.setUsername("JACK");
        saved.setPasswordHash("encoded-password");

        when(userRepository.save(any(User.class))).thenReturn(saved);

        String body = """
            {
                "username": "JACK",
                "password": "123456"
            }
            """;

        mockMvc
            .perform(
                post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body)
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.username").value("JACK"))
            .andExpect(jsonPath("$.userId").value(1))
            .andExpect(jsonPath("$.token").doesNotExist());
        // Verify that the JWT service was not called to generate a token - only on login
        verify(jwtService, never()).generateToken(any(), any());
    }

    @Test
    void register_duplicateUsername_returns409Conflict() throws Exception {
        User existing = new User();
        existing.setUsername("JACK");

        when(userRepository.findByUsername("JACK")).thenReturn(Optional.of(existing));

        String body = """
            {
                "username": "JACK",
                "password": "123456"
            }
            """;

        mockMvc
            .perform(
                post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body)
            )
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("username already exists"));
    }

    @Test
    void register_missingFields_returns400BadRequest() throws Exception {
        String body = """
            {
                "username": "JACK",
                "password": ""
            }
            """;

        mockMvc
            .perform(
                post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body)
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("username and password are required"));
    }

    @Test
    void register_shortPassword_returns400BadRequest() throws Exception {
        String body = """
            {
                "username": "JACK",
                "password": "123"
            }
            """;

        mockMvc
            .perform(
                post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body)
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("password must be at least 6 characters"));
    }

    // -------------------------------------------------------------------------
    // Login
    // -------------------------------------------------------------------------

    @Test
    void login_success_returns200Ok_andToken() throws Exception {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        User user = new User();
        user.setUserId(1L);
        user.setUsername("JACK");
        user.setPasswordHash(encoder.encode("123456"));

        when(userRepository.findByUsername("JACK")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(1L, "JACK")).thenReturn("mock-jwt-token");

        String body = """
            {
                "username": "JACK",
                "password": "123456"
            }
            """;

        mockMvc
            .perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("JACK"))
            .andExpect(jsonPath("$.userId").value(1))
            .andExpect(jsonPath("$.token").value("mock-jwt-token"));
    }

    @Test
    void login_wrongPassword_returns401Unauthorized() throws Exception {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        User user = new User();
        user.setUsername("JACK");
        user.setPasswordHash(encoder.encode("correct-password"));

        when(userRepository.findByUsername("JACK")).thenReturn(Optional.of(user));

        String body = """
            {
                "username": "JACK",
                "password": "wrong-password"
            }
            """;

        mockMvc
            .perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("invalid credentials"));
    }

    @Test
    void login_userNotFound_returns401Unauthorized() throws Exception {
        when(userRepository.findByUsername("JACK")).thenReturn(Optional.empty());

        String body = """
            {
                "username": "JACK",
                "password": "123456"
            }
            """;

        mockMvc
            .perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("invalid credentials"));
    }

    @Test
    void login_missingFields_returns400BadRequest() throws Exception {
        String body = """
            {
                "username": "JACK",
                "password": ""
            }
            """;

        mockMvc
            .perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("username and password are required"));
    }

    // -------------------------------------------------------------------------
    // /me
    // -------------------------------------------------------------------------

    @Test
    void me_success_returns200Ok() throws Exception {
        String token = "mock-jwt-token";

        when(jwtService.isTokenValid(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn(1L);

        User persisted = new User();
        persisted.setUserId(1L);
        persisted.setUsername("JACK");
        when(userRepository.findById(1L)).thenReturn(Optional.of(persisted));

        mockMvc
            .perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value(token))
            .andExpect(jsonPath("$.userId").value(1))
            .andExpect(jsonPath("$.username").value("JACK"));
    }

    @Test
    void me_validTokenButUserMissing_returns401Unauthorized() throws Exception {
        String token = "orphan-jwt";

        when(jwtService.isTokenValid(token)).thenReturn(true);
        when(jwtService.extractUserId(token)).thenReturn(99L);
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        mockMvc
            .perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("invalid token"));
    }

    @Test
    void me_missingAuthorizationHeader_returns401Unauthorized() throws Exception {
        mockMvc
            .perform(get("/api/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("missing or invalid authorization header"));
    }

    @Test
    void me_invalidAuthorizationHeader_returns401Unauthorized() throws Exception {
        mockMvc
            .perform(get("/api/auth/me").header("Authorization", "Invalid token"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("missing or invalid authorization header"));
    }

    @Test
    void me_invalidToken_returns401Unauthorized() throws Exception {
        String token = "bad-token";

        when(jwtService.isTokenValid(token)).thenReturn(false);

        mockMvc
            .perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("invalid token"));
    }
}
