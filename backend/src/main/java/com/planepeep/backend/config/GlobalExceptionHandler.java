package com.planepeep.backend.config;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

/**
 * This class handles global exceptions across the application.
 *
 * Any unhandled exception thrown in the controllers will be caught here. Allows a consistent error
 * response format.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleAny(Exception ex, WebRequest request) {
        String path = request.getDescription(false);
        // any error for the positions endpoint should return 200 with empty list so frontend can still render
        //TODO make the frontend more robust so we don't have to do this hacky check for the endpoint in the exception handler
        if (path != null && path.contains("aircraft/positions")) {
            return ResponseEntity.ok(List.of());
        }
        // for other endpoints, return 500 with error message
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            //TODO build a more robust error response object instead of just an error message string
            Map.of("error", ex.getMessage() != null ? ex.getMessage() : "Internal Server Error")
        );
    }
}
