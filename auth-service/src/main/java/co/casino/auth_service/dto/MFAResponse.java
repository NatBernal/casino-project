package co.casino.auth_service.dto;

public record MFAResponse(
        String tempCode,
        String message
) {
}
