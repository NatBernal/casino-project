package co.casino.auth_service.controller;


import co.casino.auth_service.dto.*;
import co.casino.auth_service.model.Session;
import co.casino.auth_service.model.SessionMFA;
import co.casino.auth_service.model.User;
import co.casino.auth_service.repository.SessionMFARepository;
import co.casino.auth_service.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;
    
    @Autowired
    private SessionMFARepository sessionMFARepository;

    // REGISTER
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody AuthRequest request) {
        if (authService.existsByEmail(request.email())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse<>("Email already registered", null));
        }

        User newUser = new User();
        newUser.setEmail(request.email());
        newUser.setPassword(request.password());
        newUser.setRole(request.role() == null || request.role().isBlank() ? "USER" : request.role());

        User saved = authService.register(newUser);

        UserResponse responseUser = new UserResponse(saved.getId(), saved.getEmail(), saved.getRole());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>("User registered", responseUser));
    }

    // LOGIN - Inicia MFA
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<MFAResponse>> login(@Valid @RequestBody AuthRequest request, HttpServletRequest httpRequest) {

        Optional<User> loggedUser = authService.login(request.email(), request.password());

        if (loggedUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("Invalid credentials", null));
        }

        User user = loggedUser.get();
        
        // Crear sesión MFA
        String ipAddress = httpRequest.getRemoteAddr();
        SessionMFA sessionMFA = authService.createMFASession(user, ipAddress);
        
        // Responder con tempCode para que el frontend lo use en mfa/verify
        MFAResponse mfaResponse = new MFAResponse(sessionMFA.getTempCode(), "MFA code sent to your email");
        return ResponseEntity.ok(new ApiResponse<>("MFA required", mfaResponse));
    }

    // VERIFY MFA - Completa login y crea sesión
    @PostMapping("/mfa/verify")
    public ResponseEntity<ApiResponse<UserResponse>> verifyMFA(@Valid @RequestBody MFAVerifyRequest request, HttpServletRequest httpRequest) {
        
        // Verificar código MFA y obtener usuario
        Optional<User> user = authService.verifyMFAAndGetUser(request.tempCode(), request.mfaCode());
        
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("Invalid MFA code", null));
        }
        
        // Crear sesión activa
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");
        Session session = authService.createSession(user.get(), ipAddress, userAgent);
        
        UserResponse responseUser = new UserResponse(user.get().getId(), user.get().getEmail(), user.get().getRole());
        
        // Retornar respuesta personalizada con token
        return ResponseEntity.ok()
                .header("Authorization", "Bearer " + session.getToken())
                .body(new ApiResponse<>("Login successful. Session created.", responseUser));
    }

    // LOGOUT
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("No session token provided", null));
        }
        
        String token = authHeader.substring(7);
        
        boolean success = authService.logout(token);
        
        if (!success) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>("Invalid or expired session", null));
        }
        
        return ResponseEntity.ok(new ApiResponse<>("Logout successful", null));
    }

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("auth-service is up");
    }
    
    // DEBUG ONLY - Get MFA code (para testing sin email)
    @GetMapping("/mfa/code/{tempCode}")
    public ResponseEntity<?> getMFACode(@PathVariable String tempCode) {
        Optional<SessionMFA> mfa = sessionMFARepository.findByTempCode(tempCode);
        
        if (mfa.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("MFA session not found");
        }
        
        SessionMFA session = mfa.get();
        
        // Verificar expiración
        if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("MFA session expired");
        }
        
        // Devolver el código
        return ResponseEntity.ok(Map.of(
            "mfaCode", session.getMfaSecret(),
            "message", "MFA code for testing (development only)"
        ));
    }
}