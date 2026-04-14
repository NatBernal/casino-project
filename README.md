# Casino Online — Arquitectura de Microservicios

Proyecto académico para la materia Software II. Sistema de casino online implementado con arquitectura de microservicios usando Spring Cloud Netflix Eureka, Kafka, Docker y tres lenguajes de programación distintos.

---

## Integrantes y responsabilidades

| Integrante | Lenguaje | Base de datos | Servicios |
|---|---|---|---|
| Mileth | Java / Spring Boot | MongoDB | `auth-service`, `audit-service` |
| Natalia | Python / FastAPI | MySQL | `wallet-service`, `admin-service` |
| Diego | Node.js / Express | Redis | `game-service` |

---

## Estructura del proyecto

```
proyecto-casino/
├── docker-compose.yml
├── README.md
│
├── init-scripts/
│   └── mysql/
│       └── 01_schema.sql              # Schema inicial de MySQL
│
├── auth-service/                      # Java · Spring Boot · MongoDB
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/
│       ├── java/co/casino/auth_service/
│       │   ├── AuthServiceApplication.java
│       │   ├── config/
│       │   │   ├── KafkaProducerConfig.java
│       │   │   └── SecurityConfig.java
│       │   ├── controller/
│       │   │   ├── AuthController.java
│       │   │   └── GlobalExceptionHandler.java
│       │   ├── dto/
│       │   │   ├── ApiResponse.java
│       │   │   ├── AuthRequest.java
│       │   │   ├── MFAResponse.java
│       │   │   ├── MFAVerifyRequest.java
│       │   │   ├── SessionResponse.java
│       │   │   └── UserResponse.java
│       │   ├── model/
│       │   │   ├── Session.java
│       │   │   ├── SessionMFA.java
│       │   │   └── User.java
│       │   ├── repository/
│       │   │   ├── SessionMFARepository.java
│       │   │   ├── SessionRepository.java
│       │   │   └── UserRepository.java
│       │   └── service/
│       │       └── AuthService.java
│       └── resources/
│           └── application.yml
│
├── audit-service/                     # ⏳ PENDIENTE — Mileth
│   └── ...
│
├── wallet-service/                    # Python · FastAPI · MySQL
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── db/
│       │   └── database.py
│       ├── models/
│       │   ├── wallet_models.py
│       │   └── schemas.py
│       ├── services/
│       │   ├── wallet_service.py
│       │   └── auth_middleware.py
│       └── routes/
│           └── wallet_routes.py
│
├── admin-service/                     # Python · FastAPI · MySQL
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── db/
│       │   └── database.py
│       ├── models/
│       │   ├── admin_models.py
│       │   └── schemas.py
│       ├── services/
│       │   ├── admin_service.py
│       │   └── auth_middleware.py
│       └── routes/
│           └── admin_routes.py
│
├── game-service/                      # Node.js · Express · Redis
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js                  # Entry point — conecta Redis, levanta HTTP, registra en Eureka
│       ├── app.js                     # Express app — rutas, middlewares, health checks
│       ├── config/
│       │   ├── redis.js               # Conexión ioredis con reconexión automática
│       │   └── eureka.js              # Registro en Eureka (best-effort, no bloquea el arranque)
│       ├── controllers/
│       │   └── game.controller.js     # Handlers HTTP: start, hit, stand, state, abandon, history
│       ├── middleware/
│       │   ├── auth.middleware.js     # Valida X-User-Id (gateway) o Bearer JWT (desarrollo)
│       │   └── error.middleware.js    # Manejador global de errores
│       ├── routes/
│       │   └── game.routes.js         # GET/POST /game/**  (todas protegidas por auth)
│       └── services/
│           ├── blackjack.service.js   # Lógica pura: mazo, puntos, bust, blackjack natural
│           ├── game.service.js        # Estado de partidas + operaciones Redis
│           ├── wallet.service.js      # Cliente HTTP para wallet-service
│           └── audit.service.js       # Cliente HTTP para audit-service (fire-and-forget)
│
└── frontend/                          # ⏳ PENDIENTE — Diego
    └── ...
```

---

## Requisitos previos

- Docker Desktop o Docker Engine + Docker Compose v2
- curl o Postman para pruebas
- 4 GB de RAM disponibles para la VM / máquina

> **Nota VirtualBox:** MongoDB 7.x requiere soporte AVX en el CPU. Si usas VirtualBox, usa `mongo:4.4` en el `docker-compose.yml` o habilita AVX con:
> ```bash
> VBoxManage setextradata "nombre-vm" VBoxInternal/CPUM/IsaExts/AVX 1
> VBoxManage setextradata "nombre-vm" VBoxInternal/CPUM/IsaExts/AVX2 1
> ```

---

## Cómo ejecutar

### Levantar todo el stack

```bash
cd proyecto-casino
docker compose up --build
```

### Levantar solo servicios específicos (desarrollo individual)

```bash
# Solo los servicios de Natalia + dependencias
docker compose up --build mysql eureka-server wallet-service admin-service

# Solo auth-service + sus dependencias
docker compose up --build mongodb kafka zookeeper eureka-server auth-service

# Solo game-service + sus dependencias
docker compose up --build redis eureka-server wallet-service game-service
```

### Detener y limpiar volúmenes

```bash
docker compose down -v
```

### Ver logs de un servicio

```bash
docker compose logs -f auth-service
docker compose logs -f wallet-service
docker compose logs -f game-service
```

---

## Servicios y puertos

| Servicio | Puerto | URL local |
|---|---|---|
| Eureka Dashboard | 8761 | http://localhost:8761 |
| auth-service | 8081 | http://localhost:8081 |
| wallet-service | 8082 | http://localhost:8082 |
| game-service | 8083 | http://localhost:8083 |
| audit-service | 8084 | ⏳ pendiente |
| admin-service | 8085 | http://localhost:8085 |
| frontend | 3000 | ⏳ pendiente |
| MySQL | 3306 | localhost:3306 |
| MongoDB | 27017 | localhost:27017 |
| Redis | 6379 | localhost:6379 |
| Kafka | 9092 | localhost:9092 |

---

## Endpoints y pruebas con curl

> Todos los endpoints excepto `/auth/**` requieren el header:
> `Authorization: Bearer <token>` obtenido al completar el login MFA.

---

### auth-service — `:8081`

#### 1. Verificar que el servicio está vivo
```bash
curl http://localhost:8081/auth/ping
```

#### 2. Registrar usuario
```bash
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@casino.co","password":"123456","role":"USER"}'
```
Respuesta esperada:
```json
{ "message": "User registered", "data": { "id": "...", "email": "usuario@casino.co", "role": "USER" } }
```

#### 3. Registrar administrador
```bash
curl -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@casino.co","password":"123456","role":"ADMIN"}'
```

#### 4. Login — inicia flujo MFA
```bash
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@casino.co","password":"123456"}'
```
Respuesta — guarda el `tempCode`:
```json
{ "message": "MFA required", "data": { "tempCode": "uuid-aqui", "message": "MFA code sent to your email" } }
```

#### 5. Obtener código MFA (solo desarrollo)
```bash
curl http://localhost:8081/auth/mfa/code/<tempCode>
```
Respuesta — guarda el `mfaCode`:
```json
{ "mfaCode": "482910", "message": "MFA code for testing (development only)" }
```

#### 6. Verificar MFA — obtiene el JWT
```bash
curl -X POST http://localhost:8081/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{"tempCode":"<tempCode>","mfaCode":"<mfaCode>"}' -v
```
El JWT viene en el header de respuesta: `Authorization: Bearer <token>`

#### 7. Logout
```bash
curl -X POST http://localhost:8081/auth/logout \
  -H "Authorization: Bearer <token>"
```

---

### wallet-service — `:8082`

> Reemplaza `<token>` por el JWT obtenido en el login y `<usuario_id>` por el id retornado en el registro.

#### Consultar saldo
```bash
curl http://localhost:8082/wallet/<usuario_id> \
  -H "Authorization: Bearer <token>"
```

#### Comprar créditos (depósito)
```bash
curl -X POST http://localhost:8082/wallet/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"usuario_id":"<usuario_id>","monto_usd":10.0}'
```
Respuesta — 1 USD = 1000 créditos:
```json
{ "transaccion_id": "...", "tipo": "DEPOSITO", "monto": 10.0, "monto_creditos": 10000.0, "estado": "COMPLETADA" }
```

#### Solicitar retiro
```bash
curl -X POST http://localhost:8082/wallet/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"usuario_id":"<usuario_id>","monto_creditos":5000.0,"cuenta_destino":"1234-5678-9012"}'
```

#### Ejecutar retiro
```bash
curl -X PUT http://localhost:8082/wallet/withdraw/<solicitud_id>/exec \
  -H "Authorization: Bearer <token>"
```

#### Historial de transacciones
```bash
curl http://localhost:8082/wallet/transactions/<usuario_id> \
  -H "Authorization: Bearer <token>"
```

#### Documentación interactiva (Swagger)
```
http://localhost:8082/docs
```

---

### admin-service — `:8085`

> Requiere token de un usuario con `"role": "ADMIN"`.

#### Listar todos los usuarios
```bash
curl http://localhost:8085/admin/users \
  -H "Authorization: Bearer <token-admin>"
```

#### Listar usuarios por estado
```bash
curl "http://localhost:8085/admin/users?estado=ACTIVO" \
  -H "Authorization: Bearer <token-admin>"
```

#### Ver detalle de un usuario
```bash
curl http://localhost:8085/admin/users/<usuario_id> \
  -H "Authorization: Bearer <token-admin>"
```

#### Suspender usuario
```bash
curl -X PUT http://localhost:8085/admin/users/<usuario_id>/suspend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-admin>" \
  -d '{"admin_id":"<admin_id>"}'
```

#### Activar usuario
```bash
curl -X PUT http://localhost:8085/admin/users/<usuario_id>/activate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-admin>" \
  -d '{"admin_id":"<admin_id>"}'
```

#### Generar reporte financiero
```bash
curl -X POST http://localhost:8085/admin/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-admin>" \
  -d '{"admin_id":"<admin_id>","tipo":"MENSUAL","periodo_inicio":"2026-04-01T00:00:00","periodo_fin":"2026-04-30T23:59:59"}'
```

#### Listar reportes
```bash
curl "http://localhost:8085/admin/reports?admin_id=<admin_id>" \
  -H "Authorization: Bearer <token-admin>"
```

#### Documentación interactiva (Swagger)
```
http://localhost:8085/docs
```

---

### game-service — `:8083`

> Todas las rutas requieren `Authorization: Bearer <token>`.
> El servicio implementa Blackjack. Primero debes tener créditos en el wallet.
>
> **Nota:** si `audit-service` no está disponible, el juego continúa normalmente — la auditoría es best-effort.

#### Verificar que el servicio está vivo
```bash
curl http://localhost:8083/health
```
Respuesta esperada:
```json
{ "status": "UP", "service": "game-service" }
```

#### Iniciar partida
Cobra la apuesta del wallet y reparte las cartas iniciales.
```bash
curl -X POST http://localhost:8083/game/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"apuesta": 100}'
```
Respuesta esperada:
```json
{
  "id": "<partidaId>",
  "estado": "ACTIVA",
  "manoJugador": {
    "cartas": [{"palo":"♠","valor":"A","puntos":11}, {"palo":"♥","valor":"7","puntos":7}],
    "puntos": 18
  },
  "manoDealer": {
    "cartas": [{"palo":"♦","valor":"K","puntos":10}, {"oculta": true}],
    "puntos": 10
  },
  "apuesta": 100,
  "pago": null,
  "creadoEn": "2026-04-14T10:00:00.000Z",
  "finalizadoEn": null
}
```
Estados posibles al finalizar: `BLACKJACK_JUGADOR`, `BLACKJACK_DEALER`, `JUGADOR_GANO`, `DEALER_GANO`, `EMPATE`, `JUGADOR_SE_PASO`, `DEALER_SE_PASO`, `ABANDONADA`.

#### Pedir carta (hit)
```bash
curl -X POST http://localhost:8083/game/<partidaId>/hit \
  -H "Authorization: Bearer <token>"
```

#### Plantarse (stand)
El dealer revela su carta oculta y roba hasta llegar a 17+. Se determina el ganador y se acredita el pago al wallet.
```bash
curl -X POST http://localhost:8083/game/<partidaId>/stand \
  -H "Authorization: Bearer <token>"
```

#### Consultar estado de una partida
```bash
curl http://localhost:8083/game/<partidaId>/state \
  -H "Authorization: Bearer <token>"
```

#### Abandonar partida
Termina la partida activa. El jugador pierde la apuesta.
```bash
curl -X POST http://localhost:8083/game/<partidaId>/abandon \
  -H "Authorization: Bearer <token>"
```

#### Ver historial de partidas
Devuelve las últimas 50 partidas del usuario.
```bash
curl http://localhost:8083/game/history/<userId> \
  -H "Authorization: Bearer <token>"
```
Respuesta esperada:
```json
{
  "userId": "<userId>",
  "partidas": [
    {
      "id": "<partidaId>",
      "estado": "JUGADOR_GANO",
      "apuesta": 100,
      "pago": 200,
      "puntosJugador": 20,
      "puntosDealer": 17,
      "creadoEn": "2026-04-14T10:00:00.000Z",
      "finalizadoEn": "2026-04-14T10:01:00.000Z"
    }
  ]
}
```

#### Tabla de pagos

| Resultado | Pago recibido |
|---|---|
| Blackjack natural (jugador) | apuesta × 2.5 |
| Jugador gana / dealer se pasa | apuesta × 2 |
| Empate | apuesta × 1 (devuelve la apuesta) |
| Jugador pierde / se pasa / abandona | 0 |

---

### audit-service — `:8084`

> ⏳ Pendiente de implementación por Mileth.
>
> Endpoints esperados:
> - `POST /audit/log` — registrar evento
> - `GET /audit/logs?userId=&tipo=` — consultar logs
> - `POST /audit/reports/generate` — generar reporte
> - `GET /audit/reports/{reporteId}` — obtener reporte

---

### frontend — `:3000`

> ⏳ Pendiente de implementación por Diego.

---

## Flujo completo de prueba

Script que ejecuta el flujo completo: registro → login MFA → depósito → partida de blackjack:

```bash
#!/bin/bash
BASE_AUTH="http://localhost:8081/auth"
BASE_WALLET="http://localhost:8082/wallet"
BASE_GAME="http://localhost:8083/game"

echo "=== 1. Registrar usuario ==="
USER_ID=$(curl -s -X POST $BASE_AUTH/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@casino.co","password":"123456","role":"USER"}' | jq -r '.data.id')
echo "Usuario ID: $USER_ID"

echo "=== 2. Login ==="
TEMP_CODE=$(curl -s -X POST $BASE_AUTH/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@casino.co","password":"123456"}' | jq -r '.data.tempCode')
echo "Temp code: $TEMP_CODE"

echo "=== 3. Obtener código MFA ==="
MFA_CODE=$(curl -s $BASE_AUTH/mfa/code/$TEMP_CODE | jq -r '.mfaCode')
echo "MFA code: $MFA_CODE"

echo "=== 4. Verificar MFA y obtener token ==="
TOKEN=$(curl -s -D - -X POST $BASE_AUTH/mfa/verify \
  -H "Content-Type: application/json" \
  -d "{\"tempCode\":\"$TEMP_CODE\",\"mfaCode\":\"$MFA_CODE\"}" \
  | grep -i "^authorization:" | awk '{print $2}' | tr -d '\r')
echo "Token: $TOKEN"

echo "=== 5. Depositar créditos ==="
curl -s -X POST $BASE_WALLET/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d "{\"usuario_id\":\"$USER_ID\",\"monto_usd\":10.0}" | jq

echo "=== 6. Consultar saldo ==="
curl -s $BASE_WALLET/$USER_ID -H "Authorization: $TOKEN" | jq

echo "=== 7. Iniciar partida (apuesta: 100 créditos) ==="
PARTIDA=$(curl -s -X POST $BASE_GAME/start \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{"apuesta":100}')
echo $PARTIDA | jq
PARTIDA_ID=$(echo $PARTIDA | jq -r '.id')

echo "=== 8. Pedir carta (hit) ==="
curl -s -X POST $BASE_GAME/$PARTIDA_ID/hit \
  -H "Authorization: $TOKEN" | jq

echo "=== 9. Plantarse (stand) ==="
curl -s -X POST $BASE_GAME/$PARTIDA_ID/stand \
  -H "Authorization: $TOKEN" | jq

echo "=== 10. Ver historial ==="
curl -s $BASE_GAME/history/$USER_ID \
  -H "Authorization: $TOKEN" | jq
```

Requiere `jq`: `sudo apt install jq`

---

## Variables de entorno clave

| Variable | Valor en Docker | Descripción |
|---|---|---|
| `JWT_SECRET` | `casino_jwt_super_secret_2025` | Compartido entre todos los servicios |
| `SPRING_DATA_MONGODB_URI` | `mongodb://casino_admin:casino_secret@mongodb:27017/casino_db?authSource=admin` | Conexión MongoDB |
| `DATABASE_URL` | `mysql+pymysql://casino_user:casino_pass@mysql:3306/casino_db` | Conexión MySQL |
| `KAFKA_BOOTSTRAP_SERVERS` | `kafka:9092` | Usado por auth-service, wallet-service, admin-service |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://eureka-server:8761/eureka/` | Registro de servicios (Java) |
| `EUREKA_SERVER_URL` | `http://eureka-server:8761/eureka/` | Registro de servicios (Python) |
| `EUREKA_HOST` / `EUREKA_PORT` | `eureka-server` / `8761` | Registro de servicios (Node.js) |
| `REDIS_HOST` / `REDIS_PASSWORD` | `redis` / `redis_secret` | Conexión Redis |

---

## Tecnologías utilizadas

- **Spring Boot 3.2** + Spring Cloud 2023 (Eureka Client, Kafka)
- **FastAPI** + SQLAlchemy + PyMySQL
- **Node.js** + Express + ioredis + eureka-js-client
- **Netflix Eureka** (service discovery)
- **Apache Kafka** + Zookeeper (mensajería — auth-service, wallet-service, admin-service)
- **MySQL 8** (wallet, admin)
- **MongoDB 4.4** (auth, audit)
- **Redis 7** (game — estado de partidas e historial)
- **Docker** + Docker Compose
