package co.casino.audit_service.dto;

public record AuditLogRequest(
        String userId,
        String action,
        String type,
        String details,
        String severity,
        String sourceService
) {
}
