package com.planepeep.backend.config;

import com.planepeep.backend.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security layer (before the request reaches MVC)
 *
 * Configures Spring Security for the backend application.
 *
 * Responsibilities:
 * - Disable CSRF for stateless REST API usage
 * - Use stateless session management for JWT authentication
 * - Allow public access to health and authentication endpoints
 * - Require authentication for protected endpoints
 * - Register the JWT authentication filter in the security filter chain
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * Constructor injection for JWT filter.
     *
     * @param jwtAuthenticationFilter filter that validates JWT tokens
     */
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    /**
     * Password encoder bean for hashing and verifying user passwords.
     *
     * @return BCrypt password encoder
     */
    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Main Spring Security filter chain configuration.
     *
     * Protected endpoints:
     * - /api/favorites/**
     *
     * @param http HttpSecurity builder
     * @return configured SecurityFilterChain
     * @throws Exception if configuration fails
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // allow Spring Security to delegate CORS preflight (OPTIONS) to the MVC CorsFilter
            .cors(Customizer.withDefaults())
            // REST API does not use server-side sessions or forms
            .csrf((csrf) -> csrf.disable())
            // Stateless session management for JWT usage
            .sessionManagement((session) ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            // Return 401 for unauthenticated requests instead of a login prompt
            .exceptionHandling((exceptions) ->
                exceptions.authenticationEntryPoint(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)
                )
            )
            // Endpoint authorization rules
            .authorizeHttpRequests((auth) ->
                auth
                    .requestMatchers("/api/health")
                    .permitAll()
                    .requestMatchers("/api/auth/register", "/api/auth/login")
                    .permitAll()
                    .requestMatchers("/api/favorites", "/api/favorites/**")
                    .authenticated()
                    .anyRequest()
                    .permitAll()
            )
            // Disable HTTP Basic so the API returns JSON-friendly status codes
            .httpBasic((httpBasic) -> httpBasic.disable())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
