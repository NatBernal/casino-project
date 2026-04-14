package co.casino.audit_service.service;

import co.casino.audit_service.dto.AuditLogRequest;
import co.casino.audit_service.dto.GenerateReportRequest;
import co.casino.audit_service.model.AuditLog;
import co.casino.audit_service.model.AuditReport;
import co.casino.audit_service.repository.AuditLogRepository;
import co.casino.audit_service.repository.AuditReportRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final AuditReportRepository auditReportRepository;
    private final MongoTemplate mongoTemplate;

    public AuditService(
            AuditLogRepository auditLogRepository,
            AuditReportRepository auditReportRepository,
            MongoTemplate mongoTemplate
    ) {
        this.auditLogRepository = auditLogRepository;
        this.auditReportRepository = auditReportRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public AuditLog createLog(AuditLogRequest request) {
        AuditLog log = new AuditLog();
        log.setUserId(request.userId());
        log.setAction(request.action());
        log.setType(request.type());
        log.setDetails(request.details());
        log.setSeverity(request.severity() == null || request.severity().isBlank() ? "INFO" : request.severity());
        log.setSourceService(request.sourceService() == null || request.sourceService().isBlank() ? "unknown" : request.sourceService());
        log.setCreatedAt(LocalDateTime.now());
        return auditLogRepository.save(log);
    }

    public List<AuditLog> getLogs(String userId, String type, LocalDateTime fromDate, LocalDateTime toDate) {
        Query query = new Query().with(Sort.by(Sort.Direction.DESC, "createdAt"));

        if (userId != null && !userId.isBlank()) {
            query.addCriteria(Criteria.where("userId").is(userId));
        }
        if (type != null && !type.isBlank()) {
            query.addCriteria(Criteria.where("type").is(type));
        }
        if (fromDate != null || toDate != null) {
            Criteria dateCriteria = Criteria.where("createdAt");
            if (fromDate != null) {
                dateCriteria = dateCriteria.gte(fromDate);
            }
            if (toDate != null) {
                dateCriteria = dateCriteria.lte(toDate);
            }
            query.addCriteria(dateCriteria);
        }

        return mongoTemplate.find(query, AuditLog.class);
    }

    public List<AuditReport> getReports() {
        Query query = new Query().with(Sort.by(Sort.Direction.DESC, "generatedAt"));
        return mongoTemplate.find(query, AuditReport.class);
    }

    public AuditReport generateReport(GenerateReportRequest request) {
        LocalDateTime from = request.fromDate() == null ? LocalDateTime.now().minusDays(7) : request.fromDate();
        LocalDateTime to = request.toDate() == null ? LocalDateTime.now() : request.toDate();

        List<AuditLog> logs = getLogs(null, null, from, to);
        Map<String, Long> logsByType = logs.stream()
                .map(AuditLog::getType)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(type -> type, Collectors.counting()));

        AuditReport report = new AuditReport();
        report.setTitle(request.title() == null || request.title().isBlank() ? "Audit Report" : request.title());
        report.setGeneratedBy(request.generatedBy() == null || request.generatedBy().isBlank() ? "system" : request.generatedBy());
        report.setFromDate(from);
        report.setToDate(to);
        report.setTotalLogs(logs.size());
        report.setLogsByType(logsByType);
        report.setGeneratedAt(LocalDateTime.now());

        return auditReportRepository.save(report);
    }
}
