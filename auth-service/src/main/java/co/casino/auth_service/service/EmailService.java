package co.casino.auth_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String from;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendMfaCode(String to, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject("Casino Security Code (MFA)");
            message.setText("Your verification code is: " + code + "\n\nThis code expires in 5 minutes.");
            mailSender.send(message);
        } catch (MailException ex) {
            throw new IllegalStateException("Unable to send MFA code email: " + ex.getMessage(), ex);
        }
    }
}
