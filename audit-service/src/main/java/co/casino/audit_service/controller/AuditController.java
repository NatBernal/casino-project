package co.casino.audit_service.controller;

import co.casino.audit_service.dto.AuditLogRequest;
import co.casino.audit_service.dto.GenerateReportRequest;
import co.casino.audit_service.model.AuditLog;
import co.casino.audit_service.model.AuditReport;
import co.casino.audit_service.service.AuditService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/logs")
    public ResponseEntity<List<AuditLog>> getLogs(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate
    ) {
        return ResponseEntity.ok(auditService.getLogs(userId, type, fromDate, toDate));
    }

    @PostMapping("/log")
    public ResponseEntity<AuditLog> createLog(@RequestBody AuditLogRequest request) {
        AuditLog created = auditService.createLog(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/reports")
    public ResponseEntity<List<AuditReport>> getReports() {
        return ResponseEntity.ok(auditService.getReports());
    }

    @PostMapping("/reports/generate")
    public ResponseEntity<AuditReport> generateReport(@RequestBody GenerateReportRequest request) {
        AuditReport report = auditService.generateReport(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(report);
    }
}
