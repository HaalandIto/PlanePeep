# the initial content of this file was borrowed from https://git.doit.wisc.edu/cdis/cs/courses/cs506/tutorials/gitlab3-springboot/-/blob/main/Dockerfile

# ---------- Stage 1: Base (Shared dependencies) ----------
FROM eclipse-temurin:21-jdk AS base
WORKDIR /app
RUN apt-get update && apt-get install -y dos2unix findutils bash && rm -rf /var/lib/apt/lists/*

# ---------- Stage 2: Development (For backend-dev) ----------
FROM base AS development
# We copy the wrapper early to allow for dependency caching
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY libs/* ./libs/

RUN echo "Checking for JAR file in libs directory..."
RUN [ -f ./libs/opensky-api-*.jar ] && echo "File found, proceeding" || (echo "File not found, stopping" && exit 1)

# Fix for Windows users
RUN apt-get update && apt-get install -y dos2unix

RUN dos2unix gradlew && chmod +x gradlew
# In dev, the source code is usually mounted via volumes, 
# but we copy it here so the image can stand alone if needed.
COPY src ./src

EXPOSE 8080
# No CMD here, Compose will override with script

# ---------- Stage 3: Build (Compiling the JAR) ----------
FROM development AS build

RUN ./gradlew clean bootJar --stacktrace

# ---------- Stage 4: Production (For backend) ----------
FROM eclipse-temurin:21-jre AS production

WORKDIR /app

RUN apt-get update && apt-get install -y dos2unix && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]