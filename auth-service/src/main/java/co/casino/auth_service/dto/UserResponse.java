package co.casino.auth_service.dto;

public record UserResponse(
        String id,
        String email,
        String role
) {
}
