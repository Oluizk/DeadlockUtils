// ===================== Mapa em tela cheia (tecla M) + pontos de interesse =====================
// Usa o próprio minimapa do jogo: com o placar aberto (+show_scoreboard, igual segurar Tab) ele
// aceita clique para sinalizar, menu radial e desenho, o cursor fica livre e o herói continua andando.
//
// Tamanho: a classe DUMapaAberto na raiz do HUD aumenta #minimap_container E o próprio #hud_minimap
// (o painel que desenha o mapa: ele tem 360px fixos no CSS do jogo). O minimapa é declarado no
// hud.xml, onde o nosso CSS vale, então tirar a classe devolve sempre o tamanho original.
//
// Pontos de interesse (data/mapa.json, do deadlock-api + túneis do Rem tirados do próprio mapa):
// cada ponto tem posição RELATIVA (0..1) na imagem do minimapa: a mesma imagem que o jogo desenha
// preenchendo o #hud_minimap. As nossas camadas são FILHAS do #hud_minimap: herdam o tamanho e a
// inversão do mapa (para um dos times o jogo vira o minimapa com scaleX(-1) scaleY(-1)); só os ícones
// são "desvirados" para ficarem de pé.

var mapa = { aberto: false, painel: null, falhou: false, abertoEm: 0, jogador: [], jogadorEm: 0, semPlacar: {} };
var DADOS_MAPA = DU_DATA.mapa || { camadas: [], imagens: [] };
// data/mapa.json é gerado em português; o nome/descrição de cada camada no idioma vem de textos.json
// ("camada.<id>" e "camada.<id>.desc").
function traduzirCamadasMapa() {
  DADOS_MAPA.camadas.concat(DADOS_MAPA.imagens).forEach(function (c) {
    if (temTexto("camada." + c.id)) c.nome = T("camada." + c.id);
    if (temTexto("camada." + c.id + ".desc")) c.desc = T("camada." + c.id + ".desc");
  });
}
traduzirCamadasMapa();
var TAM_MAPA = 820; // tem que bater com .DUMapaAberto #hud_minimap no estilo.css
// O indicador do jogador local no CSS do jogo é 15% do minimapa (54px no mapa pequeno, enorme no grande).
// Painéis do hud.xml que expandem com o placar (GlobalClassListener gScoreboardOpen) e cobririam o mapa.
var PAINEIS_SEM_PLACAR = ["TopBar", "AbilitiesContainer", "StatsAndModsContainer"];
var TAM_JOGADOR_MAPA = "4.5%";
var ESCALA_HEROIS_MAPA = "0.5"; // os outros heróis, com o mapa grande
// manual: camadas que o jogador ligou/desligou (não seguem mais o padrão por herói, ex.: túneis só para o Rem)
var pontos = { painel: null, criadas: {}, filtros: null, manual: {} };
// Marcações: clicar num ícone marca o local; a marca continua no minimapa pequeno por um tempo depois de fechar.
var marcas = { painel: null, lista: {}, ate: 0, tam: 0 };

// ---------- filtros ----------
function filtrosPadrao() {
  var f = {};
  DADOS_MAPA.camadas.concat(DADOS_MAPA.imagens).forEach(function (c) { f[c.id] = !!c.padrao; });
  return f;
}
// O minimapa normal tem filtros próprios: ele é pequeno, então por padrão só o essencial.
var MINI_PADRAO = { lanches: true, sinos: true };
function filtrosMiniPadrao() {
  var f = {};
  DADOS_MAPA.camadas.forEach(function (c) { f[c.id] = !!MINI_PADRAO[c.id]; });
  return f;
}
function carregarFiltros() {
  pontos.filtros = filtrosPadrao();
  pontos.filtrosMini = filtrosMiniPadrao();
  if (!CONFIG.urlPonte) return;
  ponteLer("du_mapa_filtros", function (ok, valor) {
    if (!ok || !valor) return;
    try {
      var salvo = JSON.parse(valor);
      Object.keys(salvo).forEach(function (k) { if (k in pontos.filtros) { pontos.filtros[k] = !!salvo[k]; pontos.manual[k] = true; } });
      aplicarFiltros();
      if (mapa.aberto) desenharFiltros();
    } catch (e) {}
  });
  ponteLer("du_mini_filtros", function (ok, valor) {
    if (!ok || !valor) return;
    try {
      var salvo = JSON.parse(valor);
      Object.keys(salvo).forEach(function (k) { if (k in pontos.filtrosMini) pontos.filtrosMini[k] = !!salvo[k]; });
      aplicarFiltros();
    } catch (e) {}
  });
}
// Camadas com padrão por herói (data/mapa.json "padraoHeroi"): ligadas só quando você joga com ele.
function filtrosDoHeroi(eu) {
  DADOS_MAPA.camadas.forEach(function (c) {
    if (c.padraoHeroi && !pontos.manual[c.id]) pontos.filtros[c.id] = !!c.padrao || eu === c.padraoHeroi;
  });
}
function alternarFiltro(id) {
  pontos.manual[id] = true;
  pontos.filtros[id] = !pontos.filtros[id];
  aplicarFiltros();
  desenharFiltros();
  if (CONFIG.urlPonte) ponteSalvar("du_mapa_filtros", JSON.stringify(pontos.filtros));
}

// ---------- camadas (filhas do #hud_minimap) ----------
function minimapa() { return achar(hud, "hud_minimap"); }
function camadaNoMinimapa(atual, id, layout) {
  var mm = minimapa();
  if (!valido(mm)) return null;
  var pai = null;
  try { pai = valido(atual) ? atual.GetParent() : null; } catch (e) {}
  if (valido(atual) && pai === mm) return atual;
  return painelComLayout(mm, id, layout);
}
function montarPontos() {
  var p = camadaNoMinimapa(pontos.painel, "DU_MapaPontos", "pontos");
  if (p !== pontos.painel) { pontos.painel = p; pontos.criadas = {}; }
  return !!pontos.painel;
}
function montarMarcas() {
  var p = camadaNoMinimapa(marcas.painel, "DU_MapaMarcas", "marcas");
  if (p !== marcas.painel) {
    marcas.painel = p;
    marcas.tam = 0;
    Object.keys(marcas.lista).forEach(function (k) { marcas.lista[k].painel = null; });
  }
  return !!marcas.painel;
}
function iconePonto(c) { return c.icone ? "s2r://panorama/images/" + c.icone : ""; }
function semClique(p) { try { p.hittest = false; } catch (e) {} }

// Cria os pontos de uma camada só quando ela é ligada pela primeira vez (caixas = 423 pontos).
function criarCamada(id) {
  if (pontos.criadas[id]) return pontos.criadas[id];
  var img = DADOS_MAPA.imagens.filter(function (i) { return i.id === id; })[0];
  if (img) {
    var i = criar("Image", pontos.painel, "", "DUCamadaImagem");
    semClique(i);
    try { i.SetImage("s2r://panorama/images/" + img.imagem); } catch (e) {}
    try { pontos.painel.MoveChildBefore(i, filhos(pontos.painel)[0]); } catch (e) {} // imagens atrás dos ícones
    pontos.criadas[id] = i;
    return i;
  }
  var c = DADOS_MAPA.camadas.filter(function (x) { return x.id === id; })[0];
  if (!c) return null;
  // A camada cobre o mapa inteiro: não pode pegar clique, senão o jogo para de receber os pings.
  var cam = criar("Panel", pontos.painel, "", "DUCamada");
  semClique(cam);
  // Linhas pontilhadas (túneis): o Panorama não desenha linhas, então são bolinhas a cada 9px.
  (c.linhas || []).forEach(function (seg) {
    var x1 = seg[0] * TAM_MAPA, y1 = seg[1] * TAM_MAPA, x2 = seg[2] * TAM_MAPA, y2 = seg[3] * TAM_MAPA;
    var n = Math.max(1, Math.round(Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) / 9));
    for (var k = 0; k <= n; k++) semClique(marcador(cam, c, "linha", x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n, 4));
  });
  c.pontos.forEach(function (pt, i) {
    var p = marcador(cam, c, c.estilo, pt[0] * TAM_MAPA, pt[1] * TAM_MAPA, c.tam);
    if (!p) return;
    p.AddClass("DUPontoAtivo");
    evento(p, "onmouseover", function () { mostrarDicaMapa(c, pt, i); });
    evento(p, "onmouseout", esconderDica);
    evento(p, "onactivate", function () { alternarMarca(c, pt, i); mostrarDicaMapa(c, pt, i); });
  });
  pontos.criadas[id] = cam;
  return cam;
}

// "ponto": bolinha na cor da camada. "icone": ícone nativo dentro de um círculo escuro com borda colorida.
function marcador(pai, c, estilo, x, y, s) {
  var p = criar("Panel", pai, "", "DUPonto " + (estilo === "icone" ? "DUBadge" : "DUBolinha"));
  if (!p) return null;
  try {
    p.style.width = s + "px";
    p.style.height = s + "px";
    p.style.position = Math.round(x - s / 2) + "px " + Math.round(y - s / 2) + "px 0px";
    if (estilo === "icone") p.style.border = "2px solid " + c.cor;
    else p.style.backgroundColor = c.cor;
  } catch (e) {}
  if (estilo === "icone" && c.icone) {
    var img = imagem(p, "DUBadgeIcone", iconePonto(c));
    semClique(img);
    if (img && !c.semCor) { try { img.style.washColor = c.cor; } catch (e) {} }
  }
  return p;
}

function alternarFiltroMini(id) {
  pontos.filtrosMini[id] = !pontos.filtrosMini[id];
  aplicarFiltros();
  if (CONFIG.urlPonte) ponteSalvar("du_mini_filtros", JSON.stringify(pontos.filtrosMini));
}
function algumFiltroMini() {
  return !!pontos.filtrosMini && Object.keys(pontos.filtrosMini).some(function (k) { return pontos.filtrosMini[k]; });
}
// Mostra as camadas do modo atual: filtros do mapa grande com ele aberto, os do minimapa com ele fechado.
function aplicarFiltros() {
  if (!valido(pontos.painel) || !pontos.filtros) return;
  var fs = mapa.aberto || !pontos.filtrosMini ? pontos.filtros : pontos.filtrosMini;
  Object.keys(pontos.filtros).forEach(function (id) {
    var on = !!fs[id];
    var cam = on ? criarCamada(id) : pontos.criadas[id];
    if (cam) mostrarPainel(cam, on);
  });
}

// ---------- tooltip dos pontos (o mesmo tooltip dos itens) ----------
function mostrarDicaMapa(c, pt, i) {
  if (!montarDica()) return;
  ["weapon", "vitality", "spirit"].forEach(function (k) { dicaItem.painel.SetHasClass("DUDica_" + k, false); });
  dicaItem.painel.AddClass("DUDica_mapa");
  dicaItem.item = "mapa:" + c.id;
  mostrarPainel(dicaItem.DUDicaIcone, !!c.icone);
  if (c.icone) { try { dicaItem.DUDicaIcone.SetImage(iconePonto(c)); } catch (e) {} }
  dicaItem.DUDicaNome.text = esc(c.nome);
  mostrarPainel(dicaItem.DUDicaCustoLinha, false);
  dicaItem.painel.RemoveClass("DUSemAlmas");
  mostrarPainel(dicaItem.DUDicaStatus, true);
  dicaItem.DUDicaStatus.text = "<font color='" + c.cor + "'>" + esc(T("mapa.qtd", c.pontos.length)) + "</font>";
  mostrarPainel(dicaItem.DUDicaContra, false);
  dicaItem.DUDicaMotivos.text = esc(c.desc || "");
  mostrarPainel(dicaItem.DUDicaMotivos, !!c.desc);
  dicaItem.DUDicaRodape.text = T(marcas.lista[c.id + ":" + i] ? "mapa.desmarcar" : "mapa.marcar");
  mostrarPainel(dicaItem.DUDicaRodape, true);
  // Posição pela conta (não pela posição do ícone): funciona também com o mapa invertido.
  try {
    var mm = minimapa();
    var pos = mm.GetPositionWithinWindow();
    var escala = mm.actualuiscale_x || 1;
    var inv = temClasse(mm, "invert_map");
    var x = pos.x / escala + (inv ? 1 - pt[0] : pt[0]) * TAM_MAPA;
    var y = pos.y / escala + (inv ? 1 - pt[1] : pt[1]) * TAM_MAPA;
    var largura = (hud.actuallayoutwidth || 1920) / (hud.actualuiscale_x || 1);
    var dx = x + 440 > largura ? x - 440 : x + 24;
    dicaItem.painel.style.position = Math.round(dx) + "px " + Math.max(10, Math.round(y - 40)) + "px 0px";
  } catch (e) {}
  mostrarPainel(dicaItem.painel, true);
}

// ---------- marcações ----------
function alternarMarca(c, pt, i) {
  var k = c.id + ":" + i;
  if (marcas.lista[k]) {
    if (valido(marcas.lista[k].painel)) marcas.lista[k].painel.DeleteAsync(0);
    delete marcas.lista[k];
    som("UI.Button.Press");
  } else {
    marcas.lista[k] = { c: c, pt: pt, painel: null };
    som("UI.Shop.Mod.Starred.Click");
  }
  desenharMarcas(true);
}
function tamanhoMinimapa(mm) {
  if (mapa.aberto) return TAM_MAPA;
  var t = 0;
  try { t = mm.actuallayoutwidth / (mm.actualuiscale_x || 1); } catch (e) {}
  return t > 50 ? Math.round(t) : 360;
}
// Reposiciona quando o minimapa muda de tamanho (abrir/fechar o mapa grande).
function desenharMarcas(forcar) {
  var chaves = Object.keys(marcas.lista);
  if (!chaves.length) { if (valido(marcas.painel)) mostrarPainel(marcas.painel, false); return; }
  if (!montarMarcas()) return;
  var mm = minimapa();
  var tam = tamanhoMinimapa(mm);
  marcas.painel.SetHasClass("DUInvertido", temClasse(mm, "invert_map"));
  marcas.painel.SetHasClass("DUMarcasPequenas", !mapa.aberto);
  mostrarPainel(marcas.painel, true);
  if (!forcar && tam === marcas.tam) return;
  marcas.tam = tam;
  chaves.forEach(function (k) {
    var m = marcas.lista[k];
    var s = mapa.aberto ? m.c.tam : Math.max(12, Math.round(m.c.tam * 0.6));
    if (!valido(m.painel)) {
      m.painel = marcador(marcas.painel, m.c, m.c.estilo === "icone" ? "icone" : "ponto", 0, 0, s);
      if (!m.painel) return;
      m.painel.AddClass("DUMarca");
      var anel = criar("Panel", m.painel, "", "DUMarcaAnel");
      if (anel) { try { anel.style.border = "3px solid " + m.c.cor; } catch (e) {} }
    }
    try {
      m.painel.style.width = s + "px";
      m.painel.style.height = s + "px";
      m.painel.style.position = Math.round(m.pt[0] * tam - s / 2) + "px " + Math.round(m.pt[1] * tam - s / 2) + "px 0px";
    } catch (e) {}
  });
}
function limparMarcas() {
  Object.keys(marcas.lista).forEach(function (k) { if (valido(marcas.lista[k].painel)) marcas.lista[k].painel.DeleteAsync(0); });
  marcas.lista = {};
  marcas.ate = 0;
  if (valido(marcas.painel)) mostrarPainel(marcas.painel, false);
}
// Chamado pelo loop rápido: segue o tamanho do minimapa e apaga as marcas quando o tempo acaba.
function vigiarMarcas() {
  if (!Object.keys(marcas.lista).length) return;
  if (!mapa.aberto && marcas.ate && Date.now() > marcas.ate) { limparMarcas(); return; }
  desenharMarcas(false);
}

// ---------- ícones dos heróis (menores com o mapa grande) ----------
// Você: largura em % (o CSS do jogo usa 15%). Os outros heróis têm o tamanho definido pelo próprio jogo
// (citadel_minimap_player_width), então encolhem por pre-transform-scale2d, que o jogo não mexe.
function ajustarJogador(forcar) {
  // Os painéis aparecem/somem (visão, morte, renascer): procura de novo a cada segundo.
  if (!forcar && Date.now() - mapa.jogadorEm < 1000) return;
  mapa.jogadorEm = Date.now();
  botoesMapa("player").forEach(function (p) {
    if (mapa.jogador.indexOf(p) < 0 && temClasse(p, "map_button")) mapa.jogador.push(p);
  });
  mapa.jogador = mapa.jogador.filter(valido);
  // Mapa grande: os dois ajustes do mapa. Minimapa normal: só o seu ícone (o do jogo é 15%, enorme
  // quando o minimapa está ampliado); os outros heróis ficam como o jogo desenha.
  // Mod desligado (F8): os tamanhos do jogo.
  var grande = mapa.aberto;
  var tamEu = !modLigado ? "15%" : grande ? TAM_JOGADOR_MAPA : (ajustes.miniEu || "15%");
  var escOutros = grande && modLigado ? ESCALA_HEROIS_MAPA : "1";
  var chave = tamEu + "|" + escOutros + "|" + mapa.jogador.length;
  if (!forcar && chave === mapa.chaveJogador) return; // nada mudou: não mexe nos estilos à toa
  mapa.chaveJogador = chave;
  mapa.jogador.forEach(function (p) {
    try {
      if (temClasse(p, "localplayer")) {
        if (tamEu !== "15%") { p.style.width = tamEu; p.style.height = tamEu; return; }
        p.style.width = null;
        p.style.height = null;
        // Se o Panorama não aceitar null, volta ao valor do CSS do jogo (hud_minimap.css: 15%).
        if (p.style.width && String(p.style.width) !== "15%") { p.style.width = "15%"; p.style.height = "15%"; }
      } else {
        if (escOutros !== "1") { p.style.preTransformScale2d = escOutros; return; }
        p.style.preTransformScale2d = null;
        if (p.style.preTransformScale2d && String(p.style.preTransformScale2d) !== "1") p.style.preTransformScale2d = "1";
      }
    } catch (e) {}
  });
}
// ---------- painel lateral (timers + filtros) ----------
function montarPainelMapa() {
  if (mapa.falhou || valido(mapa.painel)) return;
  mapa.painel = painelComLayout(hud, "DU_Mapa", "mapa");
  if (!mapa.painel) { mapa.falhou = true; log("painel do mapa não carregou"); return; }
  mapa.timers = achar(mapa.painel, "DUMapaTimers");
  mapa.chatDica = achar(mapa.painel, "DUMapaChatDica");
  mapa.linhasTimer = null;
  mapa.filtros = achar(mapa.painel, "DUMapaFiltros");
  mapa.tamValor = achar(mapa.painel, "DUMapaTamValor");
  achar(mapa.painel, "DUMapaTamRotulo").text = T("aj.tamMapa");
  achar(mapa.painel, "DUMapaMaisOpcoes").text = esc(T("aj.maisOpcoes"));
  aoClicar(achar(mapa.painel, "DUMapaMenor"), function () { mudarTamanhoMapa(-1); desenharTamanhoMapa(); });
  aoClicar(achar(mapa.painel, "DUMapaMaior"), function () { mudarTamanhoMapa(1); desenharTamanhoMapa(); });
  mapa.miniBotao = achar(mapa.painel, "DUMapaMiniPontos");
  achar(mapa.painel, "DUMapaMiniRotulo").text = T("aj.miniPontos");
  aoClicar(mapa.miniBotao, function () { ajustes.miniPontos = ajustes.miniPontos > 0 ? 0 : (ajustes.miniPontosAntes || 1); salvarAjustes(); desenharTamanhoMapa(); });
  // transparência do mapa grande e do minimapa: - deixa mais transparente, + mais opaco
  mapa.opacValor = achar(mapa.painel, "DUMapaOpacValor");
  mapa.miniOpacValor = achar(mapa.painel, "DUMapaMiniOpacValor");
  [["DUMapaOpacMenos", "mapaOpac", -1], ["DUMapaOpacMais", "mapaOpac", 1], ["DUMapaMiniOpacMenos", "miniOpac", -1], ["DUMapaMiniOpacMais", "miniOpac", 1]]
    .forEach(function (b) { aoClicar(achar(mapa.painel, b[0]), function () { mudarOpacidadeMapa(b[1], b[2]); desenharTamanhoMapa(); }); });
  mostrarPainel(mapa.painel, false);
}

function desenharTamanhoMapa() {
  if (!valido(mapa.tamValor)) return;
  mapa.tamValor.text = [T("aj.pequeno"), T("aj.medio"), T("aj.grande")][Math.max(0, TAMANHOS_MAPA.indexOf(ajustes.mapaTam))];
  if (valido(mapa.miniBotao)) {
    mapa.miniBotao.SetHasClass("DUAbaModoAtivo", ajustes.miniPontos > 0);
    var l = filhos(mapa.miniBotao)[0];
    if (l) l.text = ajustes.miniPontos > 0 ? T("aj.sim") : T("aj.nao");
  }
  // opacidade em %: 100% = opaco (número em vez de "Opaco", que em russo não cabe nos 64px do valor)
  if (valido(mapa.opacValor)) mapa.opacValor.text = ajustes.mapaOpac + "%";
  if (valido(mapa.miniOpacValor)) mapa.miniOpacValor.text = ajustes.miniOpac + "%";
}

function desenharFiltros() {
  if (!valido(mapa.filtros) || !pontos.filtros) return;
  mapa.filtros.RemoveAndDeleteChildren();
  DADOS_MAPA.imagens.concat(DADOS_MAPA.camadas).forEach(function (c) {
    var on = pontos.filtros[c.id];
    var b = criar("Panel", mapa.filtros, "", "DUFiltro" + (on ? " DUFiltroOn" : ""));
    // mesma aparência do marcador no mapa, em miniatura
    var amostra = criar("Panel", b, "", "DUFiltroIcone " + (c.estilo === "icone" ? "DUBadge" : "DUBolinha"));
    if (amostra) {
      try { if (c.estilo === "icone") amostra.style.border = "2px solid " + c.cor; else amostra.style.backgroundColor = c.cor; } catch (e) {}
      if (c.estilo === "icone" && c.icone) { var im = imagem(amostra, "DUBadgeIcone", iconePonto(c)); if (im && !c.semCor) { try { im.style.washColor = c.cor; } catch (e) {} } }
    }
    rotulo(b, "DUFiltroNome", esc(c.nome));
    if (c.pontos) rotulo(b, "DUFiltroQtd", String(c.pontos.length));
    aoClicar(b, function () { alternarFiltro(c.id); });
  });
}

// ---------- abrir / fechar ----------
function abrirMapa() {
  var l = ultimaLeitura || lerPartida();
  // Só na partida ativa: no pré-jogo (contagem inicial), no hideout e no fim de partida o jogo esconde o
  // minimapa, e o mapa abriria vazio.
  if (l.lojaAberta || !partidaAtiva(l.emPartida, estadoHud())) return;
  if (tracker.aberto) fecharTracker();
  montarPainelMapa();
  if (!pontos.filtros) carregarFiltros();
  filtrosDoHeroi(l.eu);
  mapa.aberto = true;
  mapa.abertoEm = Date.now();
  mapa.viuPlacar = false;
  mapa.jogadorEm = 0;
  marcas.ate = 0; // com o mapa aberto as marcas não expiram
  hud.AddClass("DUMapaAberto");
  comando("+show_scoreboard");
  comando("hud_free_cursor 1");
  mostrarPainel(mapa.painel, ajustes.mapaPainel);
  if (montarPontos()) {
    pontos.painel.SetHasClass("DUInvertido", temClasse(minimapa(), "invert_map"));
    aplicarFiltros();
    atualizarCamadaPontos();
  }
  ajustarJogador(true);
  desenharMarcas(true);
  desenharFiltros();
  desenharTamanhoMapa();
  atualizarPainelMapa(l);
  esconderDica();
  som("UI.Shop.Mod.Starred.Click");
}

// Sempre seguro de chamar (mesmo se já fechado): desfaz tudo.
function fecharMapa() {
  var estava = mapa.aberto;
  mapa.aberto = false;
  hud.RemoveClass("DUMapaAberto");
  mostrarPainel(mapa.painel, false);
  atualizarCamadaPontos(); // os pontos continuam no minimapa pequeno (configurações)
  ajustarJogador(true); // volta aos tamanhos do minimapa normal
  if (estava) {
    if (dicaItem.item.indexOf("mapa:") === 0) esconderDica();
    comando("-show_scoreboard");
    comando("hud_free_cursor -1");
    // As marcas ficam no minimapa pequeno por um tempo.
    if (Object.keys(marcas.lista).length) {
      marcas.ate = Date.now() + (ajustes.marcaSeg || 60) * 1000;
      desenharMarcas(true);
    }
  }
}

function alternarMapa() { if (mapa.aberto) fecharMapa(); else abrirMapa(); }

function proximoBuffPonte(seg) {
  // Buffs da ponte: aos 5:00 e depois a cada 5 minutos (deadlock.wiki). Ajustável em data/config.json.
  var inicio = CONFIG.buffPonteInicio || 300, intervalo = CONFIG.buffPonteIntervalo || 300;
  if (seg == null) return null;
  if (seg < inicio) return inicio - seg;
  return intervalo - ((seg - inicio) % intervalo);
}

// Timers no painel do mapa: os mesmos do painel de objetivos (84-timers.js), sempre todos, em linhas.
// Com o mapa aberto o cursor está livre: clicar numa linha manda o tempo no chat do time.
function atualizarPainelMapa(l) {
  if (!mapa.aberto || !valido(mapa.painel) || !valido(mapa.timers)) return;
  var est = timers.estados || (l.emPartida && l.segundos != null ? estadosTimers(lerObjetivos(l)) : null);
  if (!mapa.linhasTimer) {
    mapa.timers.RemoveAndDeleteChildren();
    mapa.linhasTimer = {};
    TIMERS_ORDEM.forEach(function (id) {
      var linha = criar("Panel", mapa.timers, "", "DUMapaLinha DUMapaLinhaTimer");
      var ic = imagem(linha, "DUMapaTimerIcone", "s2r://panorama/images/" + ICONE_TIMER[id]);
      var nome = rotulo(linha, "DUMapaRotulo", esc(T("tm." + id)));
      var valor = rotulo(linha, "DUMapaValor", "-");
      aoClicar(linha, function () { anunciarTimer(id); });
      mapa.linhasTimer[id] = { painel: linha, icone: ic, nome: nome, valor: valor, iconeAtual: ICONE_TIMER[id] };
    });
  }
  mostrarPainel(mapa.chatDica, !!ajustes.timersChat);
  TIMERS_ORDEM.forEach(function (id) {
    var x = mapa.linhasTimer[id], e = est ? est[id] : null;
    mostrarPainel(x.painel, !!e && !e.oculto);
    if (!e || e.oculto) return;
    x.valor.text = esc(e.valor) + (e.detalhe ? " <font color='#6b5a44'>" + esc(e.detalhe) + "</font>" : "");
    x.nome.text = esc(e.nome || T("tm." + id));
    x.painel.SetHasClass("DUMapaTimerAlerta", !!e.alerta);
    x.painel.SetHasClass("DUMapaTimerChat", !!(ajustes.timersChat && e.chat));
    var ic = e.icone || ICONE_TIMER[id];
    if (ic !== x.iconeAtual) { x.iconeAtual = ic; try { x.icone.SetImage("s2r://panorama/images/" + ic); } catch (err) {} }
  });
}

// ---------- os mesmos pontos no minimapa pequeno ----------
// A camada tem sempre TAM_MAPA px (os pontos foram posicionados nesse tamanho). No minimapa pequeno ela
// é centralizada sobre ele e reduzida com pre-transform-scale2d (que escala a partir do centro), então
// cada ponto cai no mesmo lugar relativo. Os ícones ganham uma escala de volta (.DUMiniPontos1..3) para
// não sumirem, e a camada não pega clique (o minimapa continua aceitando ping com o Tab).
function atualizarCamadaPontos() {
  var p = pontos.painel;
  if (!valido(p)) return;
  var mostrar = mapa.aberto || (modLigado && ajustes.miniPontos > 0 && algumFiltroMini());
  mostrarPainel(p, mostrar);
  if (!mostrar) return;
  var tam = tamanhoMinimapa(minimapa());
  var esc = Math.round(tam / TAM_MAPA * 1000) / 1000;
  var chave = esc + "|" + mapa.aberto + "|" + ajustes.miniPontos + "|" + TAM_MAPA;
  if (chave === pontos.chaveEscala) return;
  if (pontos.modoFiltros !== mapa.aberto) { pontos.modoFiltros = mapa.aberto; aplicarFiltros(); } // trocou entre mapa grande e minimapa
  pontos.chaveEscala = chave;
  var off = Math.round((tam - TAM_MAPA) / 2);
  try {
    p.style.width = TAM_MAPA + "px";
    p.style.height = TAM_MAPA + "px";
    p.style.position = off + "px " + off + "px 0px";
    p.style.preTransformScale2d = String(esc);
  } catch (e) {}
  p.SetHasClass("DUInvertido", temClasse(minimapa(), "invert_map"));
  [1, 2, 3].forEach(function (n) { p.SetHasClass("DUMiniPontos" + n, !mapa.aberto && ajustes.miniPontos === n); });
  try { p.hittestchildren = !!mapa.aberto; } catch (e) {}
}
// Loop lento (1s): cria a camada mesmo sem nunca ter aberto o mapa grande, e liga os túneis quando o
// herói é detectado (padrão por herói).
function garantirPontosMinimapa(leitura) {
  if (!modLigado || mapa.aberto || !(ajustes.miniPontos > 0)) { atualizarCamadaPontos(); return; }
  if (!montarPontos()) return;
  if (!pontos.filtros) carregarFiltros();
  var eu = leitura ? leitura.eu : null;
  if (pontos.heroiFiltros !== eu || !Object.keys(pontos.criadas).length) {
    pontos.heroiFiltros = eu;
    filtrosDoHeroi(eu);
    aplicarFiltros();
  }
  atualizarCamadaPontos();
}

// ---------- transparência do mapa (configurações > Mapa) ----------
// O jogo desenha o fundo do minimapa por um material (minimap.vmat, client.dll) no próprio #hud_minimap, e
// os ícones são filhos dele. Opacidade no #hud_minimap não pega no jogo (o painel C++ cuida da dele); nos
// painéis comuns do #minimap_container (hud.xml) pega. Então a opacidade vai na moldura, no desfoque e no
// #HudMinimapContainer (que contém o #hud_minimap), por classes DU_miniOpac<n> / DU_mapaOpac<n> na raiz
// do HUD (75-ajustes.js; regras em mod/estilo.css).
// Para os heróis (e o seu indicador) continuarem nítidos, o mod muda os ícones deles para uma camada
// própria (#DU_IconesMapa) no #minimap_container, por cima do resto e fora do que fica transparente:
// mesmo tamanho, mesmo lugar e as mesmas classes de estado do minimapa (o jogo vira o minimapa com
// .invert_map e as regras dos ícones dependem dessas classes num ancestral). Os ícones mantêm o estilo
// do layout do jogo, e o jogo continua posicionando cada um.
// Só com a transparência ligada no modo atual; com o mapa opaco (ou F8) eles voltam para o minimapa.
var CLASSES_COPIA_MINIMAPA = (function () {
  var c = ["invert_map", "gScoreboardOpen", "gDetailView", "dl_midtown", "in_tunnels", "is_underground", "useZoomedMinimap", "forceShowMinimap"];
  for (var z = -1; z <= 11; z++) c.push("zoomLevel" + z);
  return c;
})();
function opacidadeMapaAgora() { return !modLigado ? 100 : mapa.aberto ? ajustes.mapaOpac : ajustes.miniOpac; }
// Botões do minimapa com uma classe, estejam no minimapa ou na camada dos heróis.
function botoesMapa(classe) {
  var lista = porClasse(minimapa(), classe);
  return valido(mapa.icones) ? lista.concat(porClasse(mapa.icones, classe)) : lista;
}
function vigiarIconesMapa() {
  var mm = minimapa();
  // o jogo recriou o minimapa: os ícones que ficaram na camada são do antigo
  if (mapa.iconesMm && mapa.iconesMm !== mm) { devolverIconesMapa(); mapa.iconesMm = null; }
  if (!(opacidadeMapaAgora() < 100) || !valido(mm)) { devolverIconesMapa(); return; }
  var caixa = null, pai = null;
  try { caixa = mm.GetParent(); pai = caixa.GetParent(); } catch (e) {}
  if (!valido(caixa) || !valido(pai)) return;
  if (!valido(mapa.icones) || mapa.iconesPai !== pai) {
    // uma camada que ficou de antes (script recarregado) é apagada pelo painelComLayout: devolve os
    // ícones dela primeiro, senão os heróis iriam junto
    var velha = achar(pai, "DU_IconesMapa");
    if (valido(velha)) porClasse(velha, "map_button").forEach(function (b) { try { b.SetParent(mm); } catch (e) {} });
    mapa.icones = painelComLayout(pai, "DU_IconesMapa", "iconesmapa");
    mapa.iconesPai = pai;
    mapa.iconesMovidos = [];
    mapa.iconesCaixa = null;
    if (!mapa.icones) return;
  }
  mapa.iconesMm = mm;
  mostrarPainel(mapa.icones, true);
  alinharIconesMapa(mm, caixa, mapa.icones);
  CLASSES_COPIA_MINIMAPA.forEach(function (c) { mapa.icones.SetHasClass(c, temClasse(mm, c) || temClasse(caixa, c)); });
  porClasse(mm, "player").forEach(function (b) {
    if (!temClasse(b, "map_button")) return;
    try { b.SetParent(mapa.icones); mapa.iconesMovidos.push(b); } catch (e) {}
  });
  mapa.iconesMovidos = mapa.iconesMovidos.filter(valido);
}
// Mesmo tamanho e mesmo lugar do #hud_minimap, por correção: a camada fica no #minimap_container, o
// minimapa no #HudMinimapContainer dentro dele (mesma escala), então a diferença entre os dois, medida
// a cada ciclo, é o que falta ajustar. Funciona com o ui-scale do minimapa (DUMini*), com a animação de
// abrir o mapa grande e com o minimapa com zoom, em que o #hud_minimap cresce e se desloca.
function alinharIconesMapa(mm, caixa, ov) {
  var mw = mm.actuallayoutwidth, mh = mm.actuallayoutheight;
  if (!(mw > 0 && mh > 0)) return;
  var c = mapa.iconesCaixa, ow = ov.actuallayoutwidth, oh = ov.actuallayoutheight;
  if (!c) {
    var esc = mm.actualuiscale_x || 1;
    c = mapa.iconesCaixa = { w: Math.round(mw / esc), h: Math.round(mh / esc), x: 0, y: 0 };
  } else if (ow > 0 && oh > 0) {
    // px de layout por pixel real, medido na própria camada
    var kx = c.w / ow, ky = c.h / oh;
    var dw = mw - ow, dh = mh - oh;
    var dx = (caixa.actualxoffset + mm.actualxoffset - ov.actualxoffset) || 0;
    var dy = (caixa.actualyoffset + mm.actualyoffset - ov.actualyoffset) || 0;
    if (Math.abs(dw) < 1 && Math.abs(dh) < 1 && Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    c.w = Math.min(4000, Math.round(c.w + dw * kx));
    c.h = Math.min(4000, Math.round(c.h + dh * ky));
    c.x += Math.round(dx * kx);
    c.y += Math.round(dy * ky);
  } else return;
  try {
    ov.style.width = c.w + "px";
    ov.style.height = c.h + "px";
    ov.style.position = c.x + "px " + c.y + "px 0px";
  } catch (e) {}
}
function devolverIconesMapa() {
  var dono = mapa.iconesMm;
  (mapa.iconesMovidos || []).forEach(function (b) {
    if (!valido(b)) return;
    // se o minimapa de onde o ícone veio não existe mais, o ícone ficou órfão (o novo tem os dele)
    try { if (valido(dono)) b.SetParent(dono); else b.DeleteAsync(0); } catch (e) {}
  });
  mapa.iconesMovidos = [];
  if (valido(mapa.icones)) mostrarPainel(mapa.icones, false);
}

// Chamado pelo loop rápido: fecha quando a loja abre ou o jogador saiu do placar por fora.
function vigiarMapa(estado) {
  // um erro aqui não pode parar o resto do loop rápido (mapa, Tab, loja, mira...)
  try { vigiarIconesMapa(); } catch (e) { if (!mapa.erroIcones) { mapa.erroIcones = true; log("camada dos heróis: " + e); } }
  vigiarMarcas();
  if (modLigado) ajustarJogador(false);
  if (valido(pontos.painel) && pontos.painel.visible !== false) atualizarCamadaPontos(); // segue a animação de abrir/fechar
  if (!mapa.aberto) return;
  ajustarJogador(true);
  // O mapa usa o placar por baixo (clique/ping no minimapa), mas a HUD não deve expandir como no Tab
  // (detalhes dos heróis no topo, níveis das habilidades embaixo): tira a classe só desses painéis.
  // Ao soltar o placar o jogo tira de todo mundo mesmo.
  PAINEIS_SEM_PLACAR.forEach(function (id) {
    if (!valido(mapa.semPlacar[id])) mapa.semPlacar[id] = achar(hud, id);
    if (temClasse(mapa.semPlacar[id], "gScoreboardOpen")) mapa.semPlacar[id].RemoveClass("gScoreboardOpen");
  });
  if (estado.lojaAberta || estado.escAberto) { fecharMapa(); return; }
  // Se o jogador soltou um Tab manual, o placar fecha: fecha o mapa também (depois de 1s de graça).
  // Só depois de ter visto o placar aberto: se a detecção falhar, o mapa não fecha sozinho (M/ESC fecham).
  if (estado.placarAberto) mapa.viuPlacar = true;
  if (!mapa.viuPlacar) return;
  if (!estado.placarAberto && Date.now() - mapa.abertoEm > 1000) fecharMapa();
}
