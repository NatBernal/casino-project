import asyncio
import logging
import py_eureka_client.eureka_client as eureka_client
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import Base, engine
from app.routes.admin_routes import router as admin_router
from app.kafka.producer import stop_producer
from app.kafka.consumer import start_consumer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ─────────────────────────────────────────────────
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    logger.info("Registering with Eureka...")
    await eureka_client.init_async(
        eureka_server=settings.eureka_server_url,
        app_name=settings.service_name,
        instance_port=settings.service_port,
        instance_host="admin-service",
    )

    logger.info("Starting Kafka consumer...")
    consumer_task = asyncio.create_task(start_consumer())

    yield

    # ── Shutdown ─────────────────────────────────────────────────
    consumer_task.cancel()
    await stop_producer()
    await eureka_client.stop_async()
    logger.info("admin-service shut down cleanly")


app = FastAPI(
    title="Admin Service",
    description="Panel de administración y reportes financieros — Casino Online",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)


@app.get("/health")
def health():
    return {"status": "UP", "service": settings.service_name}
