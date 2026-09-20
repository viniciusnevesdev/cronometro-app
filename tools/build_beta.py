#!/usr/bin/env python3
"""Monta somente o pacote /beta da apresentação UZE.

A fonte da Beta é a branch uze-beta; a raiz pública continua sendo a versão
UZE estável presente na main.  O script também é a fonte de geração de todos
os metadados de versão do pacote Beta.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

SOURCE = Path(sys.argv[1]).resolve()
OUTPUT = Path(sys.argv[2]).resolve()
config = json.loads((SOURCE / "environments.json").read_text(encoding="utf-8"))["beta"]
release = config["release"]

if not (SOURCE / "index.html").exists():
    raise SystemExit("Fonte UZE Beta inválida")
if "-beta." not in release:
    raise SystemExit("A release da UZE Beta precisa ter sufixo semver -beta.N")

if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
shutil.copytree(
    SOURCE,
    OUTPUT,
    ignore=shutil.ignore_patterns(".git", ".github", "tools", "site", "beta", "*.pyc", "__pycache__"),
)

def replace(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Não encontrei o trecho esperado em {path.name}: {old!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")

# Isolamento de dados e runtime: a Beta nunca pode registrar no banco, cache
# ou escopo da estável. O SW tem scope /beta/ por ser servido desse diretório.
replace(OUTPUT / "app.js", "const DB_NAME='cronometro_public_demo_v4';", f"const DB_NAME='{config['database']}';")
replace(OUTPUT / "sw.js", "const CACHE='cronometro-public-presentation-0.8.10-8';", f"const CACHE='{config['cachePrefix']}{release}';")

index = OUTPUT / "index.html"
html = index.read_text(encoding="utf-8")
html = html.replace('<title>Cronômetro</title>', '<title>Cronômetro UZE Beta</title>', 1)
html = html.replace('content="Cronômetro"', 'content="Cronômetro UZE Beta"')
html = html.replace('window.APP_RELEASE="0.8.10"', f'window.APP_RELEASE="{release}"')
html = html.replace('</head>', '  <link rel="stylesheet" href="./uze-beta.css" />\n</head>', 1)
html = html.replace('<script src="./presentation.js"></script>', '<script src="./presentation.js"></script>\n  <script src="./uze-beta.js"></script>')
index.write_text(html, encoding="utf-8")

manifest = json.loads((OUTPUT / "manifest.webmanifest").read_text(encoding="utf-8"))
manifest.update({"name": "Cronômetro UZE Beta", "short_name": "UZE Beta", "id": "./", "start_url": "./", "scope": "./"})
(OUTPUT / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

(OUTPUT / "version.json").write_text(json.dumps({"version": release}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(OUTPUT / "environment.json").write_text(json.dumps({**config, "branch": "uze-beta", "stable": False, "path": "/beta/"}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Falhar cedo é preferível a publicar identificadores divergentes.
checks = {
    "index.html": release,
    "version.json": release,
    "environment.json": release,
    "app.js": config["database"],
    "sw.js": config["cachePrefix"],
}
for name, expected in checks.items():
    if expected not in (OUTPUT / name).read_text(encoding="utf-8"):
        raise SystemExit(f"Validação falhou: {name} não contém {expected}")

print(f"UZE Beta pronta: {release} -> {OUTPUT}")
