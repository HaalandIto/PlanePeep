# PlanePeep Backend

## Build

```bash
# Windows
.\gradlew.bat build

# macOS / Linux
./gradlew build
```

## Run

The default configuration expects MySQL at `localhost:8002`. To start **without MySQL** (uses H2 in-memory DB):

```bash
dev.sh
```

H2 console at http://localhost:8000/h2-console.

To use MySQL instead, ensure it is running with DB `planepeep-db` on port 8002, then run:

```bash
.\gradlew.bat bootRun   # Windows
./gradlew bootRun       # macOS / Linux
```

## Base URL

http://localhost:8000

## Endpoints

GET /api/health
POST /api/auth/register
POST /api/auth/login
GET /api/aircraft/positions?minLat=&maxLat=&minLon=&maxLon=
GET /api/aircraft/metadata/{icao24}
GET /api/favorites
POST /api/favorites
DELETE /api/favorites/{favoriteId}

Legacy-compatible aliases:

GET /api/account/{accountId}/favorite
POST /api/account/{accountId}/favorite
DELETE /api/account/{accountId}/favorite/{externalItemId}

## Getting Started

### Reference Documentation

For further reference, please consider the following sections:

- [Official Gradle documentation](https://docs.gradle.org)
- [Spring Boot Gradle Plugin Reference Guide](https://docs.spring.io/spring-boot/4.0.2/gradle-plugin)
- [Create an OCI image](https://docs.spring.io/spring-boot/4.0.2/gradle-plugin/packaging-oci-image.html)
- [Spring Data JPA](https://docs.spring.io/spring-boot/4.0.2/reference/data/sql.html#data.sql.jpa-and-spring-data)
- [Spring Web](https://docs.spring.io/spring-boot/4.0.2/reference/web/servlet.html)

### Guides

The following guides illustrate how to use some features concretely:

- [Accessing Data with JPA](https://spring.io/guides/gs/accessing-data-jpa/)
- [Building a RESTful Web Service](https://spring.io/guides/gs/rest-service/)
- [Serving Web Content with Spring MVC](https://spring.io/guides/gs/serving-web-content/)
- [Building REST services with Spring](https://spring.io/guides/tutorials/rest/)
- [Accessing data with MySQL](https://spring.io/guides/gs/accessing-data-mysql/)

### Additional Links

These additional references should also help you:

- [Gradle Build Scans – insights for your project's build](https://scans.gradle.com#gradle)
