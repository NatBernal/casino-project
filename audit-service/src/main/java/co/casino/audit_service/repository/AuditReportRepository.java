package co.casino.audit_service.repository;

import co.casino.audit_service.model.AuditReport;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuditReportRepository extends MongoRepository<AuditReport, String> {
}
