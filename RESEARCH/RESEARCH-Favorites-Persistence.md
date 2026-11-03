# Research Report

## Spring Boot Favorites Persistence and Security Design

### Summary of Work

This research explored how to implement persistent user favorites in a Spring Boot backend while ensuring proper authentication, validation, and database design. The focus was on designing REST endpoints, linking favorites to authenticated users, and preventing duplicate entries using JPA and MySQL constraints.

### Motivation

The favorites feature requires storing user-specific aircraft selections that persist across sessions and devices. To implement this correctly, it was necessary to research best practices for user-scoped data storage, REST API design, and enforcing data integrity within a Spring Boot application.

### Time Spent

Approximately 1.5 hours were spent reviewing Spring Boot documentation, examining JPA entity relationships, and researching authentication-aware data filtering. Additional time was used comparing approaches for preventing duplicate records and validating request payloads.

### Results

The research resulted in the following design decisions:

- Use a dedicated `UserFavorite` entity linked to `User` with a many-to-one relationship
- Store aircraft identifiers using a simple string field (`externalItemId`)
- Enforce uniqueness with a database-level unique constraint on `(user_id, external_item_id)`
- Retrieve authenticated users via `SecurityContextHolder` to avoid trusting request body user IDs
- Implement REST endpoints under `/api/favorites` for CRUD operations
- Validate identifiers before persistence to prevent invalid entries
- Return appropriate HTTP status codes such as 400, 401, and 409 for error handling
- Use JPA repository queries scoped to the authenticated user to enforce access control

These findings ensured that favorites data remains secure, consistent, and user-specific while minimizing changes to the existing backend architecture.

### Sources

- Spring Security Authentication Context[^1]
- Spring Data JPA Relationships[^2]
- REST API Design Best Practices[^3]
- Preventing Duplicate Records in JPA[^4]

[^1]: https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html

[^2]: https://docs.spring.io/spring-data/jpa/docs/current/reference/html/

[^3]: https://restfulapi.net/rest-api-design-tutorial-with-example/

[^4]: https://www.baeldung.com/jpa-unique-constraints
