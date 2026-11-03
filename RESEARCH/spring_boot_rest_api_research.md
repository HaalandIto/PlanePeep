# Research Report

## Spring Boot REST API Development and Frontend Integration

### Summary of Work

I researched how to develop REST APIs using Spring Boot and how to connect a React frontend application to a Spring Boot backend. This included learning how to create REST controllers, define API endpoints, configure CORS to allow frontend access, and ensure the backend server can receive and respond to HTTP requests properly. I also studied how Spring Boot handles routing, JSON responses, and server configuration.

### Motivation

Our Plane Peep project uses a Spring Boot backend to provide REST API endpoints for the frontend React application. These endpoints will allow the frontend to search for flights, retrieve flight information, and manage user accounts and favorite flights. In order to implement these features, I needed to learn how to properly structure Spring Boot controllers, define endpoints, configure backend communication, and ensure the frontend could connect successfully to the backend server running on localhost.

### Time Spent

~30 minutes reading Spring Boot official documentation

~45 minutes watching Spring Boot REST API tutorial videos

~30 minutes researching REST controller structure and endpoint creation

~15 minutes researching CORS configuration for frontend-backend communication

Total research time: ~120 minutes

### Results

Spring Boot allows developers to easily create REST APIs using the `@RestController` annotation. This annotation tells Spring Boot that the class will handle HTTP requests and return responses.

A simple example controller:

```java
@RestController
public class HealthController {

    @GetMapping("/")
    public String healthCheck() {
        return "Backend is running";
    }

}

This creates an endpoint at:

http://localhost:8080/

When accessed, the server responds with a message confirming that the backend is running. This is useful for frontend health checks.

Spring Boot also allows dynamic parameters using @PathVariable:

@RestController
@RequestMapping("/flight")
public class FlightController {

    @GetMapping("/{id}")
    public String getFlight(@PathVariable String id) {
        return "Flight ID: " + id;
    }

}

This allows the frontend to request:

http://localhost:8080/flight/AA123

and receive a response.

Spring Boot automatically runs an embedded Tomcat server when started using:

./gradlew bootRun

By default, it runs on port 8080.

I also learned that frontend applications running on different ports (such as localhost:5173) require CORS configuration to allow communication. This can be done using:

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("*");
    }

}

This allows the React frontend to communicate with the Spring Boot backend.

This research allowed me to successfully initialize the Spring Boot backend, create REST controller structure, and begin implementing API endpoints for the Plane Peep project.

### Sources

- Spring Boot Official Documentation
  https://spring.io/projects/spring-boot

- Spring Guide: Building a RESTful Web Service
  https://spring.io/guides/gs/rest-service/

- Spring Boot REST Controller Tutorial (YouTube)
  https://www.youtube.com/watch?v=vtPkZShrvXQ

- Spring Boot CORS Configuration Guide
  https://spring.io/guides/gs/rest-service-cors/
```
