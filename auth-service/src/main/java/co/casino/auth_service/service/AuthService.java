package co.casino.auth_service.service;

import co.casino.auth_service.model.*;
import co.casino.auth_service.repository.UserRepository;
import co.casino.auth_service.repository.SessionRepository;
import co.casino.auth_service.repository.SessionMFARepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private SessionMFARepository sessionMFARepository;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private EmailService emailService;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration-ms:3600000}")
    private long jwtExpirationMs;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // ── REGISTER ──────────────────────────────────────────────────
    public User register(User user) {
        // Encriptar contraseña antes de guardar
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User saved = userRepository.save(user);

        // Publicar evento para que admin-service actualice su snapshot
        Map<String, Object> event = new HashMap<>();
        event.put("event_type", "USUARIO_REGISTRADO");
        event.put("usuario_id", saved.getId());
        event.put("nombre", saved.getEmail()); // se usa email como nombre hasta que User tenga nombre
        event.put("email", saved.getEmail());
        event.put("mfa_habilitado", false);
        event.put("timestamp", LocalDateTime.now().toString());
        kafkaTemplate.send("auth-events", event);

        return saved;
    }

    public boolean existsByEmail(String email) {
        return userRepository.findByEmail(email).isPresent();
    }

    // ── LOGIN ─────────────────────────────────────────────────────
    public Optional<User> login(String email, String password) {
        Optional<User> user = userRepository.findByEmail(email);

        // Comparar con BCrypt, no en texto plano
        if (user.isPresent() && passwordEncoder.matches(password, user.get().getPassword())) {
            return user;
        }

        return Optional.empty();
    }

    // ── CREATE MFA SESSION ────────────────────────────────────────
    public SessionMFA createMFASession(User user, String ipAddress) {
        sessionMFARepository.findByUserIdAndVerifiedFalse(user.getId())
                .ifPresent(sessionMFARepository::delete);

        SessionMFA sessionMFA = new SessionMFA();
        sessionMFA.setUserId(user.getId());
        sessionMFA.setEmail(user.getEmail());
        sessionMFA.setTempCode(UUID.randomUUID().toString());
        sessionMFA.setMfaSecret(generateMFASecret());
        sessionMFA.setCreatedAt(LocalDateTime.now());
        sessionMFA.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        sessionMFA.setAttempts(0);
        sessionMFA.setVerified(false);
        sessionMFA.setIpAddress(ipAddress);

        SessionMFA saved = sessionMFARepository.save(sessionMFA);
        emailService.sendMfaCode(saved.getEmail(), saved.getMfaSecret());
        return saved;
    }

    // ── VERIFY MFA ────────────────────────────────────────────────
    public Optional<User> verifyMFAAndGetUser(String tempCode, String mfaCode) {
        Optional<SessionMFA> sessionMFA = sessionMFARepository.findByTempCode(tempCode);

        if (sessionMFA.isEmpty()) return Optional.empty();

        SessionMFA mfa = sessionMFA.get();

        if (LocalDateTime.now().isAfter(mfa.getExpiresAt())) {
            sessionMFARepository.delete(mfa);
            return Optional.empty();
        }

        if (mfa.getAttempts() >= mfa.getMaxAttempts()) {
            sessionMFARepository.delete(mfa);
            return Optional.empty();
        }

        if (!mfa.getMfaSecret().equals(mfaCode)) {
            mfa.setAttempts(mfa.getAttempts() + 1);
            sessionMFARepository.save(mfa);
            return Optional.empty();
        }

        mfa.setVerified(true);
        sessionMFARepository.save(mfa);

        return userRepository.findById(mfa.getUserId());
    }

    // ── CREATE SESSION (genera JWT real) ──────────────────────────
    public Session createSession(User user, String ipAddress, String userAgent) {
        sessionRepository.findByUserIdAndActive(user.getId(), true)
                .ifPresent(s -> {
                    s.setActive(false);
                    sessionRepository.save(s);
                });

        // Generar JWT con userId y rol en el payload
        String jwt = buildJwt(user);

        Session session = new Session();
        session.setUserId(user.getId());
        session.setEmail(user.getEmail());
        session.setToken(jwt);
        session.setCreatedAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusHours(1));
        session.setActive(true);
        session.setIpAddress(ipAddress);
        session.setUserAgent(userAgent);

        Session saved = sessionRepository.save(session);

        // Notificar a audit-service
        Map<String, Object> event = new HashMap<>();
        event.put("event_type", "LOGIN");
        event.put("usuario_id", user.getId());
        event.put("email", user.getEmail());
        event.put("timestamp", LocalDateTime.now().toString());
        kafkaTemplate.send("auth-events", event);

        return saved;
    }

    // ── LOGOUT ────────────────────────────────────────────────────
    public boolean logout(String token) {
        Optional<Session> session = sessionRepository.findByToken(token);
        if (session.isEmpty()) return false;

        Session s = session.get();
        s.setActive(false);
        sessionRepository.save(s);

        Map<String, Object> event = new HashMap<>();
        event.put("event_type", "LOGOUT");
        event.put("usuario_id", s.getUserId());
        event.put("timestamp", LocalDateTime.now().toString());
        kafkaTemplate.send("auth-events", event);

        return true;
    }

    // ── VALIDATE SESSION ──────────────────────────────────────────
    public Optional<Session> validateSession(String token) {
        Optional<Session> session = sessionRepository.findByToken(token);
        if (session.isEmpty() || !session.get().isActive()) return Optional.empty();

        Session s = session.get();
        if (LocalDateTime.now().isAfter(s.getExpiresAt())) {
            s.setActive(false);
            sessionRepository.save(s);
            return Optional.empty();
        }

        return session;
    }

    // ── HELPERS ───────────────────────────────────────────────────
    private String generateMFASecret() {
        return String.format("%06d", (int) (Math.random() * 1_000_000));
    }

    private String buildJwt(User user) {
        Key key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .setSubject(user.getId())
                .claim("email", user.getEmail())
                .claim("rol", user.getRole())          // ← campo que leen wallet y admin
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }
}
