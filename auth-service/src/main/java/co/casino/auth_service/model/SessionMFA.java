package co.casino.auth_service.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "sessions_mfa")
@Data
public class SessionMFA {

    @Id
    private String id;
    
    private String userId;
    
    private String email;
    
    private String tempCode;
    
    private String mfaSecret;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime expiresAt;
    
    private int attempts;
    
    private int maxAttempts = 3;
    
    private boolean verified;
    
    private String ipAddress;
}
