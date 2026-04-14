package co.casino.auth_service.dto;

import jakarta.validation.constraints.NotBlank;

public record MFAVerifyRequest(
        @NotBlank(message = "Temp code is required")
        String tempCode,
        
        @NotBlank(message = "MFA code is required")
        String mfaCode
) {
}
