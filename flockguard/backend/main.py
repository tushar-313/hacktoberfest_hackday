"""FlockGuard — FastAPI Backend."""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import Alert, AlertCreate, AlertUpdate, AlertStatus
from gemma import analyze_single_image, compare_images, check_ollama_health

app = FastAPI(title="FlockGuard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory alert store for MVP
alerts_db: dict[str, Alert] = {}


@app.get("/health")
async def health_check():
    """Health check endpoint including Ollama/Gemma status."""
    ollama_status = await check_ollama_health()
    return {
        "status": "ok",
        "service": "FlockGuard API",
        "ai": ollama_status,
    }


@app.post("/analyze")
async def analyze_image(image: UploadFile = File(...)):
    """Analyze a single flock image using Gemma 4 12B."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 20MB)")

    try:
        result = await analyze_single_image(image_bytes)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/compare")
async def compare_flock_images(
    previous: UploadFile = File(...),
    current: UploadFile = File(...),
):
    """Compare previous and current flock images using Gemma 4 12B."""
    for f in [previous, current]:
        if not f.content_type or not f.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Both files must be images")

    prev_bytes = await previous.read()
    curr_bytes = await current.read()

    for b in [prev_bytes, curr_bytes]:
        if len(b) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large (max 20MB)")

    try:
        result = await compare_images(prev_bytes, curr_bytes)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@app.post("/alerts")
async def create_alert(alert_data: AlertCreate):
    """Create a new veterinary alert."""
    alert = Alert(**alert_data.model_dump())
    alerts_db[alert.id] = alert
    return alert.model_dump()


@app.get("/alerts")
async def get_alerts():
    """Get all alerts."""
    return [a.model_dump() for a in sorted(alerts_db.values(), key=lambda x: x.created_at, reverse=True)]


@app.patch("/alerts/{alert_id}")
async def update_alert(alert_id: str, update: AlertUpdate):
    """Update alert status (e.g., vet dispatched)."""
    if alert_id not in alerts_db:
        raise HTTPException(status_code=404, detail="Alert not found")

    alerts_db[alert_id].status = update.status
    return alerts_db[alert_id].model_dump()
