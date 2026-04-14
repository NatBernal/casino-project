package co.casino.auth_service.repository;

import co.casino.auth_service.model.Session;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;
import java.util.List;

public interface SessionRepository extends MongoRepository<Session, String> {

    Optional<Session> findByToken(String token);
    
    Optional<Session> findByUserIdAndActive(String userId, boolean active);
    
    List<Session> findByUserId(String userId);
    
    List<Session> findByUserIdAndActive(String userId, boolean active, org.springframework.data.domain.Pageable pageable);
    
    void deleteByUserId(String userId);
}
