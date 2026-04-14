package co.casino.audit_service.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "audit_reports")
@Data
public class AuditReport {

    @Id
    private String id;

    private String title;
    private String generatedBy;
    private LocalDateTime fromDate;
    private LocalDateTime toDate;
    private long totalLogs;
    private Map<String, Long> logsByType;
    private LocalDateTime generatedAt;
}
