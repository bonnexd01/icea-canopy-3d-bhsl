"""
Exporta os dados do ICEA (BHSL) para o visualizador 3D em Three.js.

Entradas (data/):
  CESL_I01_icea_fc_hd_lang_gedi_meta_30m.tif  ICEA x1000, fc x1000, hd em dm (LANG, GEDI, META)
  CESL_I02_altura_topo_lang_gedi_meta_30m.tif altura de topo em dm
  CESL_I03_lang_fracao_valida_30m.tif         fração com dado no LANG (255 = fora do corredor)
  CESL_T05_pegadas_gedi_produtos.csv          pegadas GEDI (referência lidar)
  CESL_V01_limite_corredor.shp                limite do corredor
  resumo_numeros.md                           números-síntese do estudo (painel)

Saída:
  docs/index.html  (arquivo único; publicado pelo GitHub Pages; precisa de internet só p/ Three.js e fontes)

Inspirado em linaq11/lidar-mangrove-canopy (export_web.py + docs/index.html).
Uso (na raiz do repositório):
  python scripts/exportar_visualizacao_3d.py
  python scripts/exportar_visualizacao_3d.py --dados outra/pasta --saida outra/pagina.html
"""
import argparse
import base64
import json
import math
import os
import re
import zlib

import numpy as np
import pandas as pd
import rasterio
import shapefile

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ap = argparse.ArgumentParser(description="Gera o visualizador 3D do ICEA (HTML único).")
_ap.add_argument("--dados", default=os.path.join(BASE, "data"), help="pasta com os TIF, CSV e SHP (padrão: data/)")
_ap.add_argument("--resumo", default=None, help="resumo_numeros.md (padrão: <dados>/resumo_numeros.md)")
_ap.add_argument("--modelo", default=os.path.join(BASE, "web", "visualizador_icea_3d.template.html"))
_ap.add_argument("--saida", default=os.path.join(BASE, "docs", "index.html"))
ARGS = _ap.parse_args()
DADOS = ARGS.dados
RESUMO = ARGS.resumo or os.path.join(DADOS, "resumo_numeros.md")
MODELO = ARGS.modelo
SAIDA = ARGS.saida

BLOCO = 10          # visão geral: 10 x 10 células de 30 m (~270 m)
JANELA = 128        # janelas de detalhe: 128 x 128 células (~3,5 km)
PASSO_JANELA = 32
N_JANELAS = 4
PRODUTOS = ["lang", "gedi", "meta"]
ND = 255            # sem dado no uint8


def b64z(arr):
    """uint8 -> zlib -> base64 (o navegador abre com DecompressionStream('deflate'))."""
    return base64.b64encode(zlib.compress(np.ascontiguousarray(arr, dtype=np.uint8).tobytes(), 9)).decode("ascii")


def enc_frac(v1000):   # 0..1000 -> 0..250
    return np.clip(np.rint(v1000 / 4.0), 0, 250)


def enc_alt(dm):       # dm -> passos de 0,25 m, teto 62,5 m
    return np.clip(np.rint(dm / 2.5), 0, 250)


def numeros_resumo():
    """Lê do resumo_numeros.md só as linhas usadas no painel (nada é digitado à mão)."""
    arq = RESUMO
    alvo = {
        "icea_medio": r"^\| (LANG|GEDI|META) – ICEA médio do corredor \(I01 recortado; substitui a T04\) \| ([\d,]+)",
        "rmse_icea": r"^\| ICEA \d_(LANG|GEDI|META) – RMSE vs\. referência \| ([\d,]+)",
        "rmse_altura": r"^\| (LANG|GEDI) \([^)]*\) – rmse \| ([\d,]+)",
        "ccc_icea": r"^\| \d_(LANG|GEDI|META) – CCC icea \| ([\d,]+)",
    }
    out = {k: {} for k in alvo}
    if not os.path.exists(arq):
        return out
    for linha in open(arq, encoding="utf-8"):
        for k, rx in alvo.items():
            m = re.match(rx, linha)
            if m:
                out[k][m.group(1).lower()] = float(m.group(2).replace(",", "."))
    # META: altura usa P95 e máx.; o painel mostra o máx. (rótulo explícito no HTML)
    for linha in open(arq, encoding="utf-8"):
        m = re.match(r"^\| META \(Meta/WRI, 1 m\) – máx\. – rmse \| ([\d,]+)", linha)
        if m:
            out["rmse_altura"]["meta"] = float(m.group(1).replace(",", "."))
    return out


def main():
    i01 = rasterio.open(os.path.join(DADOS, "CESL_I01_icea_fc_hd_lang_gedi_meta_30m.tif"))
    i02 = rasterio.open(os.path.join(DADOS, "CESL_I02_altura_topo_lang_gedi_meta_30m.tif"))
    i03 = rasterio.open(os.path.join(DADOS, "CESL_I03_lang_fracao_valida_30m.tif"))
    assert (i01.width, i01.height) == (i03.width, i03.height) == (i02.width, i02.height)
    H, W = i01.height, i01.width
    left, top = i01.transform.c, i01.transform.f
    px = i01.transform.a
    lat0 = (i01.bounds.top + i01.bounds.bottom) / 2
    lon0 = (i01.bounds.left + i01.bounds.right) / 2
    mx = px * 111320.0 * math.cos(math.radians(lat0))   # m por célula (E-O)
    my = px * 110574.0                                  # m por célula (N-S)

    v3 = i03.read(1)
    dentro = v3 != 255
    lang_ok = dentro & (v3 > 0)
    valido = {"lang": lang_ok, "gedi": dentro, "meta": dentro}

    desc = list(i01.descriptions)
    desc2 = list(i02.descriptions)
    bandas = {}
    for p in PRODUTOS:
        bandas[p] = {
            "icea": i01.read(desc.index(f"icea_{p}") + 1),
            "fc": i01.read(desc.index(f"fc_{p}") + 1),
            "hd": i01.read(desc.index(f"hd_{p}") + 1),
            "ht": i02.read(desc2.index(f"htopo_{p}") + 1),
        }

    # ---------------- visão geral (média por bloco) ----------------
    Hb, Wb = H // BLOCO, W // BLOCO
    def bloco(a):
        return a[: Hb * BLOCO, : Wb * BLOCO].reshape(Hb, BLOCO, Wb, BLOCO)

    geral = {}
    for p in PRODUTOS:
        ok = bloco(valido[p]).astype(np.float32)
        n = ok.sum(axis=(1, 3))
        semdado = n < 0.5 * BLOCO * BLOCO
        geral[p] = {}
        for k, enc in (("icea", enc_frac), ("fc", enc_frac), ("hd", enc_alt), ("ht", enc_alt)):
            s = (bloco(bandas[p][k].astype(np.float32)) * ok).sum(axis=(1, 3))
            m = np.where(n > 0, s / np.maximum(n, 1), 0)
            e = enc(m)
            e[semdado] = ND
            geral[p][k] = b64z(e)
    dentro_b = bloco(dentro).mean(axis=(1, 3)) >= 0.5

    # ---------------- pegadas GEDI ----------------
    t5 = pd.read_csv(os.path.join(DADOS, "CESL_T05_pegadas_gedi_produtos.csv"))
    t5 = t5[t5["completa"] == 1].copy()
    coords = t5[".geo"].map(lambda g: json.loads(g)["coordinates"])
    t5["lon"] = coords.map(lambda c: c[0])
    t5["lat"] = coords.map(lambda c: c[1])
    t5["col"] = (t5["lon"] - left) / px
    t5["lin"] = (top - t5["lat"]) / px
    t5 = t5[(t5.col >= 0) & (t5.col < W) & (t5.lin >= 0) & (t5.lin < H)]
    t5 = t5[dentro[t5.lin.astype(int), t5.col.astype(int)]]
    pegadas = [
        [round(r.col, 2), round(r.lin, 2), round(r.h_ref, 2), round(r.icea_ref, 3), round(r.cover_z1, 3),
         round(r.icea_lang, 3), round(r.icea_gedi, 3), round(r.icea_meta, 3),
         round(r.lang_h, 1), round(r.gedi_h, 1), round(r.meta_max, 1)]
        for r in t5.itertuples()
    ]

    # ---------------- janelas de detalhe (30 m nativo) ----------------
    ip = np.stack([bandas[p]["icea"].astype(np.float32) / 1000 for p in PRODUTOS])
    cand = []
    for r0 in range(0, H - JANELA, PASSO_JANELA):
        for c0 in range(0, W - JANELA, PASSO_JANELA):
            d = dentro[r0:r0 + JANELA, c0:c0 + JANELA]
            if d.mean() < 0.99 or lang_ok[r0:r0 + JANELA, c0:c0 + JANELA].mean() < 0.97:
                continue
            w = ip[:, r0:r0 + JANELA, c0:c0 + JANELA]
            sel = (t5.lin >= r0) & (t5.lin < r0 + JANELA) & (t5.col >= c0) & (t5.col < c0 + JANELA)
            cand.append({
                "r0": r0, "c0": c0,
                "media": float(w.mean()),
                "consenso": float(w.min(axis=0).mean()),
                "mosaico": float(w.mean(axis=0).std()),
                "diverg": float((w.max(axis=0) - w.min(axis=0)).mean()),
                "npeg": int(sel.sum()),
            })
    print(f"janelas candidatas: {len(cand)}")
    criterios = [
        ("consenso", "Dossel fechado (consenso dos 3 produtos)"),
        ("mosaico", "Mosaico floresta–savana"),
        ("diverg", "Maior divergência entre os produtos"),
        ("npeg", "Mais pegadas GEDI (referência lidar)"),
    ]
    escolhidas = []
    for chave, nome in criterios:
        pool = [c for c in cand if c["npeg"] >= 3 or chave == "npeg"]
        pool.sort(key=lambda c: (c[chave], c["npeg"]), reverse=True)
        for c in pool:
            if all(abs(c["r0"] - e["r0"]) >= JANELA * 2 or abs(c["c0"] - e["c0"]) >= JANELA * 2 for e in escolhidas):
                escolhidas.append(dict(c, criterio=chave, nome=nome))
                break

    janelas = []
    for e in escolhidas[:N_JANELAS]:
        r0, c0 = e["r0"], e["c0"]
        sl = (slice(r0, r0 + JANELA), slice(c0, c0 + JANELA))
        jd = {"nome": e["nome"], "criterio": e["criterio"], "r0": r0, "c0": c0, "n": JANELA,
              "lon": round(left + (c0 + JANELA / 2) * px, 5), "lat": round(top - (r0 + JANELA / 2) * px, 5),
              "npeg": e["npeg"], "dados": {}}
        for p in PRODUTOS:
            ok = valido[p][sl]
            jd["dados"][p] = {}
            for k, enc in (("icea", enc_frac), ("fc", enc_frac), ("hd", enc_alt), ("ht", enc_alt)):
                a = enc(bandas[p][k][sl].astype(np.float32))
                a[~ok] = ND
                jd["dados"][p][k] = b64z(a)
        janelas.append(jd)
        print(f"  {e['nome']}: lin {r0} col {c0} | ICEA médio {e['media']:.2f} | pegadas {e['npeg']}")

    # ---------------- limite do corredor ----------------
    shp = shapefile.Reader(os.path.join(DADOS, "CESL_V01_limite_corredor.shp"))
    limite = []
    for sh in shp.shapes():
        partes = list(sh.parts) + [len(sh.points)]
        for a, b in zip(partes[:-1], partes[1:]):
            limite.append([[round((x - left) / px, 1), round((top - y) / px, 1)] for x, y in sh.points[a:b]])

    dados = {
        "meta": {
            "W": W, "H": H, "bloco": BLOCO, "Wb": Wb, "Hb": Hb,
            "mx": mx, "my": my, "lon0": lon0, "lat0": lat0, "left": left, "top": top, "px": px,
            "h_ref": 15, "fonte": "I01/I02/I03, T05, V01 (script GEE v1.3)",
        },
        "geral": geral,
        "dentro": b64z(dentro_b.astype(np.uint8)),
        "pegadas": pegadas,
        "janelas": janelas,
        "limite": limite,
        "numeros": numeros_resumo(),
    }

    js = json.dumps(dados, ensure_ascii=False, separators=(",", ":"))
    html = open(MODELO, encoding="utf-8").read().replace("/*__DADOS__*/null", js)
    open(SAIDA, "w", encoding="utf-8").write(html)
    print(f"pegadas: {len(pegadas)} | visão geral {Wb}x{Hb} | {SAIDA} ({os.path.getsize(SAIDA) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
