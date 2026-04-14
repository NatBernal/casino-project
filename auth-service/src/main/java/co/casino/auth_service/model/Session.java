package co.casino.auth_service.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "sessions")
@Data
public class Session {

    @Id
    private String id;
    
    private String userId;
    
    private String email;
    
    private String token;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime expiresAt;
    
    private boolean active;
    
    private String ipAddress;
    
    private String userAgent;
}
