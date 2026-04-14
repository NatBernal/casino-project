from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "mysql+pymysql://casino_user:casino_pass@localhost:3306/casino_db"
    kafka_bootstrap_servers: str = "localhost:9092"
    eureka_server_url: str = "http://localhost:8761/eureka/"
    jwt_secret: str = "casino_jwt_super_secret_2025"
    jwt_algorithm: str = "HS256"
    service_port: int = 8085
    service_name: str = "admin-service"

    class Config:
        env_file = ".env"

settings = Settings()
