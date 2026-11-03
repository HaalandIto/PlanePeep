package com.planepeep.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Defines caching strategy for the application using Caffeine. Two caches are configured:
 * 1. List of all aircraft positions over CONUS, refreshed every 1 minute.
 * 2. Per-aircraft metadata (registration, model, typecode, owner), refreshed every 5 minutes.
 */
@Configuration
@EnableCaching
@EnableScheduling
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        cacheManager.setCaches(
            List.of(
                // All CONUS aircraft positions; refreshed once per minute
                new CaffeineCache(
                    "positions",
                    Caffeine.newBuilder().expireAfterWrite(1, TimeUnit.MINUTES).build()
                ),
                // Per-aircraft metadata; refreshed every 5 minutes
                new CaffeineCache(
                    "metadata",
                    Caffeine.newBuilder().expireAfterWrite(5, TimeUnit.MINUTES).build()
                )
            )
        );
        return cacheManager;
    }
}
