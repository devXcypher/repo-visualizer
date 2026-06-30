# 🔍 Repo Visualizer
**GDSC Open Projects Summer '26 — Problem Statement 3**

## What it does
Enter any local repo path → interactive dependency graph renders instantly.

| Feature | Detail |
|---|---|
| **Dependency graph** | React Flow canvas — drag nodes, zoom, pan |
| **Hidden relationships** | Auto-extracts Python `import`, JS/TS `import`/`require`, C/C++ `#include`, Java `import` |
| **LoC metrics** | Total / Code / Blank / Comment per file |
| **Complexity** | Function & class counts per file |
| **AI summaries** | Click node → "Analyze with Gemini AI" → 3-sentence plain-English summary |
| **Smart cache** | AI results cached by MD5 hash — same file never re-analyzed |
| **Code preview** | In-panel view of first 300 lines |

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| AI | Google Gemini 2.5 Flash via `google-genai` SDK **(free tier — 1,500 req/day)** |
| Frontend | React 18, Vite, `@xyflow/react` (React Flow v12) |
| Layout | `@dagrejs/dagre` (hierarchical LR) |
| Icons | `lucide-react` |

## Setup (5 minutes)

### 1. Backend
```bash
cd repo-visualizer/backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env → paste your free Gemini key from https://aistudio.google.com/app/apikey
# GEMINI_API_KEY=AIzaSy...

uvicorn main:app --reload --port 8000
```
Visit http://localhost:8000/api/health to confirm.

### 2. Frontend
```bash
cd repo-visualizer/frontend
npm install
npm run dev
```
Open **http://localhost:5173**

## Usage
1. Open http://localhost:5173
2. Enter the **absolute path** to any local repo, e.g. `/home/user/projects/my-app`
3. Click **Analyze** (or press Enter)
4. Click any node → side panel opens with metrics + AI summary + code preview

## Supported Languages
Python, JavaScript, TypeScript, C, C++, Java, Go, Rust, Ruby, PHP, Swift, Kotlin, C#, HTML, CSS, SCSS, JSON, YAML, Markdown, Shell, SQL

## API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/analyze?path=<dir>` | Analyse repo → graph JSON |
| GET | `/api/explain?path=<f>&hash=<md5>` | Gemini AI summary (cached) |
| GET | `/api/file?path=<f>` | File content preview |

## Project Guidelines Compliance
- ✅ Python + FastAPI backend
- ✅ React + React Flow frontend (draggable, zoomable, minimap)
- ✅ AI integration via Gemini API with local hash cache
- ✅ LoC + complexity metrics per node
- ✅ Daily commits for progress tracking
