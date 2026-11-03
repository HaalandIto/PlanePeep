package com.planepeep.backend.security;

import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.planepeep.backend.controller.AccountController;
import com.planepeep.backend.model.User;
import com.planepeep.backend.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Confirms the login path issues a real JWT: non-null in JSON and accepted by {@link JwtService}.
 * Registration alone does not return a token; the product flow is register then login.
 */
class AccountLoginSecurityTokenTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private MockMvc mockMvc;
    private UserRepository userRepository;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        jwtService = new JwtService();
        jwtService.init();
        BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        AccountController controller = new AccountController(
            userRepository,
            passwordEncoder,
            jwtService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void login_returnsNonNullJwtThatJwtServiceAccepts() throws Exception {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        User user = new User();
        user.setUserId(1L);
        user.setUsername("JACK");
        user.setPasswordHash(encoder.encode("123456"));

        when(userRepository.findByUsername("JACK")).thenReturn(Optional.of(user));

        String body = """
            {
                "username": "JACK",
                "password": "123456"
            }
            """;

        MvcResult result = mockMvc
            .perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", notNullValue()))
            .andReturn();

        JsonNode root = OBJECT_MAPPER.readTree(result.getResponse().getContentAsString());
        String token = root.path("token").asText(null);

        Assertions.assertNotNull(token);
        Assertions.assertFalse(token.isEmpty());
        Assertions.assertTrue(jwtService.isTokenValid(token));
        Assertions.assertEquals(1L, jwtService.extractUserId(token));
        Assertions.assertEquals("JACK", jwtService.extractUsername(token));
    }
}
