# Research Report

## Spring Boot Environment Setup and REST API Basics

### Summary of Work

I researched how to set up a Spring Boot backend development environment and how to create a simple REST API. I followed official Spring Boot documentation and tutorials to understand how Spring Boot applications are structured and how REST endpoints are implemented. This research will help me implement backend services for our Plane Peep project.

### Motivation

Our team project uses Spring Boot as the backend framework. Since I am responsible for backend development, I needed to understand how Spring Boot works, how to create REST APIs, and how to configure the environment properly.

### Time Spent

~30 minutes reviewing Spring Boot documentation  
~30 minutes following REST API tutorial  
~30 minutes setting up environment and testing

Total: ~90 minutes

### Results

Spring Boot simplifies backend development by providing built-in support for REST APIs and dependency management.

I learned how to create a simple REST endpoint:

```java
@RestController
public class HelloController {

    @GetMapping("/hello")
    public String hello() {
        return "Hello from Spring Boot";
    }
}
This allows the application to respond to HTTP requests.

I also learned how Spring Boot applications are structured and how controllers handle requests. This knowledge will help me implement backend APIs for our project.

Sources
https://spring.io/projects/spring-boot
https://spring.io/guides/gs/rest-service/
https://docs.spring.io/spring-boot/docs/current/reference/html/
```
