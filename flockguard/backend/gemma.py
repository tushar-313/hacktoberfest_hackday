"""Gemma 4 12B service — local AI inference via Ollama."""

import base64
import json
import re
from ollama import chat, ChatResponse, AsyncClient
from models import AnalysisResult, Observation, Severity, RiskLevel


SINGLE_IMAGE_PROMPT = """You are an agricultural visual analysis AI assistant. Analyze this poultry/livestock image and report ONLY what you can visibly observe.

CRITICAL RULES:
- Describe ONLY visible evidence in the image
- Do NOT diagnose any disease
- Do NOT invent observations not visible in the image
- Explicitly communicate uncertainty
- Be conservative if image quality is poor
- Distinguish observations from recommendations

Respond in STRICT JSON format (no markdown, no code fences):
{
  "summary": "Brief 1-2 sentence summary of visible situation",
  "observations": [
    {
      "title": "Short observation title",
      "description": "Detailed description of what is visible",
      "severity": "low|medium|high"
    }
  ],
  "risk_level": "LOW|MODERATE|HIGH|CRITICAL",
  "evidence": ["list", "of", "visible", "evidence", "points"],
  "recommended_action": "What the farmer should consider doing",
  "uncertainty": "Limitations of this visual-only assessment"
}"""

COMPARISON_PROMPT = """You are an agricultural visual analysis AI assistant. You are given TWO images of a poultry/livestock flock:
- Image 1: PREVIOUS/BASELINE image (earlier observation)
- Image 2: CURRENT image (most recent observation)

Compare the two images and report meaningful visible changes.

CRITICAL RULES:
- Describe ONLY visible differences between the two images
- Do NOT diagnose any disease
- Do NOT invent observations not visible in the images
- Explicitly communicate uncertainty
- Be conservative if image quality is poor
- Focus on changes in: bird distribution, activity levels, posture, clustering, visible health indicators

Respond in STRICT JSON format (no markdown, no code fences):
{
  "summary": "Brief 1-2 sentence summary of visible changes between images",
  "observations": [
    {
      "title": "Short observation title describing the change",
      "description": "Detailed description of the visible change",
      "severity": "low|medium|high"
    }
  ],
  "risk_level": "LOW|MODERATE|HIGH|CRITICAL",
  "evidence": ["list", "of", "visible", "changes", "detected"],
  "recommended_action": "What the farmer should consider doing based on changes",
  "uncertainty": "Limitations of this visual-only comparison"
}"""


import io
from PIL import Image


def _optimize_and_encode_image(image_bytes: bytes, max_dim: int = 768) -> str:
    """Resize image to max 768px and compress JPEG for dramatically faster Ollama Gemma vision encoding."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGB")
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception:
        return base64.b64encode(image_bytes).decode("utf-8")


def _parse_gemma_response(text: str) -> dict:
    """Parse Gemma's response, handling both clean JSON and messy output."""
    # Try direct JSON parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON from code fences
    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try finding any JSON object in the text
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    # Fallback: construct a result from the raw text
    return {
        "summary": text[:200] if len(text) > 200 else text,
        "observations": [
            {
                "title": "AI Analysis",
                "description": text[:500],
                "severity": "medium",
            }
        ],
        "risk_level": "MODERATE",
        "evidence": ["Visual analysis completed — see summary for details"],
        "recommended_action": "Review the AI observations and consult a veterinarian if concerns persist.",
        "uncertainty": "The AI response could not be fully structured. The raw analysis text has been preserved.",
    }


def _severity_from_str(s: str) -> Severity:
    """Convert severity string to enum, with fallback."""
    mapping = {"low": Severity.LOW, "medium": Severity.MEDIUM, "high": Severity.HIGH}
    return mapping.get(s.lower(), Severity.MEDIUM)


def _risk_from_str(s: str) -> RiskLevel:
    """Convert risk level string to enum, with fallback."""
    mapping = {
        "low": RiskLevel.LOW,
        "moderate": RiskLevel.MODERATE,
        "high": RiskLevel.HIGH,
        "critical": RiskLevel.CRITICAL,
    }
    return mapping.get(s.lower(), RiskLevel.MODERATE)


def _dict_to_result(data: dict, mode: str = "single") -> AnalysisResult:
    """Convert parsed dict into an AnalysisResult model."""
    observations = []
    for obs in data.get("observations", []):
        if isinstance(obs, dict):
            observations.append(
                Observation(
                    title=obs.get("title", "Observation"),
                    description=obs.get("description", ""),
                    severity=_severity_from_str(obs.get("severity", "medium")),
                )
            )

    return AnalysisResult(
        summary=data.get("summary", "Analysis complete."),
        observations=observations,
        risk_level=_risk_from_str(data.get("risk_level", "MODERATE")),
        evidence=data.get("evidence", []),
        recommended_action=data.get(
            "recommended_action",
            "Review observations and consult a veterinarian if concerns persist.",
        ),
        uncertainty=data.get(
            "uncertainty",
            "This AI system provides visual anomaly detection only. It does not provide veterinary diagnosis.",
        ),
        mode=mode,
    )


async def analyze_single_image(image_bytes: bytes) -> AnalysisResult:
    """Analyze a single flock image using Gemma 4 12B via Ollama."""
    b64 = _optimize_and_encode_image(image_bytes)

    client = AsyncClient()
    response = await client.chat(
        model="gemma4:12b",
        messages=[
            {
                "role": "user",
                "content": SINGLE_IMAGE_PROMPT,
                "images": [b64],
            }
        ],
    )

    parsed = _parse_gemma_response(response.message.content)
    return _dict_to_result(parsed, mode="single")


async def compare_images(
    previous_bytes: bytes, current_bytes: bytes
) -> AnalysisResult:
    """Compare two flock images using Gemma 4 12B via Ollama."""
    prev_b64 = _optimize_and_encode_image(previous_bytes)
    curr_b64 = _optimize_and_encode_image(current_bytes)

    client = AsyncClient()
    response = await client.chat(
        model="gemma4:12b",
        messages=[
            {
                "role": "user",
                "content": COMPARISON_PROMPT,
                "images": [prev_b64, curr_b64],
            }
        ],
    )

    parsed = _parse_gemma_response(response.message.content)
    return _dict_to_result(parsed, mode="comparison")


async def check_ollama_health() -> dict:
    """Check if Ollama is running and gemma4:12b is available."""
    try:
        from ollama import list as ollama_list

        models = ollama_list()
        model_names = [m.model for m in models.models] if models.models else []
        gemma_available = any("gemma4" in name for name in model_names)
        return {
            "ollama_running": True,
            "gemma4_available": gemma_available,
            "models": model_names,
        }
    except Exception as e:
        return {
            "ollama_running": False,
            "gemma4_available": False,
            "error": str(e),
        }
