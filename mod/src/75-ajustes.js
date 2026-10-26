// ===================== Configurações (aba da loja > Configurações) =====================
// Tudo vale na hora. Para guardar entre partidas usa a ponte (CitadelHTMLPanel com a página hospedada,
// ver 60-ponte.js e README "Ativar o tracker"): o Panorama do Deadlock não tem armazenamento próprio.
// Sem ponte, as configurações valem até fechar o jogo.

var TAMANHOS_MAPA = [700, 820, 940]; // px do #hud_minimap aberto; tem que bater com .DUMapaT* no estilo.css
var AJUSTES_PADRAO = {
  mapaTam: 820,          // mapa grande
  mapaHerois: "0.5",     // escala dos outros heróis no mapa grande
  mapaEu: "4.5%",        // seu ícone no mapa grande (o jogo usa 15%)
  miniEu: "9%",          // seu ícone no minimapa normal (o jogo usa 15%)
  mapaPainel: true,      // painel lateral com timers e filtros
  mapaCortaTopo: true,   // esconde os detalhes do placar no topo com o mapa aberto
  marcaSeg: (DU_DATA.config || {}).segundosMarcaMapa || 60,
  miniEscala: 100,       // minimapa normal, em %
  miniPontos: 1,         // pontos no minimapa normal: 0 desligado, 1..3 tamanho dos ícones
  contaSteam: 0,         // código de amigo da Steam (SteamID3) para o tracker; 0 = o do build (data/config.json)
  miniPontosAntes: 1,    // tamanho escolhido antes de desligar (o botão do painel do mapa religa nele)
  idioma: "",            // en, pt, es, ru; "" = o gravado no .vpk (inglês, ou o que o install.bat escolheu)
  teclas: {
    mapa: ((DU_DATA.config || {}).teclas || {}).mapa || "",
    tracker: ((DU_DATA.config || {}).teclas || {}).tracker || "",
    desligar: ((DU_DATA.config || {}).teclas || {}).desligar || "",
  },
};
// Teclas que dá para escolher. F7 fica de fora (console do jogo) e T (Push-to-Talk).
var TECLAS_ESCOLHA = ["F1", "F2", "F3", "F4", "F5", "F6", "F8", "F9", "F10", "F11", "F12",
  "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "U", "Y"];

function copiaAjustes(o) { return JSON.parse(JSON.stringify(o)); }
var ajustes = copiaAjustes(AJUSTES_PADRAO);
var telaAjustes = { painel: null, escolhendoTecla: "", salvo: false };

function carregarAjustes() {
  aplicarAjustes();
  if (!CONFIG.urlPonte) return;
  ponteLer("du_ajustes", function (ok, valor) {
    if (!ok || !valor) return;
    try {
      var salvo = JSON.parse(valor);
      Object.keys(AJUSTES_PADRAO).forEach(function (k) {
        if (k === "teclas") { Object.keys(salvo.teclas || {}).forEach(function (t) { if (t in ajustes.teclas) ajustes.teclas[t] = salvo.teclas[t]; }); }
        else if (k in salvo) ajustes[k] = salvo[k];
      });
      telaAjustes.salvo = true;
      aplicarAjustes();
      desenharAjustes();
    } catch (e) { log("configurações salvas inválidas: " + e); }
  });
}

function salvarAjustes() {
  aplicarAjustes();
  telaAjustes.salvo = false;
  if (CONFIG.urlPonte) ponteSalvar("du_ajustes", JSON.stringify(ajustes), function (ok) { telaAjustes.salvo = ok; desenharRodapeAjustes(); });
  desenharAjustes();
}

// Aplica no HUD: classes na raiz (tamanhos, recorte do topo), variáveis do mapa e teclas novas.
function aplicarAjustes() {
  TAMANHOS_MAPA.forEach(function (t) { hud.SetHasClass("DUMapaT" + t, ajustes.mapaTam === t); });
  [115, 130, 150].forEach(function (e) { hud.SetHasClass("DUMini" + e, ajustes.miniEscala === e); });
  hud.SetHasClass("DUCortaTopo", !!ajustes.mapaCortaTopo);
  CONFIG.accountId = Number(ajustes.contaSteam) || (DU_DATA.config || {}).accountId || null;
  ESCALA_HEROIS_MAPA = ajustes.mapaHerois;
  TAM_JOGADOR_MAPA = ajustes.mapaEu;
  if (TAM_MAPA !== ajustes.mapaTam) {
    // os pontos são posicionados em px do tamanho do mapa: recria as camadas no tamanho novo
    TAM_MAPA = ajustes.mapaTam;
    if (valido(pontos.painel)) { pontos.painel.RemoveAndDeleteChildren(); pontos.criadas = {}; }
    marcas.tam = 0;
    pontos.chaveEscala = "";
    if (mapa.aberto) { aplicarFiltros(); desenharMarcas(true); }
  }
  atualizarCamadaPontos();
  ajustarJogador(true);
  if (mapa.aberto) mostrarPainel(mapa.painel, ajustes.mapaPainel);
  Object.keys(ajustes.teclas).forEach(function (a) { registrarTecla(ajustes.teclas[a]); });
  trocarIdioma(ajustes.idioma);
}

// Troca o idioma na hora: traduz as regras de novo, refaz os textos da aba da loja e apaga os painéis
// com texto (faixa do Tab, aviso, tooltip, mapa, tracker), que são recriados no idioma novo quando aparecem.
function trocarIdioma(novo) {
  if (["en", "pt", "es", "ru"].indexOf(novo) < 0) novo = idiomaDoMod();
  if (novo === IDIOMA) return;
  IDIOMA = novo;
  dados = dadosNoIdioma(IDIOMA);
  traduzirCamadasMapa();
  fecharMapa();
  fecharTracker();
  esconderDica();
  [faixa, aviso, dicaItem, mapa, tracker].forEach(function (o) {
    if (valido(o.painel)) o.painel.DeleteAsync(0);
    o.painel = null;
  });
  faixa.visivel = false;
  editor.rascunho = null;
  assinaturaAnterior = "";
  traduzirAbaLoja();
  if (ultimaLeitura) atualizarRecomendacoes(ultimaLeitura, true);
  log("idioma: " + IDIOMA);
}

// Botões +/- de tamanho no painel do mapa (e na tela de configurações).
function mudarTamanhoMapa(passo) {
  var i = TAMANHOS_MAPA.indexOf(ajustes.mapaTam);
  var n = Math.max(0, Math.min(TAMANHOS_MAPA.length - 1, (i < 0 ? 1 : i) + passo));
  if (TAMANHOS_MAPA[n] === ajustes.mapaTam) return;
  ajustes.mapaTam = TAMANHOS_MAPA[n];
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

// ---------- tela ----------
function abrirAjustes(painel) {
  telaAjustes.painel = painel;
  desenharAjustes();
}

// Uma linha: nome + explicação à esquerda, opções à direita (a escolhida fica destacada).
function linhaAjuste(pai, nome, desc, opcoes, atual, aoEscolher) {
  var l = criar("Panel", pai, "", "DUAjLinha");
  var tx = criar("Panel", l, "", "DUAjTextos");
  rotulo(tx, "DUAjNome", esc(nome));
  if (desc) rotulo(tx, "DUAjDesc", esc(desc));
  var op = criar("Panel", l, "", "DUAjOpcoes");
  opcoes.forEach(function (o) {
    var b = criar("Button", op, "", "DUAbaModo DUAjOpcao" + (o[0] === atual ? " DUAbaModoAtivo" : ""));
    rotulo(b, "", esc(o[1]));
    aoClicar(b, function () { aoEscolher(o[0]); });
  });
  return l;
}

function desenharAjustes() {
  var p = telaAjustes.painel;
  if (!valido(p) || loja.vista !== "ajustes") return;
  p.RemoveAndDeleteChildren();
  var mudar = function (k) { return function (v) { ajustes[k] = v; if (k === "miniPontos" && v > 0) ajustes.miniPontosAntes = v; salvarAjustes(); }; };
  var simNao = [[true, T("aj.sim")], [false, T("aj.nao")]];

  // Idioma primeiro, com o nome de cada idioma na própria língua (dá para achar mesmo sem entender o atual).
  cartaz(p, { titulo: T("aj.idioma"), sub: T("aj.idioma.sub"), tema: "vermelho" });
  linhaAjuste(p, T("aj.idioma.nome"), T("aj.idioma.desc"),
    [["en", "English"], ["pt", "Português (BR)"], ["es", "Español"], ["ru", "Русский"]], IDIOMA, mudar("idioma"));

  cartaz(p, { titulo: T("aj.mapaGrande"), sub: T("aj.mapaGrande.sub"), tema: "teal" });
  linhaAjuste(p, T("aj.tamMapa"), T("aj.tamMapa.desc"), [[700, T("aj.pequeno")], [820, T("aj.medio")], [940, T("aj.grande")]], ajustes.mapaTam, mudar("mapaTam"));
  linhaAjuste(p, T("aj.herois"), T("aj.herois.desc"), [["0.35", T("aj.pequenos")], ["0.5", T("aj.medios")], ["0.75", T("aj.grandes")], ["1", T("aj.doJogo")]], ajustes.mapaHerois, mudar("mapaHerois"));
  linhaAjuste(p, T("aj.eu"), T("aj.eu.desc"), [["3.5%", T("aj.pequeno")], ["4.5%", T("aj.medio")], ["7%", T("aj.grande")], ["15%", T("aj.doJogo")]], ajustes.mapaEu, mudar("mapaEu"));
  linhaAjuste(p, T("aj.painel"), T("aj.painel.desc"), [[true, T("aj.mostrar")], [false, T("aj.esconder")]], ajustes.mapaPainel, mudar("mapaPainel"));
  linhaAjuste(p, T("aj.topo"), T("aj.topo.desc"), simNao, ajustes.mapaCortaTopo, mudar("mapaCortaTopo"));
  linhaAjuste(p, T("aj.marca"), T("aj.marca.desc"), [[15, "15 s"], [30, "30 s"], [60, "1 min"], [120, "2 min"]], ajustes.marcaSeg, mudar("marcaSeg"));

  cartaz(p, { titulo: T("aj.minimapa"), sub: T("aj.minimapa.sub"), tema: "espirito" });
  linhaAjuste(p, T("aj.tamMini"), T("aj.tamMini.desc"), [[100, T("aj.normal")], [115, "+15%"], [130, "+30%"], [150, "+50%"]], ajustes.miniEscala, mudar("miniEscala"));
  linhaAjuste(p, T("aj.miniEu"), T("aj.miniEu.desc"), [["6%", T("aj.pequeno")], ["9%", T("aj.medio")], ["12%", T("aj.grande")], ["15%", T("aj.doJogo")]], ajustes.miniEu, mudar("miniEu"));
  linhaAjuste(p, T("aj.miniPontos"), T("aj.miniPontos.desc"), [[0, T("aj.desligado")], [1, T("aj.pequenos")], [2, T("aj.medios")], [3, T("aj.grandes")]], ajustes.miniPontos, mudar("miniPontos"));

  cartaz(p, { titulo: T("aj.pontos"), sub: T("aj.pontos.sub"), tema: "vitalidade" });
  if (!pontos.filtros) carregarFiltros();
  var grade = criar("Panel", p, "", "DUAjGrade");
  DADOS_MAPA.camadas.forEach(function (c) {
    var on = pontos.filtros[c.id], onMini = !!(pontos.filtrosMini || {})[c.id];
    var b = criar("Panel", grade, "", "DUFiltro DUAjCamada" + (on || onMini ? " DUFiltroOn" : ""));
    var amostra = criar("Panel", b, "", "DUFiltroIcone " + (c.estilo === "icone" ? "DUBadge" : "DUBolinha"));
    if (amostra) {
      try { if (c.estilo === "icone") amostra.style.border = "2px solid " + c.cor; else amostra.style.backgroundColor = c.cor; } catch (e) {}
      if (c.estilo === "icone" && c.icone) { var im = imagem(amostra, "DUBadgeIcone", iconePonto(c)); if (im && !c.semCor) { try { im.style.washColor = c.cor; } catch (e) {} } }
    }
    rotulo(b, "DUFiltroNome", esc(c.nome));
    var chipG = criar("Button", b, "", "DUAbaModo DUAjChip" + (on ? " DUAbaModoAtivo" : ""));
    rotulo(chipG, "", esc(T("aj.chipGrande")));
    aoClicar(chipG, function () { alternarFiltro(c.id); desenharAjustes(); });
    var chipM = criar("Button", b, "", "DUAbaModo DUAjChip" + (onMini ? " DUAbaModoAtivo" : ""));
    rotulo(chipM, "", esc(T("aj.chipMini")));
    aoClicar(chipM, function () { alternarFiltroMini(c.id); desenharAjustes(); });
  });
  var acoesPontos = criar("Panel", p, "", "DUAjAcoes");
  botao(acoesPontos, "", T("aj.pontosPadrao"), function () {
    pontos.filtros = filtrosPadrao(); pontos.manual = {};
    pontos.filtrosMini = filtrosMiniPadrao();
    if (CONFIG.urlPonte) ponteSalvar("du_mini_filtros", JSON.stringify(pontos.filtrosMini));
    filtrosDoHeroi(ultimaLeitura ? ultimaLeitura.eu : null);
    aplicarFiltros();
    if (CONFIG.urlPonte) ponteSalvar("du_mapa_filtros", JSON.stringify(pontos.filtros));
    desenharAjustes();
  });

  cartaz(p, { titulo: T("aj.atalhos"), sub: T("aj.atalhos.sub"), tema: "arma" });
  [["mapa", T("aj.tecla.mapa")], ["tracker", T("aj.tecla.tracker")], ["desligar", T("aj.tecla.desligar")]].forEach(function (par) {
    var atual = ajustes.teclas[par[0]];
    linhaAjuste(p, par[1], "", [["mudar", atual ? String(atual).toUpperCase() : T("aj.nenhuma")]], telaAjustes.escolhendoTecla === par[0] ? "mudar" : "", function () {
      telaAjustes.escolhendoTecla = telaAjustes.escolhendoTecla === par[0] ? "" : par[0];
      desenharAjustes();
    });
    if (telaAjustes.escolhendoTecla !== par[0]) return;
    // grade de teclas logo abaixo da linha
    var g = criar("Panel", p, "", "DUAjTeclas");
    rotulo(g, "DUAjDesc DUAjTeclasDica", esc(T("aj.tecla.dica")));
    TECLAS_ESCOLHA.concat([""]).forEach(function (t) {
      var usada = t && Object.keys(ajustes.teclas).some(function (a) { return a !== par[0] && String(ajustes.teclas[a]).toLowerCase() === t.toLowerCase(); });
      var b = criar("Button", g, "", "DUAbaModo DUAjTecla" + (String(atual).toLowerCase() === t.toLowerCase() ? " DUAbaModoAtivo" : "") + (usada ? " DUAjTeclaUsada" : ""));
      rotulo(b, "", esc(t || T("aj.nenhuma")));
      if (usada) return;
      aoClicar(b, function () { ajustes.teclas[par[0]] = t; telaAjustes.escolhendoTecla = ""; salvarAjustes(); });
    });
  });

  cartaz(p, { titulo: T("aj.tracker"), sub: T("aj.tracker.sub"), tema: "vermelho" });
  var lc = criar("Panel", p, "", "DUAjLinha");
  var txc = criar("Panel", lc, "", "DUAjTextos");
  rotulo(txc, "DUAjNome", esc(T("aj.conta")));
  rotulo(txc, "DUAjDesc", esc(T("aj.conta.desc")));
  var atualConta = CONFIG.accountId ? String(CONFIG.accountId) : T("aj.conta.nenhuma");
  var estado = rotulo(txc, "DUAjDesc DUAjConta", esc(T("aj.conta.atual", atualConta)));
  var opc = criar("Panel", lc, "", "DUAjOpcoes");
  var campo = criar("TextEntry", opc, "", "DUTexto DUAjCampo", { maxchars: "80" });
  if (campo && ajustes.contaSteam) { try { campo.text = String(ajustes.contaSteam); } catch (e) {} }
  botao(opc, "DUBotaoPrimario DUAjOpcao", T("aj.conta.salvar"), function () {
    var id = lerContaSteam(textoDe(campo));
    if (!id) { estado.text = "<font color='#a8322a'>" + esc(T("aj.conta.invalida")) + "</font>"; return; }
    ajustes.contaSteam = id;
    salvarAjustes();
  });

  var fim = criar("Panel", p, "", "DUAjAcoes");
  botao(fim, "", T("aj.restaurar"), function () {
    ajustes = copiaAjustes(AJUSTES_PADRAO);
    telaAjustes.escolhendoTecla = "";
    salvarAjustes();
  });
  telaAjustes.rodape = rotulo(p, "DUAjRodape", "");
  desenharRodapeAjustes();
}

function desenharRodapeAjustes() {
  if (!valido(telaAjustes.rodape)) return;
  telaAjustes.rodape.text = esc(!CONFIG.urlPonte ? T("aj.semPonte") : ponte.falhou ? T("aj.ponteFalhou") : telaAjustes.salvo ? T("aj.salvo") : T("aj.salvando"));
}
