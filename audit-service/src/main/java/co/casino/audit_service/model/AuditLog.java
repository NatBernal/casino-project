package co.casino.audit_service.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "audit_logs")
@Data
public class AuditLog {

    @Id
    private String id;

    private String userId;
    private String action;
    private String type;
    private String details;
    private String severity;
    private String sourceService;
    private LocalDateTime createdAt;
}
