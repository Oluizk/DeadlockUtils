// ===================== Configurações: valores, salvar/carregar, aplicar e a lista de opções =====================
// Tudo vale na hora. Para guardar entre partidas usa a ponte (CitadelHTMLPanel com a página hospedada,
// ver 60-ponte.js e README "Ativar o tracker"): o Panorama do Deadlock não tem armazenamento próprio.
// Sem ponte, as configurações valem até fechar o jogo.
//
// Para criar uma configuração nova:
//   1) valor padrão em AJUSTES_PADRAO;
//   2) uma linha em SECOES_CFG (a central de configurações, 76-central.js, desenha sozinha);
//   3) textos "cfg.<id>" e "cfg.<id>.desc" em data/textos.json (nos 4 idiomas);
//   4) usar ajustes.<id> no módulo (e, se precisar reagir na hora, em aplicarAjustes).

var TAMANHOS_MAPA = [700, 820, 940]; // px do #hud_minimap aberto; tem que bater com .DUMapaT* no estilo.css
var AJUSTES_PADRAO = {
  // ---- geral
  idioma: "",            // en, pt, es, ru; "" = o gravado no .vpk (inglês, ou o que o install.bat escolheu)
  abaLoja: true,         // aba "Deadlock Utils" na loja
  faixaTab: true,        // itens recomendados ao segurar Tab
  buildRecomendada: false, // seção "Build Recomendada" (loja e Tab); desligada: o Tab mostra o guia escolhido no jogo
  avisoPerigo: true,     // aviso quando um inimigo compra item perigoso
  avisoSeg: CONFIG.segundosAviso || 7,
  avisoSom: true,
  // ---- mapa grande (M)
  mapaTam: 820,
  mapaHerois: "0.5",     // escala dos outros heróis no mapa grande
  mapaEu: "4.5%",        // seu ícone no mapa grande (o jogo usa 15%)
  mapaPainel: true,      // painel lateral com timers e filtros
  mapaCortaTopo: true,   // esconde os detalhes do placar no topo com o mapa aberto
  marcaSeg: CONFIG.segundosMarcaMapa || 60,
  mapaOpac: 100,         // opacidade do mapa grande, em %
  miniOpac: 100,         // opacidade do minimapa normal, em %
  // ---- minimapa
  miniEscala: 100,       // minimapa normal, em %
  miniEu: "9%",          // seu ícone no minimapa normal (o jogo usa 15%)
  miniPontos: 1,         // pontos no minimapa normal: 0 desligado, 1..3 tamanho dos ícones
  miniPontosAntes: 1,    // tamanho escolhido antes de desligar (o botão do painel do mapa religa nele)
  // ---- mira (80-mira.js)
  mira: false,
  miraEstilo: "cruzPonto",
  miraCor: "#00FF7F",
  miraTam: 7,            // comprimento das linhas
  miraEsp: 2,            // espessura
  miraGap: 4,            // espaço entre o centro e as linhas
  miraPonto: 2,          // diâmetro do ponto central
  miraRaio: 10,          // raio do círculo
  miraOpac: 100,
  miraContorno: true,
  miraContornoEsp: 1,
  miraContornoCor: "#000000",
  miraEsconderJogo: true, // esconde o retículo do jogo (hitmarker e munição continuam)
  // ---- vida (82-vida.js)
  vidaModo: "faixas",    // jogo | faixas | gradiente | fixa
  vidaCorFixa: "#5FE69E",
  vidaCorAlta: "#FFEFD7", // 75% ou mais (a cor do próprio jogo)
  vidaCorMedia: "#F5D33D",
  vidaCorBaixa: "#F28A2E",
  vidaCorCritica: "#FF3B30",
  vidaPulsar: true,
  vidaNumero: true,
  vidaInstantanea: false, // barra muda na hora (sem a animação de encher/esvaziar do jogo)
  vidaMira: false,      // barrinha de vida perto da mira
  vidaMiraPos: "abaixo",
  vidaMiraLarg: 120,
  vidaMiraTexto: "numero",
  vidaMiraAte: 100,      // só mostra abaixo deste % (100 = sempre)
  // ---- timers dos objetivos (84-timers.js): no placar do topo, no minimapa e no mapa M
  tUrna: true,           // coluna da urna ao lado do Rejuvenator
  tPonte: true,          // coluna dos buffs da ponte
  tAlmas: true,          // vantagem de almas ao lado do número de almas do time
  tMinimapa: true,       // tempo do buff em cima das pontes no minimapa (Tab e mapa M)
  timersAlerta: 30,
  timersSom: true,
  timersChat: true,
  ponteInicio: CONFIG.buffPonteInicio || 300,
  ponteIntervalo: CONFIG.buffPonteIntervalo || 300,
  urnaInicio: CONFIG.urnaInicio || 600,
  urnaIntervalo: CONFIG.urnaIntervalo || 300,
  // ---- placar do topo do jogo (86-topo.js)
  topoNivel: true,
  topoNivelCor: true,
  topoVisao: true,
  // ---- tracker e outros
  contaSteam: 0,         // código de amigo da Steam (SteamID3) para o tracker; 0 = o do build (data/config.json)
  metodoCompra: "",      // jeito de pedir compra que o jogo aceitou (id em 25-nativos.js), descoberto na 1ª compra
  teclas: {
    mapa: (CONFIG.teclas || {}).mapa || "",
    tracker: (CONFIG.teclas || {}).tracker || "",
    central: (CONFIG.teclas || {}).central || "",
    desligar: (CONFIG.teclas || {}).desligar || "",
  },
};
// Teclas que dá para escolher. F7 fica de fora (console do jogo) e T (Push-to-Talk). O nome é o do
// $.RegisterKeyBind sem o "key_" (panorama.dll: key_rshift, key_ralt...).
var TECLAS_ESCOLHA = ["RSHIFT", "RALT", "F1", "F2", "F3", "F4", "F5", "F6", "F8", "F9", "F10", "F11", "F12",
  "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "U", "Y"];
function nomeTecla(t) {
  var k = String(t || "").toLowerCase();
  return temTexto("tecla." + k) ? T("tecla." + k) : String(t || "").toUpperCase();
}

function copiaAjustes(o) { return JSON.parse(JSON.stringify(o)); }
var ajustes = copiaAjustes(AJUSTES_PADRAO);
var estadoAjustes = { salvo: false, carregado: false, salvarEm: 0 };

// "teclas.mapa" -> ajustes.teclas.mapa; o resto é direto.
function lerAjuste(id) {
  var i = String(id).indexOf(".");
  return i < 0 ? ajustes[id] : (ajustes[id.slice(0, i)] || {})[id.slice(i + 1)];
}
function gravarAjuste(id, v) {
  var i = String(id).indexOf(".");
  if (i < 0) ajustes[id] = v;
  else (ajustes[id.slice(0, i)] = ajustes[id.slice(0, i)] || {})[id.slice(i + 1)] = v;
}

// Junta o que veio salvo (ou de um código importado) com o padrão: só chaves conhecidas e do mesmo tipo.
function misturarAjustes(salvo) {
  Object.keys(AJUSTES_PADRAO).forEach(function (k) {
    if (!(k in salvo)) return;
    if (k === "teclas") {
      Object.keys(salvo.teclas || {}).forEach(function (t) { if (t in ajustes.teclas && typeof salvo.teclas[t] === "string") ajustes.teclas[t] = salvo.teclas[t]; });
    } else if (typeof salvo[k] === typeof AJUSTES_PADRAO[k]) ajustes[k] = salvo[k];
  });
}

function carregarAjustes() {
  aplicarAjustes();
  if (!CONFIG.urlPonte) { estadoAjustes.carregado = true; return; }
  ponteLer("du_ajustes", function (ok, valor) {
    estadoAjustes.carregado = true;
    if (!ok || !valor) return;
    try {
      misturarAjustes(JSON.parse(valor));
      estadoAjustes.salvo = true;
      aplicarAjustes();
      atualizarCentral();
    } catch (e) { log("configurações salvas inválidas: " + e); }
  });
}

// Aplica na hora e salva um pouco depois (vários cliques seguidos num botão + viram um salvamento só).
function salvarAjustes() {
  aplicarAjustes();
  estadoAjustes.salvo = false;
  atualizarCentral();
  if (!CONFIG.urlPonte) return;
  var em = estadoAjustes.salvarEm = Date.now();
  $.Schedule(0.8, function () {
    if (em !== estadoAjustes.salvarEm) return;
    ponteSalvar("du_ajustes", JSON.stringify(ajustes), function (ok) { estadoAjustes.salvo = ok; desenharStatusCentral(); });
  });
}

// Aplica no HUD: variáveis, aba da loja e Tab, os módulos opcionais (classes na raiz, redesenho) e teclas novas.
function aplicarAjustes() {
  CONFIG.accountId = Number(ajustes.contaSteam) || (DU_DATA.config || {}).accountId || null;
  CONFIG.segundosAviso = ajustes.avisoSeg;
  // aba da loja e Tab
  if (valido(loja.botao)) mostrarPainel(loja.botao, modLigado && ajustes.abaLoja);
  if (!ajustes.abaLoja && loja.ativa) ativarAba(false);
  faixa.assinatura = "";
  if (loja.ativa && loja.vista === "recs" && ultimoResultado) desenharAba(ultimoResultado, ultimaLeitura); // Build Recomendada ligada/desligada
  cadaModulo("aplicar"); // mapa, mira, vida, timers, topo (00-base.js)
  Object.keys(ajustes.teclas).forEach(function (a) { registrarTecla(ajustes.teclas[a]); });
  trocarIdioma(ajustes.idioma);
}

// Troca o idioma na hora: traduz as regras de novo, refaz os textos da aba da loja e apaga os painéis
// com texto (faixa do Tab, aviso, tooltip, mapa, tracker, central), que são recriados quando aparecem.
function trocarIdioma(novo) {
  if (["en", "pt", "es", "ru"].indexOf(novo) < 0) novo = idiomaDoMod();
  if (novo === IDIOMA) return;
  IDIOMA = novo;
  dados = dadosNoIdioma(IDIOMA);
  cadaModulo("idioma"); // o mapa traduz as camadas e apaga o painel dele
  fecharTracker();
  esconderDica();
  var centralAberta = central.aberto;
  if (centralAberta) fecharCentral();
  [faixa, aviso, dicaItem, tracker, central].forEach(function (o) {
    if (valido(o.painel)) o.painel.DeleteAsync(0);
    o.painel = null;
  });
  faixa.visivel = false;
  editor.rascunho = null;
  assinaturaAnterior = "";
  traduzirAbaLoja();
  if (ultimaLeitura) atualizarRecomendacoes(ultimaLeitura, true);
  if (centralAberta) abrirCentral();
  log("idioma: " + IDIOMA);
}

// Botões +/- de tamanho no painel do mapa.
function mudarTamanhoMapa(passo) {
  var i = TAMANHOS_MAPA.indexOf(ajustes.mapaTam);
  var n = Math.max(0, Math.min(TAMANHOS_MAPA.length - 1, (i < 0 ? 1 : i) + passo));
  if (TAMANHOS_MAPA[n] === ajustes.mapaTam) return;
  ajustes.mapaTam = TAMANHOS_MAPA[n];
  salvarAjustes();
}

// Botões -/+ de transparência no painel do mapa. id = "mapaOpac" ou "miniOpac"; passo -1 = mais
// transparente. Anda pelos valores de OPACIDADES_MAPA (os mesmos da central).
function mudarOpacidadeMapa(id, passo) {
  var valores = OPACIDADES_MAPA.map(function (o) { return o[0]; }).sort(function (a, b) { return a - b; });
  var i = valores.indexOf(ajustes[id]);
  var n = Math.max(0, Math.min(valores.length - 1, (i < 0 ? valores.length - 1 : i) + passo));
  if (valores[n] === ajustes[id]) return;
  ajustes[id] = valores[n];
  salvarAjustes();
}

// Código de amigo da Steam = SteamID3 (número até 10 dígitos). Aceita também [U:1:N] e o link do perfil
// com o SteamID64 (7656119...), convertido sem perder precisão (64 bits não cabem num Number).
function lerContaSteam(txt) {
  var s = String(txt || "").trim();
  var m = /\[U:1:(\d+)\]/.exec(s);
  if (m) return Number(m[1]);
  m = /(7656119\d{10})/.exec(s);
  if (m) {
    var alto = Number(m[1].slice(0, -10)), baixo = Number(m[1].slice(-10));
    var id = (alto - 7656119) * 1e10 + baixo - 7960265728;
    return id > 0 ? id : 0;
  }
  return /^\d{1,10}$/.test(s) ? Number(s) : 0;
}

// ---------- backup: código "DUC1:<base64>" com tudo que é diferente do padrão (e o que os módulos juntam) ----------
// Pessoais: não vão no código e não mudam ao importar nem ao restaurar.
var AJUSTES_PESSOAIS = { contaSteam: 1, metodoCompra: 1, miniPontosAntes: 1, idioma: 1 };
function manterPessoais(fn) {
  var guardados = {};
  Object.keys(AJUSTES_PESSOAIS).forEach(function (k) { guardados[k] = ajustes[k]; });
  fn();
  Object.keys(guardados).forEach(function (k) { ajustes[k] = guardados[k]; });
}
function codigoDeAjustes() {
  var dif = {};
  Object.keys(AJUSTES_PADRAO).forEach(function (k) {
    if (AJUSTES_PESSOAIS[k]) return;
    if (JSON.stringify(ajustes[k]) !== JSON.stringify(AJUSTES_PADRAO[k])) dif[k] = ajustes[k];
  });
  var obj = { v: 1, a: dif };
  cadaModulo("exportar", obj); // filtros do mapa
  return "DUC1:" + paraBase64(JSON.stringify(obj));
}
function importarAjustes(codigo) {
  var t = String(codigo || "").trim();
  var i = t.indexOf("DUC1:");
  if (i < 0) throw new Error(T("cfg.codigo.prefixo"));
  var obj = JSON.parse(deBase64(t.slice(i + 5).split(/\s/)[0]));
  if (!obj || typeof obj.a !== "object") throw new Error(T("cfg.codigo.vazio"));
  manterPessoais(function () {
    ajustes = copiaAjustes(AJUSTES_PADRAO);
    misturarAjustes(obj.a);
  });
  cadaModulo("importar", obj); // filtros do mapa
  salvarAjustes();
}
function restaurarTudo() {
  manterPessoais(function () { ajustes = copiaAjustes(AJUSTES_PADRAO); });
  central.teclaAberta = "";
  salvarAjustes();
}

// ======================= lista de opções (desenhada pela central, 76-central.js) =======================
// Cada seção: id, ícone (caminho em panorama/images), tema do cartaz, prévia opcional e itens.
// Item { grupo: "chave" } = título de um bloco. As outras linhas têm tipo:
//   liga                 interruptor sim/não
//   opcoes               botões; opcoes: [[valor, chaveDoTexto], ...] (cru: true = texto sem tradução)
//   numero               - barra +; min, max, passo, unidade ou fmt: "relogio"
//   cor                  paleta + campo #RRGGBB
//   tecla               escolhe uma tecla (id "teclas.<ação>")
//   acoes                botões; acoes: [[chaveDoTexto, função], ...]
//   conta, pontos, codigo, sobre: linhas especiais da própria central
// Nome e descrição: "cfg.<id>" e "cfg.<id>.desc", ou as chaves em nome/desc. mostrarSe: function () -> bool.
// modulo: "<id>" (na seção ou na linha) = só aparece se o módulo existe nesta versão (00-base.js, registrarModulo).
var CORES_PALETA = ["#FFFFFF", "#FFEFD7", "#00FF7F", "#5FE69E", "#00E5FF", "#3D9BFF", "#B388FF", "#FF4FD8", "#FF3B30", "#FF9500", "#F5D33D", "#000000"];
// Transparência do mapa: abaixo de 40% os ícones somem em fundo claro. Os valores precisam ter as
// classes DU_miniOpac<n> / DU_mapaOpac<n> correspondentes no estilo.css.
var OPACIDADES_MAPA = [[100, "cfg.opac.opaco"], [85, "85%"], [70, "70%"], [55, "55%"], [40, "40%"]];
function ehLigado(id) { return function () { return !!ajustes[id]; }; }
function estiloMiraTem(parte) { return function () { return !!ajustes.mira && estiloMira(ajustes.miraEstilo)[parte]; }; }
function vidaComCores() { return ajustes.vidaModo === "faixas" || ajustes.vidaModo === "gradiente"; }

var SECOES_CFG = [
  { id: "geral", icone: "icons/icon_gear.vsvg", tema: "vermelho", itens: [
    { grupo: "cfg.g.idioma" },
    { id: "idioma", tipo: "opcoes", nome: "aj.idioma.nome", desc: "aj.idioma.desc", cru: true, chaves: "cfg.idioma.chaves",
      opcoes: [["en", "English"], ["pt", "Português (BR)"], ["es", "Español"], ["ru", "Русский"]], valor: function () { return IDIOMA; } },
    { grupo: "cfg.g.modulos" },
    { id: "abaLoja", tipo: "liga" },
    { id: "faixaTab", tipo: "liga" },
    { id: "buildRecomendada", tipo: "liga" },
    { id: "avisoPerigo", tipo: "liga" },
    { id: "avisoSeg", tipo: "numero", min: 3, max: 15, passo: 1, unidade: " s", mostrarSe: ehLigado("avisoPerigo") },
    { id: "avisoSom", tipo: "liga", mostrarSe: ehLigado("avisoPerigo") },
  ] },
  { id: "mira", modulo: "mira", icone: "icons/properties/gun.vsvg", tema: "teal", previa: "mira", itens: [
    { grupo: "cfg.g.mira" },
    { id: "mira", tipo: "liga" },
    { tipo: "acoes", nome: "cfg.miraPresets", desc: "cfg.miraPresets.desc", acoes: [
      ["cfg.preset.classica", function () { aplicarPresetMira("classica"); }],
      ["cfg.preset.competitiva", function () { aplicarPresetMira("competitiva"); }],
      ["cfg.preset.ponto", function () { aplicarPresetMira("ponto"); }],
      ["cfg.preset.circulo", function () { aplicarPresetMira("circulo"); }],
      ["cfg.preset.seta", function () { aplicarPresetMira("seta"); }]] },
    { id: "miraEstilo", tipo: "opcoes", mostrarSe: ehLigado("mira"), opcoes: [["cruz", "cfg.estilo.cruz"], ["cruzPonto", "cfg.estilo.cruzPonto"],
      ["ponto", "cfg.estilo.ponto"], ["circulo", "cfg.estilo.circulo"], ["circuloPonto", "cfg.estilo.circuloPonto"], ["t", "cfg.estilo.t"],
      ["x", "cfg.estilo.x"], ["seta", "cfg.estilo.seta"]] },
    { id: "miraCor", tipo: "cor", mostrarSe: ehLigado("mira") },
    { grupo: "cfg.g.miraForma" },
    { id: "miraTam", tipo: "numero", min: 1, max: 40, passo: 1, unidade: " px", mostrarSe: estiloMiraTem("linhas") },
    { id: "miraEsp", tipo: "numero", min: 1, max: 10, passo: 1, unidade: " px", mostrarSe: function () { var e = estiloMira(ajustes.miraEstilo); return ajustes.mira && (e.linhas || e.anel); } },
    { id: "miraGap", tipo: "numero", min: 0, max: 30, passo: 1, unidade: " px", mostrarSe: function () { return ajustes.mira && estiloMira(ajustes.miraEstilo).linhas && ajustes.miraEstilo !== "seta"; } },
    { id: "miraRaio", tipo: "numero", min: 3, max: 40, passo: 1, unidade: " px", mostrarSe: estiloMiraTem("anel") },
    { id: "miraPonto", tipo: "numero", min: 1, max: 12, passo: 1, unidade: " px", mostrarSe: estiloMiraTem("ponto") },
    { id: "miraOpac", tipo: "numero", min: 10, max: 100, passo: 10, unidade: "%", mostrarSe: ehLigado("mira") },
    { grupo: "cfg.g.miraContorno" },
    { id: "miraContorno", tipo: "liga", mostrarSe: ehLigado("mira") },
    { id: "miraContornoEsp", tipo: "numero", min: 1, max: 4, passo: 1, unidade: " px", mostrarSe: function () { return ajustes.mira && ajustes.miraContorno; } },
    { id: "miraContornoCor", tipo: "cor", mostrarSe: function () { return ajustes.mira && ajustes.miraContorno; } },
    { grupo: "cfg.g.miraJogo" },
    { id: "miraEsconderJogo", tipo: "liga", mostrarSe: ehLigado("mira") },
  ] },
  { id: "vida", modulo: "vida", icone: "icons/properties/health.vsvg", tema: "vitalidade", previa: "vida", itens: [
    { grupo: "cfg.g.vidaBarra" },
    { id: "vidaModo", tipo: "opcoes", opcoes: [["jogo", "cfg.vidaModo.jogo"], ["faixas", "cfg.vidaModo.faixas"], ["gradiente", "cfg.vidaModo.gradiente"], ["fixa", "cfg.vidaModo.fixa"]] },
    { id: "vidaCorFixa", tipo: "cor", mostrarSe: function () { return ajustes.vidaModo === "fixa"; } },
    { id: "vidaCorAlta", tipo: "cor", mostrarSe: vidaComCores },
    { id: "vidaCorMedia", tipo: "cor", mostrarSe: vidaComCores },
    { id: "vidaCorBaixa", tipo: "cor", mostrarSe: vidaComCores },
    { id: "vidaCorCritica", tipo: "cor", mostrarSe: vidaComCores },
    { id: "vidaPulsar", tipo: "liga", mostrarSe: function () { return ajustes.vidaModo !== "jogo"; } },
    { id: "vidaNumero", tipo: "liga", mostrarSe: function () { return ajustes.vidaModo !== "jogo"; } },
    { id: "vidaInstantanea", tipo: "liga" },
    { grupo: "cfg.g.vidaMira" },
    { id: "vidaMira", tipo: "liga" },
    { id: "vidaMiraPos", tipo: "opcoes", mostrarSe: ehLigado("vidaMira"), opcoes: [["abaixo", "cfg.pos.abaixo"], ["esquerda", "cfg.pos.esquerda"], ["direita", "cfg.pos.direita"]] },
    { id: "vidaMiraLarg", tipo: "numero", min: 60, max: 260, passo: 20, unidade: " px", mostrarSe: ehLigado("vidaMira") },
    { id: "vidaMiraTexto", tipo: "opcoes", mostrarSe: ehLigado("vidaMira"), opcoes: [["nada", "cfg.vidaMiraTexto.nada"], ["numero", "cfg.vidaMiraTexto.numero"], ["pct", "cfg.vidaMiraTexto.pct"]] },
    { id: "vidaMiraAte", tipo: "opcoes", mostrarSe: ehLigado("vidaMira"), opcoes: [[100, "cfg.vidaMiraAte.sempre"], [75, "cfg.vidaMiraAte.75"], [50, "cfg.vidaMiraAte.50"], [30, "cfg.vidaMiraAte.30"]] },
  ] },
  { id: "timers", modulo: "timers", icone: "icons/icon_watch.vsvg", tema: "arma", itens: [
    { grupo: "cfg.g.topoTimers" },
    { id: "tUrna", tipo: "liga" },
    { id: "tPonte", tipo: "liga" },
    { id: "tAlmas", tipo: "liga" },
    { id: "tMinimapa", tipo: "liga" },
    { grupo: "cfg.g.topo" },
    { id: "topoNivel", tipo: "liga" },
    { id: "topoNivelCor", tipo: "liga", mostrarSe: ehLigado("topoNivel") },
    { id: "topoVisao", tipo: "liga" },
    { grupo: "cfg.g.timersAlerta" },
    { id: "timersAlerta", tipo: "opcoes", opcoes: [[0, "aj.desligado"], [15, "15 s"], [30, "30 s"], [60, "1 min"]], cruParcial: true },
    { id: "timersSom", tipo: "liga", mostrarSe: function () { return ajustes.timersAlerta > 0; } },
    { id: "timersChat", tipo: "liga" },
    { grupo: "cfg.g.tempos" },
    { id: "ponteInicio", tipo: "numero", min: 0, max: 1200, passo: 30, fmt: "relogio" },
    { id: "ponteIntervalo", tipo: "numero", min: 60, max: 900, passo: 30, fmt: "relogio" },
    { id: "urnaInicio", tipo: "numero", min: 0, max: 1800, passo: 30, fmt: "relogio" },
    { id: "urnaIntervalo", tipo: "numero", min: 60, max: 900, passo: 30, fmt: "relogio" },
  ] },
  { id: "mapa", modulo: "mapa", icone: "icons/icon_lanes.vsvg", tema: "teal", itens: [
    { grupo: "cfg.g.transparencia" },
    { id: "mapaOpac", tipo: "opcoes", cruParcial: true, opcoes: OPACIDADES_MAPA },
    { id: "miniOpac", tipo: "opcoes", cruParcial: true, opcoes: OPACIDADES_MAPA },
    { grupo: "aj.mapaGrande" },
    { id: "mapaTam", tipo: "opcoes", nome: "aj.tamMapa", desc: "aj.tamMapa.desc", opcoes: [[700, "aj.pequeno"], [820, "aj.medio"], [940, "aj.grande"]] },
    { id: "mapaHerois", tipo: "opcoes", nome: "aj.herois", desc: "aj.herois.desc", opcoes: [["0.35", "aj.pequenos"], ["0.5", "aj.medios"], ["0.75", "aj.grandes"], ["1", "aj.doJogo"]] },
    { id: "mapaEu", tipo: "opcoes", nome: "aj.eu", desc: "aj.eu.desc", opcoes: [["3.5%", "aj.pequeno"], ["4.5%", "aj.medio"], ["7%", "aj.grande"], ["15%", "aj.doJogo"]] },
    { id: "mapaPainel", tipo: "liga", nome: "aj.painel", desc: "aj.painel.desc" },
    { id: "mapaCortaTopo", tipo: "liga", nome: "aj.topo", desc: "aj.topo.desc" },
    { id: "marcaSeg", tipo: "opcoes", nome: "aj.marca", desc: "aj.marca.desc", cruParcial: true, opcoes: [[15, "15 s"], [30, "30 s"], [60, "1 min"], [120, "2 min"]] },
    { grupo: "aj.minimapa" },
    { id: "miniEscala", tipo: "opcoes", nome: "aj.tamMini", desc: "aj.tamMini.desc", cruParcial: true, opcoes: [[100, "aj.normal"], [115, "+15%"], [130, "+30%"], [150, "+50%"]] },
    { id: "miniEu", tipo: "opcoes", nome: "aj.miniEu", desc: "aj.miniEu.desc", opcoes: [["6%", "aj.pequeno"], ["9%", "aj.medio"], ["12%", "aj.grande"], ["15%", "aj.doJogo"]] },
  ] },
  { id: "pontos", modulo: "pontos", icone: "icons/icon_grid.vsvg", tema: "vitalidade", itens: [
    { grupo: "aj.pontos" },
    { id: "miniPontos", tipo: "opcoes", nome: "aj.miniPontos", desc: "aj.miniPontos.desc", opcoes: [[0, "aj.desligado"], [1, "aj.pequenos"], [2, "aj.medios"], [3, "aj.grandes"]] },
    { tipo: "pontos", nome: "cfg.pontosLista", desc: "aj.pontos.sub" },
    { tipo: "acoes", nome: "aj.pontosPadrao", desc: "cfg.pontosPadrao.desc", acoes: [["aj.pontosPadrao", function () { restaurarPontos(); }]] },
  ] },
  { id: "atalhos", icone: "icons/keyboard.vsvg", tema: "arma", itens: [
    { grupo: "aj.atalhos" },
    { id: "teclas.mapa", tipo: "tecla", nome: "aj.tecla.mapa", modulo: "mapa" },
    { id: "teclas.tracker", tipo: "tecla", nome: "aj.tecla.tracker" },
    { id: "teclas.central", tipo: "tecla", nome: "cfg.tecla.central" },
    { id: "teclas.desligar", tipo: "tecla", nome: "aj.tecla.desligar" },
  ] },
  { id: "tracker", icone: "icons/icon_graph.vsvg", tema: "vermelho", itens: [
    { grupo: "aj.tracker" },
    { id: "contaSteam", tipo: "conta", nome: "aj.conta", desc: "aj.conta.desc" },
  ] },
  { id: "backup", icone: "icons/share.vsvg", tema: "escuro", itens: [
    { grupo: "cfg.g.backup" },
    { tipo: "codigo", nome: "cfg.codigo", desc: "cfg.codigo.desc" },
    { tipo: "acoes", nome: "aj.restaurar", desc: "cfg.restaurar.desc", acoes: [["aj.restaurar", restaurarTudo]] },
    { grupo: "cfg.g.sobre" },
    { tipo: "sobre", nome: "cfg.sobre" },
  ] },
];
// Seções e linhas que existem nesta versão (o addon do QOL não tem mira, vida, timers nem mapa).
function cfgExiste(x) { return !x.modulo || temModulo(x.modulo); }
function secoesCfg() { return SECOES_CFG.filter(cfgExiste); }
function secaoCfg(id) { var lista = secoesCfg(); return lista.filter(function (s) { return s.id === id; })[0] || lista[0]; }

