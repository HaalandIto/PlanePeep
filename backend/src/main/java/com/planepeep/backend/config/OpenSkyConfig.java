package com.planepeep.backend.config;

import org.opensky.api.OpenSkyApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provides a shared OpenSkyApi client bean. Uses anonymous client, lower rate limits.
 *
 * https://github.com/openskynetwork/opensky-api
 */
@Configuration
public class OpenSkyConfig {

    @Bean
    public OpenSkyApi openSkyApi() {
        return new OpenSkyApi(null, null);
    }
}
