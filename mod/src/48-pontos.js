// ===================== Pontos de interesse no minimapa (as duas versões) =====================
// Pontos (data/mapa.json, do deadlock-api + túneis do Rem tirados do próprio mapa): cada ponto tem posição
// RELATIVA (0..1) na imagem do minimapa: a mesma imagem que o jogo desenha preenchendo o #hud_minimap. As
// nossas camadas são FILHAS do #hud_minimap: herdam o tamanho e a inversão do mapa (para um dos times o jogo
// vira o minimapa com scaleX(-1) scaleY(-1)); só os ícones são "desvirados" para ficarem de pé.
// O mapa grande (M, 50-mapa.js, só na versão normal) usa as mesmas camadas com filtros próprios; no addon do
// QOL Lock ficam só os pontos no minimapa (o QOL não tem cura nem saltos).

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
var TAM_MAPA = 820; // px em que os pontos são posicionados; tem que bater com .DUMapaAberto #hud_minimap no estilo.css
// manual: camadas que o jogador ligou/desligou (não seguem mais o padrão por herói, ex.: túneis só para o Rem)
var pontos = { painel: null, criadas: {}, filtros: null, manual: {} };
function mapaGrandeAberto() { return temModulo("mapa") && mapa.aberto; }

// ---------- filtros ----------
function filtrosPadrao() {
  var f = {};
  DADOS_MAPA.camadas.concat(DADOS_MAPA.imagens).forEach(function (c) { f[c.id] = !!c.padrao; });
  return f;
}
// O minimapa normal tem filtros próprios: ele é pequeno, então por padrão só o essencial. No addon, o que o
// QOL não tem: cura e plataformas de salto.
var MINI_PADRAO = ADDON_QOL ? { lanches: true, saltos: true } : { lanches: true, sinos: true };
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
      if (mapaGrandeAberto()) desenharFiltros();
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
  if (mapaGrandeAberto()) desenharFiltros();
  if (CONFIG.urlPonte) ponteSalvar("du_mapa_filtros", JSON.stringify(pontos.filtros));
}
function alternarFiltroMini(id) {
  pontos.filtrosMini[id] = !pontos.filtrosMini[id];
  aplicarFiltros();
  if (CONFIG.urlPonte) ponteSalvar("du_mini_filtros", JSON.stringify(pontos.filtrosMini));
}
function algumFiltroMini() {
  return !!pontos.filtrosMini && Object.keys(pontos.filtrosMini).some(function (k) { return pontos.filtrosMini[k]; });
}
function restaurarPontos() {
  pontos.filtros = filtrosPadrao(); pontos.manual = {};
  pontos.filtrosMini = filtrosMiniPadrao();
  if (CONFIG.urlPonte) ponteSalvar("du_mini_filtros", JSON.stringify(pontos.filtrosMini));
  filtrosDoHeroi(ultimaLeitura ? ultimaLeitura.eu : null);
  aplicarFiltros();
  if (CONFIG.urlPonte) ponteSalvar("du_mapa_filtros", JSON.stringify(pontos.filtros));
  atualizarCentral();
}

// ---------- camadas (filhas do #hud_minimap) ----------
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
  if (p !== pontos.painel) { pontos.painel = p; pontos.criadas = {}; pontos.chaveEscala = ""; }
  return !!pontos.painel;
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
    // Só com o mapa grande aberto os pontos pegam o mouse (no minimapa a camada não pega clique).
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

// Mostra as camadas do modo atual: filtros do mapa grande com ele aberto, os do minimapa com ele fechado.
function aplicarFiltros() {
  if (!valido(pontos.painel) || !pontos.filtros) return;
  var fs = mapaGrandeAberto() || !pontos.filtrosMini ? pontos.filtros : pontos.filtrosMini;
  Object.keys(pontos.filtros).forEach(function (id) {
    var on = !!fs[id];
    var cam = on ? criarCamada(id) : pontos.criadas[id];
    if (cam) mostrarPainel(cam, on);
  });
}

function tamanhoMinimapa(mm) {
  if (mapaGrandeAberto()) return TAM_MAPA;
  var t = 0;
  try { t = mm.actuallayoutwidth / (mm.actualuiscale_x || 1); } catch (e) {}
  return t > 50 ? Math.round(t) : 360;
}

// ---------- os pontos no minimapa pequeno ----------
// A camada tem sempre TAM_MAPA px (os pontos foram posicionados nesse tamanho). No minimapa pequeno ela
// é centralizada sobre ele e reduzida com pre-transform-scale2d (que escala a partir do centro), então
// cada ponto cai no mesmo lugar relativo. Os ícones ganham uma escala de volta (.DUMiniPontos1..3) para
// não sumirem, e a camada não pega clique (o minimapa continua aceitando ping com o Tab). Segue o tamanho
// do minimapa a cada volta do loop rápido (o QOL Lock e o Tab mudam esse tamanho).
function atualizarCamadaPontos() {
  var p = pontos.painel;
  if (!valido(p)) return;
  var grande = mapaGrandeAberto();
  var mostrar = grande || (modLigado && ajustes.miniPontos > 0 && algumFiltroMini());
  mostrarPainel(p, mostrar);
  if (!mostrar) return;
  var tam = tamanhoMinimapa(minimapa());
  var esc = Math.round(tam / TAM_MAPA * 1000) / 1000;
  var chave = esc + "|" + grande + "|" + ajustes.miniPontos + "|" + TAM_MAPA;
  if (chave === pontos.chaveEscala) return;
  if (pontos.modoFiltros !== grande) { pontos.modoFiltros = grande; aplicarFiltros(); } // trocou entre mapa grande e minimapa
  pontos.chaveEscala = chave;
  var off = Math.round((tam - TAM_MAPA) / 2);
  try {
    p.style.width = TAM_MAPA + "px";
    p.style.height = TAM_MAPA + "px";
    p.style.position = off + "px " + off + "px 0px";
    p.style.preTransformScale2d = String(esc);
  } catch (e) {}
  p.SetHasClass("DUInvertido", temClasse(minimapa(), "invert_map"));
  [1, 2, 3].forEach(function (n) { p.SetHasClass("DUMiniPontos" + n, !grande && ajustes.miniPontos === n); });
  try { p.hittestchildren = !!grande; } catch (e) {}
}
// Loop lento (1s): cria a camada mesmo sem nunca ter aberto o mapa grande, e liga os túneis quando o
// herói é detectado (padrão por herói).
function garantirPontosMinimapa(leitura) {
  if (!modLigado || mapaGrandeAberto() || !(ajustes.miniPontos > 0)) { atualizarCamadaPontos(); return; }
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

// Ganchos (00-base.js). Os filtros vão no código DUC1 (f = mapa grande, m = minimapa).
registrarModulo("pontos", {
  rapido: function () { if (valido(pontos.painel) && pontos.painel.visible !== false) atualizarCamadaPontos(); },
  lento: garantirPontosMinimapa,
  esconder: atualizarCamadaPontos,
  aplicar: atualizarCamadaPontos,
  idioma: traduzirCamadasMapa,
  exportar: function (o) {
    if (!pontos.filtros) carregarFiltros();
    o.f = pontos.filtros;
    o.m = pontos.filtrosMini;
  },
  importar: function (o) {
    if (!pontos.filtros) carregarFiltros();
    [["f", "filtros", "du_mapa_filtros"], ["m", "filtrosMini", "du_mini_filtros"]].forEach(function (x) {
      var origem = o[x[0]];
      if (!origem || typeof origem !== "object") return;
      Object.keys(origem).forEach(function (k) { if (k in pontos[x[1]]) { pontos[x[1]][k] = !!origem[k]; if (x[0] === "f") pontos.manual[k] = true; } });
      if (CONFIG.urlPonte) ponteSalvar(x[2], JSON.stringify(pontos[x[1]]));
    });
    aplicarFiltros();
  },
  controles: {
    // Central: cada camada, ligada no mapa grande ("Mapa", só na versão normal) e no minimapa ("Mini").
    pontos: function (ctl) {
      if (!pontos.filtros) carregarFiltros();
      var chips = [], comGrande = temModulo("mapa");
      DADOS_MAPA.camadas.forEach(function (c) {
        var b = criar("Panel", ctl, "", "DUFiltro DUCfgCamada");
        var amostra = criar("Panel", b, "", "DUFiltroIcone " + (c.estilo === "icone" ? "DUBadge" : "DUBolinha"));
        if (amostra) {
          try { if (c.estilo === "icone") amostra.style.border = "2px solid " + c.cor; else amostra.style.backgroundColor = c.cor; } catch (e) {}
          if (c.estilo === "icone" && c.icone) { var im = imagem(amostra, "DUBadgeIcone", iconePonto(c)); if (im && !c.semCor) { try { im.style.washColor = c.cor; } catch (e) {} } }
        }
        rotulo(b, "DUFiltroNome", esc(c.nome));
        var chipG = null;
        if (comGrande) {
          chipG = criar("Button", b, "", "DUAbaModo DUCfgChipMini");
          rotulo(chipG, "", esc(T("aj.chipGrande")));
          aoClicar(chipG, function () { alternarFiltro(c.id); atualizarCentral(); });
        }
        var chipM = criar("Button", b, "", "DUAbaModo DUCfgChipMini");
        rotulo(chipM, "", esc(T("aj.chipMini")));
        aoClicar(chipM, function () { alternarFiltroMini(c.id); atualizarCentral(); });
        chips.push({ c: c, b: b, g: chipG, m: chipM });
      });
      return function () {
        chips.forEach(function (x) {
          var on = comGrande && !!pontos.filtros[x.c.id], onMini = !!(pontos.filtrosMini || {})[x.c.id];
          x.b.SetHasClass("DUFiltroOn", on || onMini);
          if (x.g) x.g.SetHasClass("DUAbaModoAtivo", on);
          x.m.SetHasClass("DUAbaModoAtivo", onMini);
        });
      };
    },
  },
});
