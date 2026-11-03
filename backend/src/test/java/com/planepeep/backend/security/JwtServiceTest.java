package com.planepeep.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link JwtService} token lifecycle (no Mockito: service is deterministic crypto).
 */
class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        jwtService.init();
    }

    @Test
    void generateToken_returnsNonEmptyString() {
        String token = jwtService.generateToken(42L, "alice");

        assertNotNull(token);
        assertTrue(token.length() > 20, "JWT compact form should be substantial");
    }

    @Test
    void generatedToken_isValid_andRoundTripsClaims() {
        String token = jwtService.generateToken(7L, "bob");

        assertTrue(jwtService.isTokenValid(token));
        assertEquals(7L, jwtService.extractUserId(token));
        assertEquals("bob", jwtService.extractUsername(token));
    }
}
