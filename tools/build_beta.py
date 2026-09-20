#!/usr/bin/env python3
"""Monta somente o pacote /beta da apresentação UZE.

A fonte da Beta é a branch uze-beta; a raiz pública continua sendo a versão
UZE estável presente na main.  O script também é a fonte de geração de todos
os metadados de versão do pacote Beta.
"""
from __future__ import annotations

import json
import re
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
    ignore=shutil.ignore_patterns(".git", ".github", "tools", "site", "beta", "AUDIT-*.md", "*.pyc", "__pycache__"),
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
replace(OUTPUT / "sw.js", "const CACHE_PREFIX='cronometro-public-presentation-';", f"const CACHE_PREFIX='{config['cachePrefix']}';")
replace(OUTPUT / "sw.js", "  './analytics.css',", "  './analytics.css',\n  './uze-beta.css',")
replace(OUTPUT / "sw.js", "  './analytics-ui.js',", "  './analytics-ui.js',\n  './uze-beta.js',")

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

# Contratos estruturais da variante. Valores técnicos como `classic` seguem
# válidos; o que não pode reaparecer é a interface visual antiga.
uze_js = (OUTPUT / "uze-beta.js").read_text(encoding="utf-8")
if "indexOf(" in uze_js:
    raise SystemExit("Validação falhou: a camada UZE não pode recortar HTML por indexOf")
for forbidden in ("themeSelect", "Texto quando não houver cliente", ">Clássico<"):
    if forbidden in uze_js:
        raise SystemExit(f"Validação falhou: resíduo visual antigo na UZE Beta: {forbidden}")
if uze_js.count('data-uze-theme="') != 1:
    raise SystemExit("Validação falhou: seletor de tema UZE ausente ou duplicado")
for required in ("Escolher cliente", "Ícone do cronômetro ativo", "Cadastrar nova cliente", "Modo Otimizado ativado"):
    corpus = uze_js + (OUTPUT / "app.js").read_text(encoding="utf-8")
    if required not in corpus:
        raise SystemExit(f"Validação falhou: requisito UZE ausente: {required}")

css = "\n".join((OUTPUT / name).read_text(encoding="utf-8") for name in ("styles.css", "presentation.css", "uze-beta.css"))
for body in re.findall(r"\.history-card\s*\{([^}]*)\}", css, flags=re.S):
    if "border-left" in body:
        raise SystemExit("Validação falhou: faixa lateral legada voltou ao Histórico")

index_text = (OUTPUT / "index.html").read_text(encoding="utf-8")
for asset in ("analytics-ui.js", "analytics.css", "uze-beta.js", "uze-beta.css"):
    if f'./{asset}' not in index_text:
        raise SystemExit(f"Validação falhou: index não referencia {asset}")

print(f"UZE Beta pronta: {release} -> {OUTPUT}")
