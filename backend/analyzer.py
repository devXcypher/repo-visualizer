"""
analyzer.py  —  Repository Structure Analysis Engine
Traverses a local directory and returns a graph of files with:
  • Language detection
  • LoC (total / code / blank / comment)
  • Complexity (function & class counts)
  • Dependency edges (Python, JS/TS, C/C++, Java, Go, Rust)
"""

import os, re, hashlib
from pathlib import Path
from typing import Dict, List

SUPPORTED_EXTENSIONS = {
    ".py":"Python", ".js":"JavaScript", ".jsx":"JavaScript",
    ".ts":"TypeScript", ".tsx":"TypeScript",
    ".c":"C", ".cpp":"C++", ".cc":"C++", ".cxx":"C++",
    ".h":"C/C++ Header", ".hpp":"C++ Header", ".hxx":"C++ Header",
    ".java":"Java", ".go":"Go", ".rs":"Rust",
    ".rb":"Ruby", ".php":"PHP", ".swift":"Swift",
    ".kt":"Kotlin", ".cs":"C#",
    ".html":"HTML", ".css":"CSS", ".scss":"SCSS",
    ".json":"JSON", ".yaml":"YAML", ".yml":"YAML",
    ".md":"Markdown", ".sh":"Shell", ".sql":"SQL",
}

IGNORE_DIRS = {
    "node_modules",".git","__pycache__",".venv","venv","env",
    "dist","build",".next",".nuxt","target","bin","obj",
    ".idea",".vscode","coverage",".cache","tmp","temp",
    ".pytest_cache","htmlcov",".mypy_cache",".eggs","site-packages",".tox",
}

MAX_FILE_BYTES = 500 * 1024


def _hash(content: str) -> str:
    return hashlib.md5(content.encode("utf-8", errors="replace")).hexdigest()


def _loc(content: str, ext: str) -> dict:
    lines = content.splitlines()
    total = len(lines)
    blank = sum(1 for l in lines if not l.strip())
    comment = 0
    in_block = False
    if ext == ".py":
        in_doc = False; dc = None
        for l in lines:
            s = l.strip()
            if in_doc:
                comment += 1
                if dc and dc in s: in_doc = False; dc = None
            elif s.startswith('"""') or s.startswith("'''"):
                comment += 1
                ch = s[:3]
                if ch not in s[3:]: in_doc = True; dc = ch
            elif s.startswith("#"): comment += 1
    elif ext in {".js",".jsx",".ts",".tsx",".java",".c",".cpp",".cc",".cxx",
                 ".h",".hpp",".hxx",".cs",".go",".swift",".kt",".rs",".php"}:
        for l in lines:
            s = l.strip()
            if in_block:
                comment += 1
                if "*/" in s: in_block = False
            elif s.startswith("//") or s.startswith("#"): comment += 1
            elif s.startswith("/*"):
                comment += 1
                if "*/" not in s[2:]: in_block = True
    code = max(0, total - blank - comment)
    return {"total": total, "code": code, "blank": blank, "comment": comment}


def _complexity(content: str, ext: str) -> dict:
    f = 0; c = 0
    if ext == ".py":
        f = len(re.findall(r"^def\s+\w+", content, re.M))
        c = len(re.findall(r"^class\s+\w+", content, re.M))
    elif ext in {".js",".jsx",".ts",".tsx"}:
        f = len(re.findall(r"(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|=>\s*\{)", content))
        c = len(re.findall(r"class\s+\w+", content))
    elif ext in {".c",".cpp",".cc",".cxx",".h",".hpp",".hxx"}:
        f = len(re.findall(r"\b\w+\s+\w+\s*\([^)]*\)\s*(?:const\s*)?\{", content))
        c = len(re.findall(r"\b(?:class|struct)\s+\w+", content))
    elif ext == ".java":
        f = len(re.findall(r"(?:public|private|protected|static|\s)+\s+\w+\s+\w+\s*\(", content))
        c = len(re.findall(r"\b(?:class|interface|enum)\s+\w+", content))
    elif ext == ".go":
        f = len(re.findall(r"^func\s+\w+", content, re.M))
    elif ext == ".rs":
        f = len(re.findall(r"^(?:pub\s+)?fn\s+\w+", content, re.M))
        c = len(re.findall(r"^(?:pub\s+)?(?:struct|enum|trait)\s+\w+", content, re.M))
    return {"functions": f, "classes": c}


def _deps(rel_path: str, content: str, all_files: dict) -> list:
    ext = Path(rel_path).suffix.lower()
    file_dir = str(Path(rel_path).parent)
    deps = []
    stems = {Path(p).stem: p for p in all_files}
    names = {Path(p).name: p for p in all_files}

    if ext == ".py":
        for m in re.finditer(r"^(?:import\s+([\w.]+)|from\s+([\w.]+)\s+import)", content, re.M):
            full_mod = m.group(1) or m.group(2)
            top = full_mod.split(".")[0]
            # Try full dotted path as a file first (e.g. app.utils -> app/utils.py)
            as_path = full_mod.replace(".", "/") + ".py"
            matched = None
            for p in all_files:
                if p.replace("\\", "/").endswith(as_path) and p != rel_path:
                    matched = p; break
            # Fall back to top-level package stem match
            if not matched and top in stems and stems[top] != rel_path:
                matched = stems[top]
            if matched:
                deps.append(matched)

    elif ext in {".js",".jsx",".ts",".tsx"}:
        for m in re.finditer(r"(?:import|from)\s+['\"]([./][^'\"]+)['\"]|require\s*\(\s*['\"]([./][^'\"]+)['\"]", content, re.M):
            raw = m.group(1) or m.group(2)
            base = (Path(file_dir) / raw).as_posix()
            for try_ext in ["", ".js", ".jsx", ".ts", ".tsx", "/index.js", "/index.jsx", "/index.ts", "/index.tsx"]:
                cand = base + try_ext
                for p in all_files:
                    if p.replace("\\", "/") == cand and p != rel_path:
                        deps.append(p); break
                else: continue
                break

    elif ext in {".c",".cpp",".cc",".cxx",".h",".hpp",".hxx"}:
        for m in re.finditer(r'#include\s+"([^"]+)"', content, re.M):
            hdr = Path(m.group(1)).name
            if hdr in names and names[hdr] != rel_path:
                deps.append(names[hdr])

    elif ext == ".java":
        for m in re.finditer(r"^import\s+(?:static\s+)?([\w.]+);", content, re.M):
            cn = m.group(1).split(".")[-1] + ".java"
            if cn in names and names[cn] != rel_path:
                deps.append(names[cn])

    elif ext == ".go":
        for m in re.finditer(r'import\s+(?:\w+\s+)?["\']([./][^"\']+)["\']', content, re.M):
            cand = (Path(file_dir) / m.group(1)).as_posix()
            for p in all_files:
                if p.replace("\\", "/") == cand and p != rel_path:
                    deps.append(p); break

    elif ext == ".rs":
        for m in re.finditer(r"^(?:pub\s+)?mod\s+(\w+);", content, re.M):
            for cand in [m.group(1) + ".rs", m.group(1) + "/mod.rs"]:
                r = (Path(file_dir) / cand).as_posix()
                for p in all_files:
                    if p.replace("\\", "/") == r and p != rel_path:
                        deps.append(p); break

    return list(dict.fromkeys(deps))


def analyze_repository(repo_path: str) -> dict:
    repo_path = os.path.abspath(repo_path)
    if not os.path.exists(repo_path): raise ValueError(f"Path not found: {repo_path}")
    if not os.path.isdir(repo_path): raise ValueError(f"Not a directory: {repo_path}")

    # 1. Collect files
    all_files: Dict[str, str] = {}
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith(".")]
        for fname in files:
            if fname.startswith("."): continue
            abs_p = os.path.join(root, fname)
            rel_p = os.path.relpath(abs_p, repo_path).replace("\\", "/")
            ext = Path(fname).suffix.lower()
            if ext not in SUPPORTED_EXTENSIONS: continue
            try:
                if os.path.getsize(abs_p) > MAX_FILE_BYTES: continue
            except OSError: continue
            all_files[rel_p] = abs_p

    # 2. Read contents
    contents = {}
    for rel_p, abs_p in all_files.items():
        try:
            with open(abs_p, "r", encoding="utf-8", errors="replace") as f:
                contents[rel_p] = f.read()
        except Exception:
            contents[rel_p] = ""

    # 3. Build nodes
    nodes = []
    for rel_p, txt in contents.items():
        ext = Path(rel_p).suffix.lower()
        nodes.append({
            "id": rel_p, "label": Path(rel_p).name,
            "path": rel_p, "abs_path": all_files[rel_p],
            "extension": ext, "language": SUPPORTED_EXTENSIONS.get(ext, "Unknown"),
            "loc": _loc(txt, ext), "complexity": _complexity(txt, ext),
            "hash": _hash(txt), "size_bytes": len(txt.encode("utf-8", errors="replace")),
            "dependencies": _deps(rel_p, txt, all_files),
        })

    # 4. Build edges
    edges = []; seen = set()
    for n in nodes:
        for dep in n["dependencies"]:
            if dep in all_files:
                eid = f"{n['id']}-->{dep}"
                if eid not in seen:
                    edges.append({"id": eid, "source": n["id"], "target": dep})
                    seen.add(eid)

    # 5. Stats
    total_loc = sum(n["loc"]["code"] for n in nodes)
    langs = {}
    for n in nodes:
        e = langs.setdefault(n["language"], {"files": 0, "loc": 0})
        e["files"] += 1; e["loc"] += n["loc"]["code"]

    return {
        "nodes": nodes, "edges": edges,
        "stats": {
            "total_files": len(nodes), "total_code_loc": total_loc,
            "total_edges": len(edges), "languages": langs, "repo_path": repo_path,
        },
    }
