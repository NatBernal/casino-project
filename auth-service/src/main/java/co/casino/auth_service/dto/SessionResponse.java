package co.casino.auth_service.dto;

import java.time.LocalDateTime;

public record SessionResponse(
        String token,
        LocalDateTime expiresAt,
        String userId
) {
}
