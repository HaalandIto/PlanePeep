# Research Report

## Docker Architecture Research

### Summary of Work

<!--One paragraph summary of the research being performed-->

I researched the application of Docker to our chosen tech stack, with Spring Boot for backend and React for frontend. I also researched how we can alter our architecture to be a better fit for containerization in Docker. I then applied this research to modify the Spring Boot 2 Docker files to meet our needs and to create a Dockerfile for the React frontend.

### Motivation

<!--Explain why you felt the need to perform this research-->

While I have used Docker previously, I have not used it with Spring Boot or to bundle React. I wanted to research how to apply Docker to our specific tech stack and to see if there were any architectural changes we needed to make for easy containerization and adding modules. This also helped me gain additional experience with Docker's more advanced features, such as multi-stage builds and health checks.

### Time Spent

<!--Explain how your time was spent-->

Most of the time was spent consulting with Gemini and the references it provided. (1.5 hours)

Other time was spent reviewing the tutorial files in the Spring Boot 2 tutorial repo. (0.5 hours)

The remainder of the time was spent iterating and testing the Dockerfile/docker-compose.yml files. (1 hours)

### Results

<!--Explain what you learned/produced/etc. This section should explain the important things you learned so that it can serve as an easy reference for yourself and others who could benefit from reviewing this topic. Include your sources as footnotes. Make sure you include the footnotes where appropriate e.g [^1]-->

I learned how to use multi-stage builds in Docker to build the React frontend and then serve it with Nginx.[^1] I also learned how to set up health checks for the Nginx container. For the Spring Boot backend, I reviewed the existing Dockerfile to ensure it would be compatible with our deployment needs. I also learned how to best modify the initial docker-compose.yml from Spring Boot 2 to orchestrate the frontend, backend, and database services together.

- Bind mounts in the dev profile are for hot reloading with bootRun
- The prod profile uses the CMD line in the Dockerfile to run the jar (no bind mounts because running on jar not source code), `command:` in compose overrides the Dockerfile's CMD[^3]
- `./bootJar` - builds the jar file that is executed in the prod container
- vs `./bootRun` - runs the app directly from the source code for use with hot reloading in dev[^4]

Some of the architectural changes I reached through consultation with Gemini's knowledge base and its references included:[^5]

- For the backend, we should ensure that the application can be configured entirely through environment variables so it can be deployed easily without changing the code
- For the frontend, I concluded that we should containerize the React app with Nginx to serve the static files, rather than using Spring static serving or Node, because this is apparently common practice for its simplicity and performance benefits[^2].
- Consolidate the properties files and use environment variables to configure wherever possible (e.g. db connection info in .env, but explicity use their values in application.properties so we know their source)
- "Containerize" configuration files by isolating them in their own container's directory so the structure becomes modular (e.g. .gitignore should only include files relevant to the container it is in)
- For the aircraft registration metadata loading, we should decouple the functionality into its own service that runs a Python script to pre-process the CSV and load it into the database (Spring isn't optimized for hundreds of thousands of rows of data processing, anyway)

I define "consulting" as evaluating the responses and references provided by Gemini and iterating on the questions I ask it to get the most useful information. Such consultation might include:

- "Convert the awk logic to a python script that..."
- "Evaluate the advantages of using Nginx vs. Node vs. Apache for..."
- "Evaluate in detail whether the StateVector class replaces the functionality of jackson-databind"
- "Provide the given class structure in the form of a mermaid diagram"
- "I need... ensure that... compatible with..."

I was also able to leverage Gemini to create a [Python script](../load_meta.py) that pre-processes the aircraft metadata CSV file from OpenSky and loads it into the MySQL database. It can be re-run every time we want to update the metadata.

### Sources

<!--list your sources and link them to a footnote with the source url-->
<!-- https://researchguides.library.wisc.edu/c.php?g=1334141&p=9825297 -->

- Multi State Builds[^1]
- Nginx vs. Apache in Modern Stacks[^2]
- Compose command vs. CMD[^3]
- bootRun[^4]

[^1]: [Multi State Builds](https://docs.docker.com/build/building/multi-stage/)

[^2]: [Nginx vs. Apache in Modern Stacks](https://www.bagful.net/role-of-nginx-vs-apache-in-modern-hosting-stacks/)

[^3]: [Compose command vs. CMD](https://docs.docker.com/reference/compose-file/services/#command)

[^4]: [bootRun](https://www.google.com/search?q=https://docs.spring.io/spring-boot/docs/current/gradle-plugin/reference/htmlsingle/%23running-your-application)

[^5]: Google (2025). Google Gemini 3 Thinking [Large language model]. https://gemini.google.com
