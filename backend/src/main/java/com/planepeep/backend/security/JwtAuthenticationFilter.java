package com.planepeep.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * JwtAuthenticationFilter
 *
 * This filter intercepts every incoming HTTP request and checks for a JWT token
 * in the Authorization header. If a valid token is found, it extracts user
 * information and sets the authentication in the Spring Security context.
 *
 * Responsibilities:
 * - Read Authorization header
 * - Validate JWT token
 * - Extract user identity
 * - Set authentication in SecurityContext
 *
 * Expected header format:
 * Authorization: Bearer <JWT_TOKEN>
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    /**
     * Core filter logic executed once per request.
     */
    @Override
    protected void doFilterInternal(
        @NotNull HttpServletRequest request,
        @NotNull HttpServletResponse response,
        @NotNull FilterChain filterChain
    ) throws ServletException, IOException {
        // 1. Get Authorization header
        final String authHeader = request.getHeader("Authorization");

        // 2. If header is missing or not Bearer, skip
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. Extract token
        final String token = authHeader.substring(7);

        try {
            // 4. Validate token
            if (jwtService.isTokenValid(token)) {
                // 5. Extract user info
                String username = jwtService.extractUsername(token);
                Long userId = jwtService.extractUserId(token);

                // 6. Create authentication object (no authorities for now)
                UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                        username,
                        null,
                        null // roles/authorities can be added later
                    );

                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // 7. Set authentication in context
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        } catch (Exception e) {
            // Invalid token -> do nothing, let request proceed as unauthenticated
        }

        // 8. Continue filter chain
        filterChain.doFilter(request, response);
    }
}
