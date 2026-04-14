package co.casino.auth_service.repository;

import co.casino.auth_service.model.SessionMFA;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface SessionMFARepository extends MongoRepository<SessionMFA, String> {

    Optional<SessionMFA> findByTempCode(String tempCode);
    
    Optional<SessionMFA> findByUserIdAndVerifiedFalse(String userId);
    
    Optional<SessionMFA> findByUserId(String userId);
}
