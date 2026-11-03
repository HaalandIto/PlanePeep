package com.planepeep.backend.controller;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.planepeep.backend.model.User;
import com.planepeep.backend.repository.UserRepository;
import com.planepeep.backend.security.JwtService;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authentication endpoints for account registration, login, and session restore.
 *
 * <p>This controller stores users in the database and uses BCrypt
 * to hash passwords before storage. Login requests validate the provided
 * username and password against stored account data.
 *
 * <p>JWT behavior:
 * <ul>
 *   <li>Register creates the account and returns {@link AuthResponse} JSON with {@code userId} and {@code username} only (no {@code token} property)</li>
 *   <li>Login returns {@link AuthResponse} with a JWT token</li>
 *   <li>Me returns {@link AuthResponse} when the bearer token is valid and the user still exists in the database</li>
 * </ul>
 *
 * <p>After Signing Up, frontend immediately calls {@code POST /api/auth/login} to get a JWT token.
 */
@RestController
@RequestMapping("/api/auth")
public class AccountController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Constructs the account controller with required dependencies.
     *
     * @param userRepository repository used to query and persist users
     * @param passwordEncoder encoder used to hash and verify passwords
     * @param jwtService service used to generate and validate JWT tokens
     */
    public AccountController(
        UserRepository userRepository,
        BCryptPasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /**
     * Registers a new user account.
     *
     * <p>Required fields:
     * <ul>
     *   <li>username</li>
     *   <li>password</li>
     * </ul>
     *
     * <p>Returns:
     * <ul>
     *   <li>201 Created if the account is successfully created</li>
     *   <li>400 Bad Request if required fields are missing or invalid</li>
     *   <li>409 Conflict if the username already exists</li>
     * </ul>
     *
     * @param req registration request containing username and password
     * @return {@link AuthResponse} with user id and username (JWT {@code token} omitted from JSON), or an error
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        String username = safeTrim(req.username);
        String password = safeTrim(req.password);

        if (isBlank(username) || isBlank(password)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                ErrorResponse.of("username and password are required")
            );
        }

        if (password.length() < 6) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                ErrorResponse.of("password must be at least 6 characters")
            );
        }

        Optional<User> existingByUsername = userRepository.findByUsername(username);
        if (existingByUsername.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                ErrorResponse.of("username already exists")
            );
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));

        User savedUser = userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(
            AuthResponse.withoutToken(savedUser.getUserId(), savedUser.getUsername())
        );
    }

    /**
     * Authenticates an existing user and returns a JWT token on success.
     *
     * <p>Required fields:
     * <ul>
     *   <li>username</li>
     *   <li>password</li>
     * </ul>
     *
     * <p>Returns:
     * <ul>
     *   <li>200 OK if the credentials are valid</li>
     *   <li>400 Bad Request if required fields are missing</li>
     *   <li>401 Unauthorized if the credentials are invalid</li>
     * </ul>
     *
     * @param req login request containing username and password
     * @return authenticated user info plus JWT token, or an error response
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        String username = safeTrim(req.username);
        String password = safeTrim(req.password);

        if (isBlank(username) || isBlank(password)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                ErrorResponse.of("username and password are required")
            );
        }

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ErrorResponse.of("invalid credentials")
            );
        }

        User user = userOpt.get();

        if (
            user.getPasswordHash() == null ||
            !passwordEncoder.matches(password, user.getPasswordHash())
        ) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ErrorResponse.of("invalid credentials")
            );
        }

        String token = jwtService.generateToken(user.getUserId(), user.getUsername());

        return ResponseEntity.ok(AuthResponse.of(user.getUserId(), user.getUsername(), token));
    }

    /**
     * Restores the authenticated user's profile from a JWT token.
     *
     * <p>The frontend should call this endpoint when restoring a session
     * from local storage after refresh.
     *
     * <p>Expected header:
     * <pre>
     * Authorization: Bearer &lt;jwt-token&gt;
     * </pre>
     *
     * <p>Returns:
     * <ul>
     *   <li>200 OK if the token is valid and a {@link User} row exists for the JWT {@code userId}</li>
     *   <li>401 Unauthorized if the token is missing, invalid, or the user no longer exists (e.g. DB recreated)</li>
     * </ul>
     *
     * @param authHeader Authorization header containing a Bearer token
     * @return authenticated user profile containing token, username, and userId
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(
        @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ErrorResponse.of("missing or invalid authorization header")
            );
        }

        String token = authHeader.substring(7).trim();
        if (token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ErrorResponse.of("missing or invalid authorization header")
            );
        }

        if (!jwtService.isTokenValid(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ErrorResponse.of("invalid token")
            );
        }

        Long userId = jwtService.extractUserId(token);
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                ErrorResponse.of("invalid token")
            );
        }

        User user = userOpt.get();
        return ResponseEntity.ok(AuthResponse.of(user.getUserId(), user.getUsername(), token));
    }

    /**
     * Request body for registration.
     *
     * <p>Frontend registration should send username and password.
     */
    public static class RegisterRequest {

        public String username;
        public String password;
    }

    /**
     * Request body for login.
     *
     * <p>Frontend login should send username and password.
     */
    public static class LoginRequest {

        public String username;
        public String password;
    }

    /**
     * Authentication payload for register (no {@code token} in JSON), login, and /me.
     */
    public static class AuthResponse {

        public Long userId;
        public String username;

        @JsonInclude(JsonInclude.Include.NON_NULL)
        public String token;

        /**
         * Response for successful registration: in-memory token is null so Jackson omits the property.
         */
        public static AuthResponse withoutToken(Long userId, String username) {
            return of(userId, username, null);
        }

        public static AuthResponse of(Long userId, String username, String token) {
            AuthResponse response = new AuthResponse();
            response.userId = userId;
            response.username = username;
            response.token = token;
            return response;
        }
    }

    /**
     * Standard error response for failed authentication requests.
     */
    public static class ErrorResponse {

        public String error;

        public static ErrorResponse of(String message) {
            ErrorResponse response = new ErrorResponse();
            response.error = message;
            return response;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static String safeTrim(String value) {
        return value == null ? null : value.trim();
    }
}
