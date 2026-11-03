package com.planepeep.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Logs every request to console so we can see the traffic and debug more easily.
 *
 * Runs before Spring Security filters.
 */
@Component
@Order(-1)
public class RequestLoggingFilter extends OncePerRequestFilter {

    //TODO implement shouldNotFilter to skip request logging for production environment

    //TODO verify that this is logging every request
    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        filterChain.doFilter(request, response);
    }
}
