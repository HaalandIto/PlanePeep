package com.planepeep.backend.config;

import com.planepeep.backend.model.User;
import com.planepeep.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class TestUserInitializer {

    @Bean
    public CommandLineRunner seedTestUser(
        UserRepository userRepository,
        BCryptPasswordEncoder passwordEncoder
    ) {
        return (args) -> {
            if (userRepository.findByUsername("testuser").isEmpty()) {
                User user = new User();
                user.setUsername("testuser");
                user.setPasswordHash(passwordEncoder.encode("testpass123"));
                userRepository.save(user);
            }
        };
    }
}
