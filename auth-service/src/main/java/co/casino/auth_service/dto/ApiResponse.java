package co.casino.auth_service.dto;

public record ApiResponse<T>(
        String message,
        T data
) {
}
