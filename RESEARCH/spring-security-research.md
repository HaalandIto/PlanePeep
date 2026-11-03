# Research Report

## Spring Boot Security and BCrypt Password Hashing

### Summary of Work

This research focused on how secure authentication is implemented in a Spring Boot backend using Spring Security and BCrypt password hashing. The goal was to understand how passwords should be stored securely and how login validation works when integrating the authentication system with a MySQL database. In addition, the repository pattern with Spring Data JPA was reviewed to understand how user data can be retrieved and managed when verifying login credentials.

### Motivation

While implementing the account creation and login endpoints for the backend system, it was necessary to ensure that user credentials were stored securely. Storing passwords in plain text is unsafe and creates serious security vulnerabilities. Because of this, research was conducted on how Spring Security manages password hashing and validation. Understanding how BCrypt works and how it integrates with Spring Boot and Spring Data JPA was important before implementing the authentication logic.

### Time Spent

Approximately 20 minutes were spent reviewing Spring Security documentation related to password encoding and authentication. Additional time was spent examining how Spring Data JPA repositories interact with a MySQL database when retrieving user records for authentication.

### Results

The research showed that Spring Security recommends using the `BCryptPasswordEncoder` class to hash user passwords before storing them in the database. BCrypt automatically generates a salt and performs multiple hashing rounds, which makes it resistant to brute-force attacks.

During account registration, the backend should call `encode()` on the password using `BCryptPasswordEncoder` before saving it in the database. During login, the system compares the raw password entered by the user with the stored hashed password using the `matches()` method.

The repository pattern using Spring Data JPA allows the authentication system to retrieve user records from the MySQL database. A `UserRepository` interface extending `JpaRepository` can be used to query users by username or email. This design keeps the authentication logic clean and separates data access from business logic.

This research helped clarify how secure password storage and validation should be implemented before developing the authentication endpoints in the backend system.

### Sources

- Spring Security Password Storage Documentation  
  https://docs.spring.io/spring-security/reference/features/authentication/password-storage.html

- BCryptPasswordEncoder API Documentation  
  https://docs.spring.io/spring-security/site/docs/current/api/org/springframework/security/crypto/bcrypt/BCryptPasswordEncoder.html

- Spring Data JPA Reference Documentation  
  https://docs.spring.io/spring-data/jpa/docs/current/reference/html/
