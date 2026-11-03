# Research Report

## Flight API Technologies

### Summary of Work

<!--One paragraph summary of the research being performed-->

After careful consideration through research about the upsides and downsides of effort to implement, cost of use, and practicality, I was able to come to the decision that we should use the OpenSky API in our project.

### Motivation

<!--Explain why you felt the need to perform this research-->

Something that has been a blocker for our progress so far is uncertainty about a data source and the unavailability of endpoints on our backend to design around because of that uncertainty. It is my responsibility to make this decision, so I wanted to educate myself about it beforehand. I also needed to know how we would actually use that data in the application, and what libraries that would take.

### Time Spent

<!--Explain how your time was spent-->

Most of the time was spent reviewing documentation about the APIs available and the frameworks/tools that would enable their use. Choosing an API took about 20 minutes. The remaining time (~1 hour) was spent researching about wrappers, caching libraries, and integration with the web framework.

### Results

<!--Explain what you learned/produced/etc. This section should explain the important things you learned so that it can serve as an easy reference for yourself and others who could benefit from reviewing this topic. Include your sources as footnotes. Make sure you include the footnotes where appropriate e.g [^1]-->

After reviewing the comparisons on the scale and cost-benefit of using a smaller community API like OpenSky, I was able to select OpenSky over FlightAware. For instance, this reddit thread (https://www.reddit.com/r/ADSB/comments/1lwikml/comment/n67h3qo/). The biggest consideration here is that FlightAware costs money, though it has a small free tier, and that costs can add up quick even in testing.

Knowing we will use OpenSky, we need to figure out how we will use it. For instance, do we cache all data received from OpenSky indefinitely? Do we cache it in memory (Caffeine) or persist it (Redis)? I found some advice about the caching in one article, which suggested a project like ours should start simple and with an easy to manage library like Caffeine.[^1] I decided that we should start with Caffeine to implement caching of OpenSky data between requests limited by the rate limits. We may use Redis at a later time to implement the mapping between icao24 code and N-number, which is not information provided directly by OpenSky.[^7] See below for information about provided data.

Another consideration is that OpenSky comes with a lightweight Java wrapper, which is nice, but how do we integrate that and do we need it? The nice thing about the wrapper is that it comes with its own parsing layer, so it would eliminate the need to use something like `jackson-databind`.[^2] It also abstracts the web interface with their API, which removes control from us but may be nice for simplicity.[^3]

Next is the usefulness of the data. We are dealing with a mapping application, essentially, so geofencing our data is obviously important. Each data point that OpenSky provides comes with coordinates, and they even after an API endpoint that can look up aircraft in a geofenced range, though we may not use this feature if we are caching server side. I found a library called spatial4j that is useful for manipulating spatial data.[^5]

I needed to find out how OpenSky data is structured. They use a state vector system where each vector is represented as an array of data. Information on this can be found in their REST API docs.[^8] This is abstracted by the Java wrapper.

Another issue is how and when to retrieve OpenSky data. We could either run a scheduled task or run some check to decide whether to request the data whenever a front end request is received. After some research I found that spring boot scheduling can be done easily, and if we implement that functionality now we can always simplify it to only run on requests.[^6] The pro for this is that the data is always more readily available and that we don't have to wait for a chain of requests if the data is stale.

With these decisions about the API and tooling made, we can move forward with endpoints and the db schema.

### Sources

<!--list your sources and link them to a footnote with the source url-->

- Caffeine vs. Redis[^1]
- jackson-databind library[^2]
- opensky javadocs[^3]
- spring boot starter guide[^4]
- spatial4j library[^5]
- scheduling tasks with spring boot[^6]
- jedis (redis for java)[^7]
- opensky rest api docs[^8]

[^1]: https://dev.to/anish-anantharaman/in-memory-caching-with-caffeine-why-you-dont-always-need-redis-right-away-3992

[^2]: https://github.com/FasterXML/jackson-databind

[^3]: https://openskynetwork.github.io/opensky-api/javadoc/index.html

[^4]: https://spring.io/guides/gs/spring-boot

[^5]: https://github.com/locationtech/spatial4j

[^6]: https://spring.io/guides/gs/scheduling-tasks

[^7]: https://redis.io/docs/latest/develop/clients/jedis/

[^8]: https://openskynetwork.github.io/opensky-api/rest.html
