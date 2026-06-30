"""
main.py  —  FastAPI backend for Repo Visualizer
GET /api/health               liveness check
GET /api/analyze?path=<dir>   full repo analysis → graph JSON
GET /api/explain?path=<f>&hash=<md5>  Gemini AI summary (cached)
GET /api/file?path=<f>        file content preview (first 300 lines)
"""
import os
from pathlib import Path
import aiofiles
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from analyzer import analyze_repository
from ai_service import get_file_explanation

load_dotenv()

app = FastAPI(title="Repo Visualizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "gemini_key_set": bool(os.environ.get("GEMINI_API_KEY"))}


@app.get("/api/analyze")
def analyze(path: str = Query(...)):
    try:
        return analyze_repository(path)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")


@app.get("/api/explain")
async def explain(
    path: str = Query(...),
    hash: str = Query(...),
):
    if not os.path.isfile(path):
        raise HTTPException(404, "File not found")
    try:
        async with aiofiles.open(path, "r", encoding="utf-8", errors="replace") as f:
            content = await f.read()
        return {"explanation": get_file_explanation(path, content, hash)}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/file")
async def file_content(path: str = Query(...)):
    if not os.path.isfile(path):
        raise HTTPException(404, "File not found")
    try:
        async with aiofiles.open(path, "r", encoding="utf-8", errors="replace") as f:
            content = await f.read()
        lines = content.splitlines()
        return {"content": "\n".join(lines[:300]), "total_lines": len(lines), "truncated": len(lines) > 300}
    except Exception as e:
        raise HTTPException(500, str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
