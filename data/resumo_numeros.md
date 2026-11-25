# Números para o texto do Artigo 3

## Metadados da execução (T06)

- **asset_corredor:** projects/ee-davidaranha/assets/corredor_ecologico (partes poligonais)
- **data_execucao_utc:** 2026-11-05 20:10:16
- **estratos:** classes de altura da referencia GEDI (sem mapa de uso da terra)
- **formula_icea:** fc * min(hd / H_REF, 1)
- **formula_icea_ref:** cover_z1 * min(h_ref / H_REF, 1)
- **gedi_potapov:** users/potapovpeter/GEDI_V27; 101/102 -> 0 m; 103 mascarado
- **grade:** EPSG:4326 0.00025,0,-180,0,-0.00025,80
- **h_ref_m:** 15
- **janela_gedi:** 2019-04-01 a 2020-12-31
- **lang:** users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1 (+SD); 255 mascarado
- **limiar_arvore_m:** 5
- **meta:** projects/meta-forest-monitoring-okw37/assets/CanopyHeight
- **min_n:** 30
- **n_amostra_comum:** 4986
- **n_max:** 5000
- **n_pegadas_gravadas:** 5000
- **ref_altura:** rh98 (negativo -> 0)
- **ref_cobertura:** cover_z1
- **referencia:** LARSE/GEDI/GEDI02_A_002_MONTHLY + LARSE/GEDI/GEDI02_B_002_MONTHLY, pareados por delta_time
- **semente:** 42
- **sens_min:** 0.95
- **so_noite:** False
- **tol_delta_time_s:** 0.001
- **versao_script:** 1.3

## Valores

| Descrição | Valor | Origem |
|---|---|---|
| LANG (ETH 2020, 10 m) – vies | -1,076 | T01 (estrato todos) |
| LANG (ETH 2020, 10 m) – mae | 4,531 | T01 (estrato todos) |
| LANG (ETH 2020, 10 m) – rmse | 6,211 | T01 (estrato todos) |
| LANG (ETH 2020, 10 m) – r_pearson | 0,637 | T01 (estrato todos) |
| GEDI (Potapov 2019, 30 m) – vies | -4,717 | T01 (estrato todos) |
| GEDI (Potapov 2019, 30 m) – mae | 5,144 | T01 (estrato todos) |
| GEDI (Potapov 2019, 30 m) – rmse | 6,883 | T01 (estrato todos) |
| GEDI (Potapov 2019, 30 m) – r_pearson | 0,666 | T01 (estrato todos) |
| META (Meta/WRI, 1 m) – P95 – vies | -4,195 | T01 (estrato todos) |
| META (Meta/WRI, 1 m) – P95 – mae | 4,759 | T01 (estrato todos) |
| META (Meta/WRI, 1 m) – P95 – rmse | 6,385 | T01 (estrato todos) |
| META (Meta/WRI, 1 m) – P95 – r_pearson | 0,701 | T01 (estrato todos) |
| META (Meta/WRI, 1 m) – máx. – vies | -3,537 | T01 (estrato todos) |
| META (Meta/WRI, 1 m) – máx. – mae | 4,447 | T01 (estrato todos) |
| META (Meta/WRI, 1 m) – máx. – rmse | 6,069 | T01 (estrato todos) |
| META (Meta/WRI, 1 m) – máx. – r_pearson | 0,691 | T01 (estrato todos) |
| LANG (ETH 2020, 10 m) – kappa dossel ≥ 5 m | 0,591 | T02 |
| LANG (ETH 2020, 10 m) – F1 dossel ≥ 5 m | 0,816 | T02 |
| GEDI (Potapov 2019, 30 m) – kappa dossel ≥ 5 m | 0,555 | T02 |
| GEDI (Potapov 2019, 30 m) – F1 dossel ≥ 5 m | 0,757 | T02 |
| META (Meta/WRI, 1 m) – P95 – kappa dossel ≥ 5 m | 0,571 | T02 |
| META (Meta/WRI, 1 m) – P95 – F1 dossel ≥ 5 m | 0,773 | T02 |
| META (Meta/WRI, 1 m) – máx. – kappa dossel ≥ 5 m | 0,614 | T02 |
| META (Meta/WRI, 1 m) – máx. – F1 dossel ≥ 5 m | 0,811 | T02 |
| LANG – Herbáceo < 2 m (ha) | 326.862,093 | T07 |
| LANG – Arbustivo 2–13 m (ha) | 247.526,918 | T07 |
| LANG – Arbóreo > 13 m (ha) | 175.303,431 | T07 |
| LANG – área com dado (ha) | 699.106,849 | T04 |
| LANG – ICEA médio | 0,411 | T04 |
| GEDI – Herbáceo < 2 m (ha) | 451.796,519 | T07 |
| GEDI – Arbustivo 2–13 m (ha) | 271.300,533 | T07 |
| GEDI – Arbóreo > 13 m (ha) | 40.199,012 | T07 |
| GEDI – área com dado (ha) | 763.296,063 | T04 |
| GEDI – ICEA médio | 0,197 | T04 |
| META – Herbáceo < 2 m (ha) | 503.250,924 | T07 |
| META – Arbustivo 2–13 m (ha) | 234.229,546 | T07 |
| META – Arbóreo > 13 m (ha) | 25.792,720 | T07 |
| META – área com dado (ha) | 607.822,204 | T04 |
| META – ICEA médio | 0,172 | T04 |
| ICEA 1_LANG – RMSE vs. referência | 0,468 | T03 |
| ICEA 2_GEDI – RMSE vs. referência | 0,273 | T03 |
| ICEA 3_META – RMSE vs. referência | 0,223 | T03 |
| LANG (ETH 2020, 10 m) – CCC altura | 0,625 | T05 (amostra comum; Lin, 1989) |
| GEDI (Potapov 2019, 30 m) – CCC altura | 0,485 | T05 (amostra comum; Lin, 1989) |
| META (Meta/WRI, 1 m) – P95 – CCC altura | 0,552 | T05 (amostra comum; Lin, 1989) |
| META (Meta/WRI, 1 m) – máx. – CCC altura | 0,586 | T05 (amostra comum; Lin, 1989) |
| 1_LANG – CCC icea | 0,326 | T05 (amostra comum; Lin, 1989) |
| 2_GEDI – CCC icea | 0,571 | T05 (amostra comum; Lin, 1989) |
| 3_META – CCC icea | 0,635 | T05 (amostra comum; Lin, 1989) |
| Maior kappa com limiar de 3 m (critério 3) | LANG (ETH 2020, 10 m) (0,42) | T05 – sensibilidade |
| Maior kappa com limiar de 5 m (critério 3) | LANG (ETH 2020, 10 m) (0,59) | T05 – sensibilidade |
| Maior kappa com limiar de 7 m (critério 3) | LANG (ETH 2020, 10 m) (0,55) | T05 – sensibilidade |
| Conferência I01 × T05 – % de pegadas com |dif. do ICEA lang| > 0,001 | 6,418 | esperado ~5–9%: pegadas a ~1–2 m da borda da célula; no GEE o ICEA foi lido na escala de 10 m e caiu na célula vizinha (verificado em 05/11/2026) |
| Conferência I01 × T05 – % de pegadas com |dif. do ICEA gedi| > 0,001 | 4,533 | esperado ~5–9%: pegadas a ~1–2 m da borda da célula; no GEE o ICEA foi lido na escala de 10 m e caiu na célula vizinha (verificado em 05/11/2026) |
| Conferência I01 × T05 – % de pegadas com |dif. do ICEA meta| > 0,001 | 9,126 | esperado ~5–9%: pegadas a ~1–2 m da borda da célula; no GEE o ICEA foi lido na escala de 10 m e caiu na célula vizinha (verificado em 05/11/2026) |
| Menor RMSE do ICEA com H_REF = 10 m (critério 4) | 3_META (0,291) | T05 + I01 – sensibilidade |
| Menor RMSE do ICEA com H_REF = 15 m (critério 4) | 3_META (0,223) | T05 + I01 – sensibilidade |
| Menor RMSE do ICEA com H_REF = 20 m (critério 4) | 3_META (0,180) | T05 + I01 – sensibilidade |
| Falhas do LANG removidas pelo I03 (células) | 119.020,000 | I03 (script GEE v1.3) |
| LANG – ICEA médio com H_REF = 10 m | 0,462 | I01 – sensibilidade |
| GEDI – ICEA médio com H_REF = 10 m | 0,258 | I01 – sensibilidade |
| META – ICEA médio com H_REF = 10 m | 0,208 | I01 – sensibilidade |
| LANG – ICEA médio com H_REF = 15 m | 0,396 | I01 – sensibilidade |
| GEDI – ICEA médio com H_REF = 15 m | 0,197 | I01 – sensibilidade |
| META – ICEA médio com H_REF = 15 m | 0,154 | I01 – sensibilidade |
| LANG – ICEA médio com H_REF = 20 m | 0,324 | I01 – sensibilidade |
| GEDI – ICEA médio com H_REF = 20 m | 0,149 | I01 – sensibilidade |
| META – ICEA médio com H_REF = 20 m | 0,117 | I01 – sensibilidade |
| Conferência área com dado lang: I01 / T04 − 1 | 0,083 | LANG e META > 0: a T04 v1.1 pondera pela máscara fracionária do hd (ver PENDENCIAS) |
| Conferência ICEA médio lang (H_REF 15 m): I01 recortado − T04 | -0,015 | GEDI ≈ 0; LANG e META < 0 pela ponderação da T04 (ver PENDENCIAS) |
| Conferência área com dado gedi: I01 / T04 − 1 | 0,003 | LANG e META > 0: a T04 v1.1 pondera pela máscara fracionária do hd (ver PENDENCIAS) |
| Conferência ICEA médio gedi (H_REF 15 m): I01 recortado − T04 | 0,000 | GEDI ≈ 0; LANG e META < 0 pela ponderação da T04 (ver PENDENCIAS) |
| Conferência área com dado meta: I01 / T04 − 1 | 0,260 | LANG e META > 0: a T04 v1.1 pondera pela máscara fracionária do hd (ver PENDENCIAS) |
| Conferência ICEA médio meta (H_REF 15 m): I01 recortado − T04 | -0,018 | GEDI ≈ 0; LANG e META < 0 pela ponderação da T04 (ver PENDENCIAS) |
| LANG – ICEA médio do corredor (I01 recortado; substitui a T04) | 0,396 | I01 + V01 |
| GEDI – ICEA médio do corredor (I01 recortado; substitui a T04) | 0,197 | I01 + V01 |
| META – ICEA médio do corredor (I01 recortado; substitui a T04) | 0,154 | I01 + V01 |

- Pegadas GEDI gravadas (T05): 5000
- Pegadas na amostra comum dos três produtos (T05, completa = 1): 4986
