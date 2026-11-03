# Research Report

## Favorites Persistence with Spring Boot + JPA

### Summary of Work

This research focuses on implementing persistent storage for user favorites in a Spring Boot backend using JPA and MySQL. The work includes designing a UserFavorite entity, creating REST API endpoints for CRUD operations, and ensuring that favorites are tied to authenticated users. The goal is to maintain user-specific favorite aircraft data across sessions.

### Motivation

The project initially lacked persistence for user favorites, meaning data would be lost after application restart. Since the system already uses a relational database for user management, it was necessary to extend this functionality to support persistent favorites. This ensures a consistent user experience and aligns with real-world application requirements.

### Time Spent

Approximately 60 minutes were spent reviewing Spring Boot JPA patterns and implementing the entity relationships. Another 30 minutes were used testing endpoints with curl and validating behavior such as duplicate prevention and user isolation.

### Results

Through this research and implementation:

- Learned how to use JPA to map a join table for persistent favorites
- Implemented REST endpoints for retrieving, creating, deleting, and updating favorites
- Ensured each user can only access and modify their own favorites
- Prevented duplicate favorites with a unique constraint
- Verified persistence across application restarts

### Sources

- Spring Data JPA Documentation[^1]
- Baeldung JPA Guide[^2]
- Spring Security Reference[^3]

[^1]: https://docs.spring.io/spring-data/jpa/docs/current/reference/html/

[^2]: https://www.baeldung.com/the-persistence-layer-with-spring-data-jpa

[^3]: https://docs.spring.io/spring-security/reference/
