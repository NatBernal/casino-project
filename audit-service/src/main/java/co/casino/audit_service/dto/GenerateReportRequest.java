package co.casino.audit_service.dto;

import java.time.LocalDateTime;

public record GenerateReportRequest(
        String title,
        String generatedBy,
        LocalDateTime fromDate,
        LocalDateTime toDate
) {
}
