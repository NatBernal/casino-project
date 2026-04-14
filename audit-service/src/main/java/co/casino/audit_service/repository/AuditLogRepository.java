package co.casino.audit_service.repository;

import co.casino.audit_service.model.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
}
