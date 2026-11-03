package com.planepeep.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/**
 * JwtService
 *
 * Responsibility:
 * - Generate JWT tokens after successful authentication
 * - Extract information (username, userId) from token
 * - Validate token integrity and expiration
 *
 * Design Notes:
 * - Uses HMAC SHA key for signing
 * - Token contains:
 *      subject (username)
 *      claim: userId
 * - Stateless authentication (no session storage)
 */
@Service
public class JwtService {

    //  In production, move this to application.properties
    private final String SECRET = "very-very-long-secret-key-for-planepeep-jwt-authentication";

    private SecretKey signingKey;

    // Token expiration: 24 hours
    private final long EXPIRATION_TIME = 1000 * 60 * 60 * 24;

    @PostConstruct
    public void init() {
        signingKey = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generate JWT token
     */
    public String generateToken(Long userId, String username) {
        return Jwts.builder()
            .subject(username)
            .claim("userId", userId)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
            .signWith(signingKey)
            .compact();
    }

    /**
     * Extract username (subject)
     */
    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    /**
     * Extract userId from claims
     */
    public Long extractUserId(String token) {
        Object value = extractAllClaims(token).get("userId");
        return Long.valueOf(value.toString());
    }

    /**
     * Validate token (expiration + signature)
     */
    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Parse all claims from token
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
    }
}
