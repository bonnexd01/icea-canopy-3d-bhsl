/*******************************************************************************
 * ÍNDICE DE COBERTURA PELA ESTRUTURA ARBÓREA (ICEA)
 * Corredor Ecológico – Bacia do Rio São Lourenço (MT)
 *
 * Pergunta: qual mapa global de altura do dossel – LANG (ETH 2020, 10 m),
 * GEDI (Potapov/UMD 2019, 30 m) ou META (Meta/WRI, 1 m) – representa melhor a
 * estrutura arbórea do corredor e, portanto, deve sustentar um índice de
 * cobertura vegetal baseado na estrutura do dossel?
 *
 * A análise compara apenas os modelos de altura do dossel entre si e contra o
 * lidar GEDI; nenhum mapa de uso e cobertura da terra é usado.
 *
 * Referência da altura: pegadas do lidar GEDI L2A (RH98) e L2B (cobertura acima
 * de 5 m), 2019–2020, filtradas por qualidade e pareadas pelo mesmo disparo.
 * Atenção: os três produtos usaram GEDI no treino ou calibração; a referência
 * não é totalmente independente (declarar como limitação no artigo).
 *
 * Versão 1.3 – 2026-11-05 (economia de EECU: a cota mensal do nível Comunidade acabou)
 *  - ETAPA = 2 por padrão. A ETAPA 1 NÃO precisa ser refeita: as pegadas (asset) não mudam, e a
 *    ponderação da T04 v1.1 já é corrigida no Python (I01 recortado pelo V01 + área válida da T07).
 *  - Nova saída leve na ETAPA 2: I03 = fração da célula de 30 m com dado no LANG (0–100), para o
 *    Python tirar as falhas do LANG (~16 mil ha gravados como ICEA 0 no I01 v1.1). Só lê o LANG
 *    de 10 m; não toca no META de 1 m.
 *  - MOSTRAR_MAPA = false: o mapa interativo (sobretudo o META de 1 m) também gasta a cota.
 *
 * Versão 1.2 – 2026-11-05
 *  - hd (altura média do dossel ≥ 5 m) = média de [altura × árvore] ÷ fc, ambas agregadas sobre todos os
 *    pixels válidos. Antes (v1.1), o hd era agregado só sobre os pixels com árvore e herdava uma máscara
 *    fracionária; o reduceRegion usava essa fração como peso, e a T04 ficava ponderada pela fração de dossel
 *    no LANG e no META (área com dado e ICEA médio). Os valores de hd e ICEA por célula não mudam.
 *  - I01 e I02 exportados com "sem dado" explícito (65535) fora do corredor e nas falhas dos produtos
 *    (na v1.1, essas células saíam como 0).
 *  - EXPORTAR_ASSET: permite refazer a ETAPA 1 sem regravar o asset das pegadas (as pegadas não mudam).
 *
 * Versão 1.1 – 2026-11-05
 *  - GEDI/Potapov: códigos 101 (água) e 102 (neve/gelo) → altura 0; 103 (sem dado) mascarado.
 *  - LANG: valor 255 (sem dado) mascarado, por precaução.
 *  - L2A e L2B pareados pelo mesmo disparo (delta_time) antes da extração.
 *  - Cobertura de referência = cover_z1 (cobertura acima de 5 m), coerente com o limiar de árvore.
 *  - RH98 negativo truncado em 0 em todas as métricas (coluna h_ref).
 *  - Amostra comum: as métricas usam só pegadas com valor válido nos três produtos.
 *  - ICEA médio dividido pela área com dado (não pela área total do corredor).
 *  - Execução em duas etapas (ETAPA 1 grava as pegadas como asset; ETAPA 2 calcula as tabelas).
 *  - MapBiomas removido; estratos = classes de altura da referência GEDI.
 *  - SHP da T05 com nomes de campo de até 10 caracteres.
 *
 * COMO RODAR (v1.3, com a ETAPA 1 da v1.1 já feita)
 *  - ETAPA = 2 → Run → aba Tasks: T01, T02, T03, T05 (CSV e SHP), T06 e I03. É tudo o que falta.
 *
 * COMO RODAR (do zero)
 *  1. ETAPA = 1 → Run → aba Tasks: rodar todas (T04, T07, V01, I01, I02 e o asset das pegadas).
 *  2. Quando o asset CESL_T05_pegadas_gedi_produtos terminar: ETAPA = 2 → Run →
 *     aba Tasks: rodar T01, T02, T03, T05 (CSV e SHP) e T06.
 *  Se o asset da v1.1 já existe: a ETAPA 2 pode rodar com ele. Para corrigir T04, I01 e I02 (v1.2),
 *  usar ETAPA = 1 com EXPORTAR_ASSET = false e rodar só T04, T07, I01 e I02 (V01 é opcional).
 *
 * SAÍDAS
 *  ETAPA 1
 *   A01 Asset das pegadas GEDI com os valores dos três produtos (entrada da ETAPA 2)
 *   T04 Área por classe de ICEA, dossel equivalente e ICEA médio, por produto
 *   T07 Área por estrato de altura (< 2 m, 2–13 m, > 13 m) em cada produto
 *   V01 Limite do corredor
 *   I01 ICEA, fração de dossel e altura do dossel dos 3 produtos (30 m)
 *   I02 Altura de topo dos 3 produtos na grade comum (30 m)
 *  ETAPA 2
 *   T01 Desempenho da altura por produto e classe de altura (n, viés, MAE, RMSE, rRMSE, r, ajuste)
 *   T02 Concordância da presença de dossel (≥ 5 m): exatidão, precisão, sensibilidade, F1, kappa
 *   T03 Desempenho do ICEA de cada produto contra o ICEA de referência GEDI
 *   T05 Pegadas GEDI com os valores de todos os produtos (CSV completo + SHP da amostra comum)
 *   T06 Metadados de execução
 *   I03 Fração da célula de 30 m com dado no LANG, ×100 (uint8; 255 = fora do corredor)
 ******************************************************************************/

// ============================================================================
// 0. PARÂMETROS
// ============================================================================
var ETAPA        = 2;          // 1: grava pegadas, áreas e imagens · 2: calcula as métricas a partir do asset
var EXPORTAR_ASSET = false;    // ETAPA 1: false = não regrava o asset das pegadas (já existente)
var EXPORTAR_I03 = true;       // ETAPA 2: máscara das falhas do LANG (leve; substitui refazer o I01 v1.2)
var MOSTRAR_MAPA = false;      // true: desenha as camadas no mapa (gasta cota; o META de 1 m é o mais caro)
var PASTA_DRIVE  = 'GEE_Corredor_SaoLourenco_ICEA';
var PREFIXO      = 'CESL';
var ASSET_PEGADAS = 'projects/ee-davidaranha/assets/CESL_T05_pegadas_gedi_produtos';
var LIMIAR_ARV   = 5;          // m – altura mínima de árvore (definição de floresta da FAO)
var H_REF        = 15;         // m – altura de dossel considerada "plena" no índice (a validar com fitofisionomias locais)
var GEDI_INI     = '2019-04-01';
var GEDI_FIM     = '2020-12-31';   // janela compatível com os produtos (2019–2020)
var SENS_MIN     = 0.95;       // sensibilidade mínima do feixe GEDI (0,98 para florestas densas)
var SO_NOITE     = false;      // true: só disparos noturnos (menos ruído solar, menos pontos)
var REF_RH       = 'rh98';     // métrica de referência de altura (LANG foi treinado em RH98)
var REF_COB      = 'cover_z1'; // cobertura GEDI L2B acima de 5 m (perfil acumulado em passos de 5 m)
var TOL_DT       = 0.001;      // s – tolerância para considerar L2A e L2B o mesmo disparo
var N_MAX        = 5000;       // máximo de pegadas GEDI analisadas
var MIN_N        = 30;         // mínimo de pontos para calcular métricas num estrato
var SEMENTE      = 42;
var ESTRATO_1    = 2;          // m – limite herbáceo/arbustivo (estudo anterior na mesma área)
var ESTRATO_2    = 13;         // m – limite arbustivo/arbóreo (estudo anterior na mesma área)

// Grade comum de 30 m (= grade do GEDI/Potapov e do Hansen, 0,00025°)
var GRADE  = [0.00025, 0, -180, 0, -0.00025, 80];
var PROJ30 = ee.Projection('EPSG:4326', GRADE);

// ============================================================================
// 1. ÁREA DE ESTUDO (partes poligonais; o asset também contém linhas)
// ============================================================================
var palettes = require('users/gena/packages:palettes');

var corridorBruto = ee.FeatureCollection('projects/ee-davidaranha/assets/corredor_ecologico');
var partes = ee.FeatureCollection(corridorBruto.geometry().geometries().map(function (g) {
  g = ee.Geometry(g);
  return ee.Feature(g, {tipo: g.type()});
}));
var corridor = partes.filter(ee.Filter.inList('tipo', ['Polygon', 'MultiPolygon'])).union(1);
var aoi      = corridor.geometry();
var REGIAO   = aoi.bounds();
var AREA_HA  = ee.Image.pixelArea().divide(1e4);

print('Partes por tipo de geometria', partes.aggregate_histogram('tipo'));
print('Área do corredor (ha) – deve ser > 0', aoi.area(1).divide(1e4));

// ============================================================================
// 2. DADOS – na ordem do estudo: LANG, GEDI, META
// ============================================================================
// 2.1 LANG – ETH Global Canopy Height 2020, 10 m (Lang et al. 2023)
var langBruto       = ee.Image('users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1').select(0);
var projLang        = langBruto.projection();
var ethcanopyheight = langBruto.updateMask(langBruto.lt(255)).rename('altura').clip(aoi);
var sdBruto         = ee.Image('users/nlang/ETH_GlobalCanopyHeightSD_2020_10m_v1').select(0);
var ethSD           = sdBruto.updateMask(sdBruto.lt(255)).rename('dp').clip(aoi);

// 2.2 GEDI – Potapov/UMD Global Forest Canopy Height 2019, 30 m (Potapov et al. 2021)
//     Alturas 0–60 m. Na versão GEE, "sem dado = 0" (o 0 também é área sem dossel).
//     Proteção para os códigos da versão GeoTIFF: 101 água e 102 neve/gelo → 0 m; 103 sem dado → máscara.
var umdCol    = ee.ImageCollection('users/potapovpeter/GEDI_V27').filterBounds(aoi);
var projUmd   = umdCol.first().projection();
var umdBruto  = umdCol.mosaic().select(0).unmask(0);
var umdheight = umdBruto.where(umdBruto.eq(101).or(umdBruto.eq(102)), 0)
                  .updateMask(umdBruto.neq(103).and(umdBruto.lte(102)))
                  .rename('altura').setDefaultProjection(projUmd).clip(aoi);

// 2.3 META – Meta/WRI High Resolution Canopy Height, 1 m (Tolan et al. 2024)
var metaCol      = ee.ImageCollection('projects/meta-forest-monitoring-okw37/assets/CanopyHeight')
                     .filterBounds(aoi);
var projMeta     = metaCol.first().projection();
var canopyHeight = metaCol.mosaic().select(0).rename('altura')
                     .setDefaultProjection(projMeta).clip(aoi);
var treenotree   = canopyHeight.gte(LIMIAR_ARV).selfMask();   // binário de fato

// 2.4 Referência – pegadas GEDI L2A (altura) e L2B (cobertura), 25 m
//     Cada imagem é mascarada por inteiro (todas as bandas juntas) para que o mosaico
//     não misture bandas de disparos diferentes.
function mascaraL2A(img) {
  var sel = img.select(['rh95', 'rh98', 'sensitivity', 'solar_elevation', 'delta_time'],
                       ['rh95', 'rh98', 'sensitivity', 'solar_elevation', 'dt_l2a']);
  var m = img.select('quality_flag').eq(1)
    .and(img.select('degrade_flag').eq(0))
    .and(img.select('sensitivity').gte(SENS_MIN))
    .and(sel.mask().reduce(ee.Reducer.min()));
  if (SO_NOITE) { m = m.and(img.select('solar_elevation').lt(0)); }
  return sel.updateMask(m);
}
function mascaraL2B(img) {
  var sel = img.select(['cover', REF_COB, 'delta_time'], ['cover', REF_COB, 'dt_l2b']);
  var m = img.select('l2b_quality_flag').eq(1)
    .and(img.select('degrade_flag').eq(0))
    .and(img.select('sensitivity').gte(SENS_MIN))
    .and(sel.mask().reduce(ee.Reducer.min()));
  return sel.updateMask(m);
}
var l2aCol   = ee.ImageCollection('LARSE/GEDI/GEDI02_A_002_MONTHLY')
                 .filterBounds(aoi).filterDate(GEDI_INI, GEDI_FIM).map(mascaraL2A);
var l2bCol   = ee.ImageCollection('LARSE/GEDI/GEDI02_B_002_MONTHLY')
                 .filterBounds(aoi).filterDate(GEDI_INI, GEDI_FIM).map(mascaraL2B);
var projGedi = l2aCol.first().projection();
var l2a      = l2aCol.mosaic();
var l2b      = l2bCol.mosaic();
// Mesmo disparo: o tempo do disparo (delta_time, s) tem de coincidir entre L2A e L2B
var mesmoDisparo = l2a.select('dt_l2a').subtract(l2b.select('dt_l2b')).abs().lt(TOL_DT);
var refImg   = l2a.addBands(l2b)
                 .addBands(l2a.select(REF_RH).max(0).rename('h_ref'))   // RH98 negativo → 0 m
                 .addBands(l2b.select(REF_COB).rename('cob_ref'))
                 .updateMask(mesmoDisparo)
                 .setDefaultProjection(projGedi).clip(aoi);

print('Tiles – GEDI/Potapov', umdCol.size(), 'META', metaCol.size());
print('Meses GEDI L2A na janela', l2aCol.size(), 'L2B', l2bCol.size());

// ============================================================================
// 3. PRÉ-PROCESSAMENTO – os 3 produtos na mesma grade de 30 m
//    fc = fração do pixel com dossel ≥ LIMIAR_ARV
//    hd = altura média do dossel (só pixels ≥ LIMIAR_ARV)
// ============================================================================
function paraGrade(altura, projNativa, nome) {
  var arv = altura.gte(LIMIAR_ARV);
  var fc = arv.toFloat().setDefaultProjection(projNativa)
    .reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 2048})
    .reproject(PROJ30);
  // hd = média(altura × árvore) / fc: as duas médias usam todos os pixels válidos, então a máscara
  // de hd é a mesma de fc (fração de pixels com dado), e não a fração de pixels com árvore (v1.1).
  var somaArv = altura.multiply(arv).toFloat().setDefaultProjection(projNativa)
    .reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 2048})
    .reproject(PROJ30);
  var hd = somaArv.divide(fc.where(fc.eq(0), 1));   // fc = 0 → somaArv = 0 → hd = 0
  var hTopo = altura.toFloat().setDefaultProjection(projNativa)
    .reduceResolution({reducer: ee.Reducer.max(), maxPixels: 2048})
    .reproject(PROJ30);
  // Estratos do estudo anterior na mesma área (herbáceo < 2 m; arbustivo 2–13 m; arbóreo > 13 m)
  var estr = ee.Image.cat(
      altura.lt(ESTRATO_1).rename('e_herb_' + nome),
      altura.gte(ESTRATO_1).and(altura.lte(ESTRATO_2)).rename('e_arbu_' + nome),
      altura.gt(ESTRATO_2).rename('e_arbo_' + nome)
    ).toFloat().setDefaultProjection(projNativa)
    .reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 2048})
    .reproject(PROJ30);
  // 4. INDICADOR – ICEA = fc × min(hd / H_REF, 1), varia de 0 a 1
  var icea = fc.multiply(hd.divide(H_REF).min(1));
  return ee.Image.cat(
    fc.rename('fc_' + nome), hd.rename('hd_' + nome),
    icea.rename('icea_' + nome), hTopo.rename('htopo_' + nome), estr
  ).clip(aoi);
}

var gLang = paraGrade(ethcanopyheight, projLang, 'lang');
var gUmd  = paraGrade(umdheight, projUmd, 'gedi');
var gMeta = paraGrade(canopyHeight, projMeta, 'meta');
var grade = ee.Image.cat(gLang, gUmd, gMeta);

// ============================================================================
// 5. PEGADAS GEDI COM OS VALORES DOS PRODUTOS (calculadas na ETAPA 1)
// ============================================================================
function classeAltura(h) {
  return ee.Algorithms.If(h.lt(5), '0-5 m',
         ee.Algorithms.If(h.lt(10), '5-10 m',
         ee.Algorithms.If(h.lt(20), '10-20 m', '>=20 m')));
}
var COLS_PRODUTOS = ['lang_h', 'gedi_h', 'meta_p95', 'meta_max', 'icea_lang', 'icea_gedi', 'icea_meta'];

function montarPegadas() {
  var pegadas = refImg.sample({
    region: aoi, projection: projGedi, geometries: true,
    dropNulls: true, tileScale: 16, seed: SEMENTE
  }).randomColumn('aleatorio', SEMENTE).sort('aleatorio').limit(N_MAX);

  // LANG e GEDI/Potapov: valor do pixel que contém o centro da pegada; ICEA: célula de 30 m
  var pilhaPonto = ee.Image.cat(
    ethcanopyheight.rename('lang_h'), ethSD.rename('lang_dp'),
    umdheight.rename('gedi_h'),
    grade.select(['icea_.*', 'fc_.*'])
  );
  var comProdutos = pilhaPonto.reduceRegions({
    collection: pegadas, reducer: ee.Reducer.first(), scale: 10, tileScale: 8
  });

  // META: estatísticas do 1 m dentro do círculo da pegada (raio 12,5 m)
  var redMeta = ee.Reducer.mean()
    .combine(ee.Reducer.max(), '', true)
    .combine(ee.Reducer.percentile([95]), '', true);
  var comMeta = canopyHeight.reduceRegions({
    collection: comProdutos.map(function (f) { return f.buffer(12.5); }),
    reducer: redMeta, crs: projMeta, tileScale: 8
  }).map(function (f) {
    var h    = ee.Number(f.get('h_ref'));
    var cobr = ee.Number(f.get('cob_ref'));
    return f.set({
      meta_media: f.get('mean'), meta_max: f.get('max'), meta_p95: f.get('p95'),
      icea_ref: cobr.multiply(h.divide(H_REF).min(1)),
      classe_h_ref: classeAltura(h)
    }).setGeometry(f.geometry().centroid(1));
  });

  // Amostra comum: completa = 1 quando os três produtos têm valor válido na pegada
  var filtroCompleta = ee.Filter.notNull(COLS_PRODUTOS);
  return comMeta.filter(filtroCompleta).map(function (f) { return f.set('completa', 1); })
    .merge(comMeta.filter(filtroCompleta.not()).map(function (f) { return f.set('completa', 0); }));
}

// ============================================================================
// 6. MÉTRICAS (usadas na ETAPA 2)
// ============================================================================
function metricas(fc, col, refCol, produto, estrato) {
  var v = fc.filter(ee.Filter.notNull([col, refCol])).map(function (f) {
    var d = ee.Number(f.get(col)).subtract(ee.Number(f.get(refCol)));
    return f.set({res: d, abs_res: d.abs(), sq_res: d.multiply(d)});
  });
  var n = v.size();
  var ajuste = ee.Dictionary(v.reduceColumns(ee.Reducer.linearFit(), [refCol, col]));
  var calc = ee.Dictionary(ee.Algorithms.If(n.gte(MIN_N), ee.Dictionary({
    media_ref: v.aggregate_mean(refCol),
    media_produto: v.aggregate_mean(col),
    vies: v.aggregate_mean('res'),
    mae: v.aggregate_mean('abs_res'),
    rmse: ee.Number(v.aggregate_mean('sq_res')).sqrt(),
    rrmse_pct: ee.Number(v.aggregate_mean('sq_res')).sqrt()
                 .divide(ee.Number(v.aggregate_mean(refCol))).multiply(100),
    r_pearson: ee.Dictionary(v.reduceColumns(ee.Reducer.pearsonsCorrelation(), [refCol, col])).get('correlation'),
    inclinacao: ajuste.get('scale'),
    intercepto: ajuste.get('offset')
  }), ee.Dictionary({obs: 'n insuficiente'})));
  return ee.Feature(null, {produto: produto, estrato: estrato, referencia: refCol, n: n}).set(calc);
}

// Presença de dossel (≥ LIMIAR_ARV) no produto × na referência GEDI
function concordancia(fc, col, produto, estrato) {
  var v  = fc.filter(ee.Filter.notNull([col, 'h_ref']));
  var P  = ee.Filter.gte(col, LIMIAR_ARV), R = ee.Filter.gte('h_ref', LIMIAR_ARV);
  var tp = ee.Number(v.filter(ee.Filter.and(P, R)).size());
  var fp = ee.Number(v.filter(ee.Filter.and(P, R.not())).size());
  var fn = ee.Number(v.filter(ee.Filter.and(P.not(), R)).size());
  var tn = ee.Number(v.filter(ee.Filter.and(P.not(), R.not())).size());
  var n  = ee.Number(v.size()).max(1).toDouble();
  var oa = tp.add(tn).divide(n);
  var prec = tp.toDouble().divide(tp.add(fp).max(1));
  var sens = tp.toDouble().divide(tp.add(fn).max(1));
  var pe = tp.add(fp).multiply(tp.add(fn)).add(fn.add(tn).multiply(fp.add(tn))).toDouble().divide(n.multiply(n));
  return ee.Feature(null, {
    produto: produto, estrato: estrato, n: v.size(),
    vp: tp, fp: fp, fn: fn, vn: tn,
    exatidao_global: oa, precisao: prec, sensibilidade: sens,
    f1: prec.multiply(sens).multiply(2).divide(prec.add(sens).max(1e-9)),
    kappa: oa.subtract(pe).divide(ee.Number(1).subtract(pe).max(1e-9))
  });
}

// Estratos: todas as pegadas e classes de altura da referência GEDI (sem mapa de uso da terra)
var ESTRATOS = [
  ['todos', null],
  ['ref_0-5m', ee.Filter.eq('classe_h_ref', '0-5 m')],
  ['ref_5-10m', ee.Filter.eq('classe_h_ref', '5-10 m')],
  ['ref_10-20m', ee.Filter.eq('classe_h_ref', '10-20 m')],
  ['ref_>=20m', ee.Filter.eq('classe_h_ref', '>=20 m')]
];
var PRODUTOS_H = [
  ['1_LANG_ETH2020_10m', 'lang_h'],
  ['2_GEDI_Potapov2019_30m', 'gedi_h'],
  ['3_META_1m_p95', 'meta_p95'],
  ['3_META_1m_max', 'meta_max']
];
var PRODUTOS_I = [
  ['1_LANG', 'icea_lang'], ['2_GEDI', 'icea_gedi'], ['3_META', 'icea_meta']
];

function sub(fc, filtro) { return filtro === null ? fc : fc.filter(filtro); }

// ============================================================================
// 7. ÁREAS (calculadas na ETAPA 1)
// ============================================================================
// T04 – área por classe de ICEA (0–0,2 … 0,8–1), dossel equivalente e ICEA médio
var ROT_ICEA = ee.Dictionary({'0': '0.0-0.2', '1': '0.2-0.4', '2': '0.4-0.6', '3': '0.6-0.8', '4': '0.8-1.0'});
function areasIndice(nome) {
  var icea   = grade.select('icea_' + nome);
  var classe = icea.multiply(5).floor().min(4).int().rename('classe');
  var g = AREA_HA.addBands(classe).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'classe'}),
    geometry: aoi, crs: 'EPSG:4326', crsTransform: GRADE, maxPixels: 1e13, tileScale: 8
  });
  var tot = ee.Image.cat(
      AREA_HA.multiply(grade.select('fc_' + nome)).rename('dossel_equivalente_ha'),
      AREA_HA.multiply(icea).rename('icea_x_area'),
      AREA_HA.updateMask(icea.mask()).rename('area_com_dado_ha')
    ).reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, crs: 'EPSG:4326',
                    crsTransform: GRADE, maxPixels: 1e13, tileScale: 8});
  var porClasse = ee.List(g.get('groups')).map(function (d) {
    d = ee.Dictionary(d);
    var c = ee.Number(d.get('classe')).format('%d');
    return ee.Feature(null, {produto: nome, tipo: 'classe_icea', classe: ROT_ICEA.get(c, c), area_ha: d.get('sum')});
  });
  return ee.List(porClasse)
    .add(ee.Feature(null, {produto: nome, tipo: 'dossel_equivalente', classe: 'fc>=' + LIMIAR_ARV + 'm',
                           area_ha: tot.get('dossel_equivalente_ha')}))
    .add(ee.Feature(null, {produto: nome, tipo: 'area_com_dado', classe: 'icea_valido',
                           area_ha: tot.get('area_com_dado_ha')}))
    // Atenção: nesta linha "area_ha" guarda o ICEA médio (adimensional), ponderado pela área com dado
    .add(ee.Feature(null, {produto: nome, tipo: 'icea_medio', classe: 'ponderado_por_area',
                           area_ha: ee.Number(tot.get('icea_x_area'))
                                      .divide(ee.Number(tot.get('area_com_dado_ha')))}));
}

// ============================================================================
// 8. EXPORTAÇÕES
// ============================================================================
function expTabela(fc, nome, formato) {
  Export.table.toDrive({collection: fc, description: PREFIXO + '_' + nome,
    folder: PASTA_DRIVE, fileNamePrefix: PREFIXO + '_' + nome, fileFormat: formato || 'CSV'});
}
function expImagem(img, nome, noData) {
  // "sem dado" explícito: células mascaradas (fora do corredor ou sem dado no produto) → noData
  Export.image.toDrive({image: img.unmask(noData, false), description: PREFIXO + '_' + nome, folder: PASTA_DRIVE,
    fileNamePrefix: PREFIXO + '_' + nome, region: REGIAO, crs: 'EPSG:4326', crsTransform: GRADE,
    maxPixels: 1e13, fileFormat: 'GeoTIFF', formatOptions: {cloudOptimized: true, noData: noData}});
}

var camadaPegadas;

if (ETAPA === 1) {
  // ---- A01 – pegadas com os valores dos produtos, gravadas como asset ----------
  var pegadasProdutos = montarPegadas();
  if (EXPORTAR_ASSET) {
    Export.table.toAsset({collection: pegadasProdutos, description: PREFIXO + '_A01_pegadas_asset',
                          assetId: ASSET_PEGADAS});
  }
  camadaPegadas = pegadasProdutos;

  // ---- T04 – áreas do ICEA --------------------------------------------------------
  var tabAreas = ee.FeatureCollection(areasIndice('lang').cat(areasIndice('gedi')).cat(areasIndice('meta')));

  // ---- T07 – área por estrato de altura (< 2 m, 2–13 m, > 13 m) em cada produto ----
  var somaEstratos = AREA_HA.multiply(grade.select('e_.*')).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: aoi, crs: 'EPSG:4326', crsTransform: GRADE,
    maxPixels: 1e13, tileScale: 8
  });
  var tabEstratos = ee.FeatureCollection(['lang', 'gedi', 'meta'].map(function (p) {
    return ee.Feature(null, {
      produto: p,
      herbaceo_lt2m_ha:   somaEstratos.get('e_herb_' + p),
      arbustivo_2a13m_ha: somaEstratos.get('e_arbu_' + p),
      arboreo_gt13m_ha:   somaEstratos.get('e_arbo_' + p)
    });
  }));

  expTabela(tabAreas,    'T04_areas_icea');
  expTabela(tabEstratos, 'T07_estratos_altura_por_produto');
  expTabela(corridor,    'V01_limite_corredor', 'SHP');

  // I01: ICEA e fc ×1000; hd em decímetros  → inteiros (uint16)
  expImagem(ee.Image.cat(
      grade.select(['icea_.*', 'fc_.*']).multiply(1000),
      grade.select('hd_.*').multiply(10)
    ).round().toUint16(), 'I01_icea_fc_hd_lang_gedi_meta_30m', 65535);
  // I02: altura de topo (máxima) de cada produto na célula de 30 m, em decímetros
  expImagem(grade.select('htopo_.*').multiply(10).round().toUint16(),
            'I02_altura_topo_lang_gedi_meta_30m', 65535);

  print('ETAPA 1: rode as tarefas na aba Tasks. Depois que o asset ' + ASSET_PEGADAS +
        ' terminar, mude ETAPA para 2.');
} else {
  // ---- Lê as pegadas gravadas na ETAPA 1 -------------------------------------------
  var pegadasAsset = ee.FeatureCollection(ASSET_PEGADAS);
  var amostra      = pegadasAsset.filter(ee.Filter.eq('completa', 1));   // amostra comum
  camadaPegadas = amostra;

  print('Pegadas GEDI gravadas', pegadasAsset.size(), 'na amostra comum', amostra.size());
  // Conferência da cobertura acima de 5 m: deve ser ≤ cobertura total (diferença média ≥ 0)
  print('Média de cover − ' + REF_COB + ' (deve ser ≥ 0)',
        amostra.map(function (f) {
          return f.set('dif', ee.Number(f.get('cover')).subtract(ee.Number(f.get('cob_ref'))));
        }).aggregate_mean('dif'));

  // T01 – altura
  var linhasT01 = [];
  ESTRATOS.forEach(function (e) {
    PRODUTOS_H.forEach(function (p) {
      linhasT01.push(metricas(sub(amostra, e[1]), p[1], 'h_ref', p[0], e[0]));
    });
  });
  // T02 – presença de dossel ≥ 5 m (só "todos": nas classes de altura a referência é constante)
  var linhasT02 = PRODUTOS_H.map(function (p) { return concordancia(amostra, p[1], p[0], 'todos'); });
  // T03 – ICEA de cada produto contra o ICEA de referência GEDI (cobertura > 5 m × altura)
  var linhasT03 = [];
  ESTRATOS.forEach(function (e) {
    PRODUTOS_I.forEach(function (p) {
      linhasT03.push(metricas(sub(amostra, e[1]), p[1], 'icea_ref', p[0], e[0]));
    });
  });

  // T06 – metadados
  var tabMeta = ee.FeatureCollection([ee.Feature(null, {
    data_execucao_utc: ee.Date(Date.now()).format('YYYY-MM-dd HH:mm:ss'),
    versao_script: '1.3',
    asset_corredor: 'projects/ee-davidaranha/assets/corredor_ecologico (partes poligonais)',
    lang: 'users/nlang/ETH_GlobalCanopyHeight_2020_10m_v1 (+SD); 255 mascarado',
    gedi_potapov: 'users/potapovpeter/GEDI_V27; 101/102 -> 0 m; 103 mascarado',
    meta: 'projects/meta-forest-monitoring-okw37/assets/CanopyHeight',
    referencia: 'LARSE/GEDI/GEDI02_A_002_MONTHLY + LARSE/GEDI/GEDI02_B_002_MONTHLY, pareados por delta_time',
    janela_gedi: GEDI_INI + ' a ' + GEDI_FIM, sens_min: SENS_MIN, so_noite: SO_NOITE,
    ref_altura: REF_RH + ' (negativo -> 0)', ref_cobertura: REF_COB, tol_delta_time_s: TOL_DT,
    n_pegadas_gravadas: pegadasAsset.size(), n_amostra_comum: amostra.size(),
    n_max: N_MAX, min_n: MIN_N,
    limiar_arvore_m: LIMIAR_ARV, h_ref_m: H_REF,
    formula_icea: 'fc * min(hd / H_REF, 1)',
    formula_icea_ref: REF_COB + ' * min(h_ref / H_REF, 1)',
    estratos: 'classes de altura da referencia GEDI (sem mapa de uso da terra)',
    grade: 'EPSG:4326 ' + GRADE.join(','),
    semente: SEMENTE
  })]);

  // T05 SHP: amostra comum, campos com até 10 caracteres
  var CAMPOS_SHP = ['h_ref', 'cob_ref', 'lang_h', 'gedi_h', 'meta_p95', 'meta_max',
                    'icea_ref', 'icea_lang', 'icea_gedi', 'icea_meta', 'classe_h_ref'];
  var NOMES_SHP  = ['h_ref', 'cob_ref', 'lang_h', 'gedi_h', 'meta_p95', 'meta_max',
                    'icea_ref', 'icea_lang', 'icea_gedi', 'icea_meta', 'classe_h'];

  expTabela(ee.FeatureCollection(linhasT01), 'T01_desempenho_altura');
  expTabela(ee.FeatureCollection(linhasT02), 'T02_concordancia_cobertura');
  expTabela(ee.FeatureCollection(linhasT03), 'T03_desempenho_icea');
  expTabela(pegadasAsset, 'T05_pegadas_gedi_produtos');
  expTabela(amostra.select(CAMPOS_SHP, NOMES_SHP), 'T05_pegadas_gedi_produtos_shp', 'SHP');
  expTabela(tabMeta, 'T06_metadados');

  // I03 – fração da célula de 30 m com dado no LANG (pixels de 10 m sem dado ou = 255 contam como 0).
  // No Python, célula com fração 0 = "sem dado" no LANG (igual ao I01 v1.2), e não ICEA 0.
  if (EXPORTAR_I03) {
    var langValido = langBruto.lt(255).unmask(0).toFloat().setDefaultProjection(projLang)
      .reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 2048})
      .reproject(PROJ30).clip(aoi);
    expImagem(langValido.multiply(100).round().toUint8().rename('lang_valido_pct'),
              'I03_lang_fracao_valida_30m', 255);
  }
}

// ============================================================================
// 9. VISUALIZAÇÃO (ordem do estudo: LANG, GEDI, META)
// ============================================================================
Map.centerObject(corridor, 9);
if (MOSTRAR_MAPA) {
  Map.setOptions('SATELLITE');
  var visH    = {min: 0, max: 25, palette: palettes.matplotlib.viridis[7]};
  var visICEA = {min: 0, max: 1, palette: ['f7fcf5', 'c7e9c0', '74c476', '238b45', '00441b']};

  // Alturas originais: têm pirâmides próprias e funcionam em qualquer zoom
  Map.addLayer(ethcanopyheight, visH, '1 LANG – altura ETH 2020 (10 m)', false);
  Map.addLayer(umdheight,       visH, '2 GEDI – altura Potapov 2019 (30 m)', false);
  Map.addLayer(canopyHeight,    visH, '3 META – altura Meta/WRI (1 m)');
  Map.addLayer(treenotree, {palette: ['fde725']}, 'META – dossel ≥ ' + LIMIAR_ARV + ' m (1 m)', false);

  // Camadas ICEA: agregação forçada a 30 m. No mapa interativo só cabem com zoom alto;
  // abaixo do zoom mínimo elas são desligadas automaticamente (as exportações não são afetadas).
  var CAMADAS_ZOOM = [];
  function camadaComZoom(img, vis, nome, zoomMin) {
    var camada = ui.Map.Layer(img, vis, nome + ' – ligar com zoom ≥ ' + zoomMin, false);
    Map.layers().add(camada);
    CAMADAS_ZOOM.push({camada: camada, zoomMin: zoomMin});
  }
  camadaComZoom(grade.select('icea_lang'), visICEA, '1 LANG – ICEA (30 m)', 11);
  camadaComZoom(grade.select('icea_gedi'), visICEA, '2 GEDI – ICEA (30 m)', 11);
  camadaComZoom(grade.select('icea_meta'), visICEA, '3 META – ICEA (30 m)', 14);

  Map.onChangeZoom(function (z) {
    CAMADAS_ZOOM.forEach(function (c) {
      if (z < c.zoomMin && c.camada.getShown()) { c.camada.setShown(false); }
    });
  });
  Map.add(ui.Label('Camadas ICEA: aproxime o mapa (LANG/GEDI zoom ≥ 11, META zoom ≥ 14) antes de ligar.',
                   {position: 'bottom-left', fontSize: '11px'}));
  Map.addLayer(camadaPegadas, {color: 'ff0000'}, 'Pegadas GEDI de referência', false);
  Map.addLayer(ee.Image().byte().paint({featureCollection: corridor, color: 1, width: 2}),
               {palette: ['ffffff']}, 'Limite do corredor');
} else {
  Map.addLayer(ee.Image().byte().paint({featureCollection: corridor, color: 1, width: 2}),
               {palette: ['000000']}, 'Limite do corredor');
  print('MOSTRAR_MAPA = false: camadas desligadas para poupar a cota de EECU.');
}
