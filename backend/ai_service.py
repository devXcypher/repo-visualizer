"""
ai_service.py  —  Gemini 2.5 Flash (free tier) with local hash-based cache
Uses the current `google-genai` SDK (the old `google-generativeai` package
is deprecated and no longer receives updates).

Cache file: backend/ai_cache.json   Key: MD5 of file content
"""
import os, json
from pathlib import Path
from google import genai

CACHE_FILE = Path(__file__).parent / "ai_cache.json"
MODEL = "gemini-2.5-flash"   # fast + free-tier friendly


def _load():
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8")) if CACHE_FILE.exists() else {}
    except Exception:
        return {}

def _save(c):
    try:
        CACHE_FILE.write_text(json.dumps(c, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def get_file_explanation(file_path: str, file_content: str, file_hash: str) -> str:
    cache = _load()
    if file_hash in cache:
        return cache[file_hash]

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return "⚠️ GEMINI_API_KEY not set. Get a free key at https://aistudio.google.com/app/apikey and add it to backend/.env"

    snippet = file_content[:4000] + ("\n# ... [truncated]" if len(file_content) > 4000 else "")
    prompt = (
        f"You are a senior software engineer. Analyse this file and explain it in EXACTLY 3 sentences.\n"
        f"Sentence 1: What is the main purpose of this file?\n"
        f"Sentence 2: What key functions, classes, or logic does it contain?\n"
        f"Sentence 3: How does it interact with the rest of the codebase?\n"
        f"Plain English only. No bullets, no markdown, no headers.\n\n"
        f"File: {Path(file_path).name}\n\n```\n{snippet}\n```"
    )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model=MODEL, contents=prompt)
        explanation = (response.text or "").strip()
        if not explanation:
            return "⚠️ Gemini returned an empty response. Try again."
        cache[file_hash] = explanation
        _save(cache)
        return explanation
    except Exception as exc:
        err = str(exc)
        if "API_KEY_INVALID" in err or "401" in err or "PERMISSION_DENIED" in err:
            return "⚠️ Invalid Gemini API key. Check GEMINI_API_KEY in backend/.env"
        if "RESOURCE_EXHAUSTED" in err or "429" in err:
            return "⚠️ Free-tier rate limit hit. Wait a minute and try again."
        return f"⚠️ Gemini error: {err[:200]}"
