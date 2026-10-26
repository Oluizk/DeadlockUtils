// ===================== Central de configurações (janela) =====================
// Abre pela tecla (Shift direito por padrão), pelo botão "Deadlock Utils" no menu ESC e pelo botão
// Configurações da aba da loja. É montada a partir de SECOES_CFG (75-ajustes.js): barra lateral com as seções, pesquisa
// em todas as opções e prévia ao vivo (mira, barra de vida).
// Mudar um valor NÃO redesenha a lista: cada linha tem um "atualizar" (redesenhar tiraria o foco dos
// campos de texto). A lista só é refeita ao trocar de seção ou de pesquisa.

var central = { aberto: false, painel: null, falhou: false, secao: "geral", busca: "", linhas: [], grupos: [], teclaAberta: "", botoes: {} };

function montarCentral() {
  if (central.falhou) return false;
  if (valido(central.painel)) return true;
  central.painel = painelComLayout(hud, "DU_Central", "central");
  if (!central.painel) { central.falhou = true; log("central de configurações: layout não carregou"); return false; }
  central.secoes = achar(central.painel, "DUCentralSecoes");
  central.cabeca = achar(central.painel, "DUCentralCabeca");
  central.lista = achar(central.painel, "DUCentralLista");
  central.previa = achar(central.painel, "DUCentralPrevia");
  central.ponte = achar(central.painel, "DUCentralPonte");
  central.campoBusca = achar(central.painel, "DUCentralBuscaCampo");
  achar(central.painel, "DUCentralVersao").text = "v" + DU_DATA.versao;
  aoClicar(achar(central.painel, "DUCentralFechar"), fecharCentral);
  evento(central.painel, "oncancel", fecharCentral); // ESC com o foco na janela
  evento(central.campoBusca, "ontextentrychange", function () {
    var b = textoDe(central.campoBusca);
    if (b === central.busca) return;
    central.busca = b;
    desenharListaCentral();
  });
  mostrarPainel(central.painel, false);
  return true;
}

function abrirCentral(secao) {
  if (!modLigado || !montarCentral()) return;
  if (mapa.aberto) fecharMapa();
  if (tracker.aberto) fecharTracker();
  esconderDica();
  if (secao) central.secao = secao;
  central.aberto = true;
  // Aberta por cima da loja: fecha junto com ela (o ESC fecha a loja sem abrir o menu ESC).
  central.daLoja = temClasse(topBar(), "gShopOpen");
  mostrarPainel(central.painel, true);
  comando("hud_free_cursor 1");
  desenharCentral();
  som("UI.Shop.Mod.Starred.Click");
}
function fecharCentral() {
  if (!central.aberto) return;
  central.aberto = false;
  central.teclaAberta = "";
  esconderDica();
  mostrarPainel(central.painel, false);
  comando("hud_free_cursor -1");
}
function alternarCentral() { if (central.aberto) fecharCentral(); else abrirCentral(); }
// Loop rápido.
function vigiarCentral(e) {
  if (!central.aberto) return;
  if (central.daLoja && !e.lojaAberta) fecharCentral();
  else if (!central.daLoja && e.lojaAberta) central.daLoja = true; // abriu a loja com a central aberta
}

// ---------- barra lateral + lista ----------
function desenharCentral() {
  if (!valido(central.painel)) return;
  central.secoes.RemoveAndDeleteChildren();
  central.botoes = {};
  SECOES_CFG.forEach(function (s) {
    var b = criar("Button", central.secoes, "", "DUCentralSecao");
    // ícone pelo CSS (.DUSecIcone_<seção>): imagem posta pelo JS só carregava depois de um clique
    criar("Panel", b, "", "DUCentralSecaoIcone DUSecIcone_" + s.id);
    rotulo(b, "DUCentralSecaoNome", esc(T("cfg.sec." + s.id)));
    aoClicar(b, function () {
      central.secao = s.id;
      central.teclaAberta = "";
      if (central.busca) { central.busca = ""; try { central.campoBusca.text = ""; } catch (e) {} }
      desenharListaCentral();
    });
    central.botoes[s.id] = b;
  });
  desenharListaCentral();
}

function nomeLinha(def) { return T(def.nome || "cfg." + def.id); }
function descLinha(def) {
  var k = def.desc || "cfg." + def.id + ".desc";
  return temTexto(k) ? T(k) : "";
}
// Cada termo pesquisado precisa ser o começo de alguma palavra ("urn" acha "urna", não "turns").
function linhaCombina(def, s, grupo, busca) {
  var txt = [nomeLinha(def), descLinha(def), T("cfg.sec." + s.id), grupo ? T(grupo) : "", def.chaves ? T(def.chaves) : ""].join(" ");
  var palavras = semAcento(txt).split(/[^a-z0-9а-яё%#]+/);
  return busca.split(/\s+/).every(function (termo) {
    return palavras.some(function (p) { return p.indexOf(termo) === 0; });
  });
}

function desenharListaCentral() {
  var lista = central.lista;
  if (!valido(lista)) return;
  lista.RemoveAndDeleteChildren();
  central.linhas = [];
  central.grupos = [];
  var busca = semAcento(central.busca).trim();
  var sec = secaoCfg(central.secao);
  Object.keys(central.botoes).forEach(function (k) { central.botoes[k].SetHasClass("DUCentralSecaoAtiva", !busca && k === sec.id); });
  central.cabeca.RemoveAndDeleteChildren();
  if (busca) cartaz(central.cabeca, { titulo: T("cfg.resultados"), sub: central.busca, tema: "escuro" });
  else {
    var cab = cartaz(central.cabeca, { titulo: T("cfg.sec." + sec.id), sub: T("cfg.sec." + sec.id + ".sub"), tema: sec.tema });
    if (cab) { var ic = criar("Panel", cab.conteudo, "", "DUCartazIcone DUSecIcone_" + sec.id); try { cab.conteudo.MoveChildBefore(ic, cab.titulo); } catch (e) {} }
  }

  var achou = 0;
  (busca ? SECOES_CFG : [sec]).forEach(function (s) {
    var grupo = null, painelGrupo = null, secFeita = false;
    s.itens.forEach(function (def) {
      if (def.grupo) { grupo = def.grupo; painelGrupo = null; return; }
      if (busca && !linhaCombina(def, s, grupo, busca)) return;
      if (busca && !secFeita) { secFeita = true; rotulo(lista, "DUCfgSecaoBusca", esc(T("cfg.sec." + s.id))); }
      if (grupo && !painelGrupo) {
        painelGrupo = criar("Panel", lista, "", "DUCfgGrupo");
        rotulo(painelGrupo, "DUCfgGrupoNome", esc(T(grupo)));
        criar("Panel", painelGrupo, "", "DUCfgGrupoLinha");
        central.grupos.push(painelGrupo);
      }
      var l = criarLinhaCfg(lista, def);
      l.grupo = painelGrupo;
      central.linhas.push(l);
      achou++;
    });
  });
  if (!achou) rotulo(lista, "DUAbaVazio DUCfgVazio", esc(T("cfg.nadaEncontrado")));
  central.tipoPrevia = busca ? "" : sec.previa || "";
  mostrarPainel(central.previa, !!central.tipoPrevia);
  if (central.tipoPrevia) montarPrevia(central.tipoPrevia);
  atualizarCentral();
}

// Linhas largas: o controle vai embaixo do texto (muitos botões, paleta de cores, grades).
var TIPOS_LARGOS = { pontos: 1, codigo: 1, sobre: 1, acoes: 1, cor: 1 };
function criarLinhaCfg(pai, def) {
  var l = { def: def };
  var larga = TIPOS_LARGOS[def.tipo] || (def.tipo === "opcoes" && def.opcoes.length > 4);
  var p = criar("Panel", pai, "", "DUCfgLinha DUCfgLinha_" + def.tipo + (larga ? " DUCfgLarga" : ""));
  l.painel = p;
  var tx = criar("Panel", p, "", "DUCfgTextos");
  rotulo(tx, "DUCfgNome", esc(nomeLinha(def)));
  var d = descLinha(def);
  if (d) rotulo(tx, "DUCfgDesc", esc(d));
  var ctl = criar("Panel", p, "", "DUCfgControle");
  var fn = CONTROLES_CFG[def.tipo];
  l.atualizar = (fn && fn(ctl, def, l)) || function () {};
  return l;
}

// Atualiza os controles (e a visibilidade de cada linha) sem refazer a lista.
function atualizarCentral() {
  if (!central.aberto || !valido(central.lista)) return;
  var gruposVisiveis = [];
  central.linhas.forEach(function (l) {
    var vis = true;
    try { vis = !l.def.mostrarSe || !!l.def.mostrarSe(); } catch (e) {}
    mostrarPainel(l.painel, vis);
    if (vis && l.grupo && gruposVisiveis.indexOf(l.grupo) < 0) gruposVisiveis.push(l.grupo);
    if (vis) { try { l.atualizar(); } catch (e) { log("configuração " + (l.def.id || l.def.tipo) + ": " + e); } }
  });
  central.grupos.forEach(function (g) { mostrarPainel(g, gruposVisiveis.indexOf(g) >= 0); });
  if (central.tipoPrevia) desenharPrevia(central.tipoPrevia);
  desenharStatusCentral();
}

function desenharStatusCentral() {
  if (!valido(central.ponte)) return;
  central.ponte.text = esc(!CONFIG.urlPonte ? T("aj.semPonte") : ponte.falhou ? T("aj.ponteFalhou") : estadoAjustes.salvo ? T("aj.salvo") : T("aj.salvando"));
  central.ponte.SetHasClass("DUCentralPonteOk", !!(CONFIG.urlPonte && !ponte.falhou && estadoAjustes.salvo));
}

// ---------- valores ----------
function valorCfg(def) { return def.valor ? def.valor() : lerAjuste(def.id); }
function definirCfg(def, v) {
  gravarAjuste(def.id, v);
  if (def.id === "miniPontos" && v > 0) ajustes.miniPontosAntes = v;
  salvarAjustes();
}
function fmtCfg(def, v) {
  if (def.fmt === "relogio") return relogio(v);
  return String(v) + (def.unidade || "");
}
function textoOpcao(def, o) {
  if (def.cru) return o[1];
  if (def.cruParcial && !temTexto(o[1])) return o[1];
  return T(o[1]);
}

// ---------- controles (um por tipo de linha). Cada um devolve a função que o atualiza. ----------
var CONTROLES_CFG = {
  liga: function (ctl, def, l) {
    var sw = criar("Panel", ctl, "", "DUCfgSwitch");
    criar("Panel", sw, "", "DUCfgSwitchBola");
    var txt = rotulo(ctl, "DUCfgSwitchTexto", "");
    aoClicar(l.painel, function () { definirCfg(def, !valorCfg(def)); });
    return function () {
      var v = !!valorCfg(def);
      sw.SetHasClass("DUCfgOn", v);
      txt.text = esc(T(v ? "cfg.ligado" : "cfg.desligado"));
    };
  },

  opcoes: function (ctl, def) {
    var botoes = (def.opcoes || []).map(function (o) {
      var b = criar("Button", ctl, "", "DUAbaModo DUCfgOpcao");
      rotulo(b, "", esc(textoOpcao(def, o)));
      aoClicar(b, function () { definirCfg(def, o[0]); });
      return { b: b, v: o[0] };
    });
    return function () {
      var v = valorCfg(def);
      botoes.forEach(function (x) { x.b.SetHasClass("DUAbaModoAtivo", x.v === v); });
    };
  },

  numero: function (ctl, def) {
    var passo = function (dir) {
      var v = Number(valorCfg(def)) + dir * def.passo;
      v = Math.max(def.min, Math.min(def.max, Math.round(v * 100) / 100));
      if (v !== valorCfg(def)) definirCfg(def, v);
    };
    botao(ctl, "DUCfgPasso", "-", function () { passo(-1); });
    var barra = criar("Panel", ctl, "", "DUCfgBarra");
    var cheia = criar("Panel", barra, "", "DUCfgBarraCheia");
    var valor = rotulo(barra, "DUCfgBarraValor", "");
    botao(ctl, "DUCfgPasso", "+", function () { passo(1); });
    var padrao = rotulo(ctl, "DUCfgPadrao", "");
    aoClicar(padrao, function () { definirCfg(def, lerPadrao(def.id)); });
    return function () {
      var v = Number(valorCfg(def));
      var f = Math.max(0, Math.min(1, (v - def.min) / ((def.max - def.min) || 1)));
      try { cheia.style.width = Math.round(100 * f) + "%"; } catch (e) {}
      valor.text = esc(fmtCfg(def, v));
      var p = lerPadrao(def.id);
      padrao.text = p === v ? "" : esc(T("cfg.padrao", fmtCfg(def, p)));
    };
  },

  cor: function (ctl, def) {
    var amostras = CORES_PALETA.map(function (c) {
      var a = criar("Panel", ctl, "", "DUCfgCor");
      try { a.style.backgroundColor = c; } catch (e) {}
      aoClicar(a, function () { definirCfg(def, c); });
      return { p: a, c: c };
    });
    var campo = criar("TextEntry", ctl, "", "DUTexto DUCfgHex", { maxchars: "7" });
    var atual = criar("Panel", ctl, "", "DUCfgCorAtual");
    var normal = function (t) { t = String(t || "").trim().toUpperCase(); return t.charAt(0) === "#" ? t : "#" + t; };
    var posto = ""; // último texto posto pelo mod: o evento de mudança que ele gera não é digitação
    evento(campo, "ontextentrychange", function () {
      var t = normal(textoDe(campo));
      if (t === posto) { posto = ""; return; }
      if (/^#[0-9A-F]{6}$/.test(t) && t !== normal(valorCfg(def))) definirCfg(def, t);
    });
    return function () {
      var v = normal(valorCfg(def));
      amostras.forEach(function (x) { x.p.SetHasClass("DUCfgCorSel", x.c.toUpperCase() === v); });
      try { atual.style.backgroundColor = v; } catch (e) {}
      if (normal(textoDe(campo)) !== v) { posto = v; try { campo.text = v; } catch (e) {} }
    };
  },

  acoes: function (ctl, def) {
    (def.acoes || []).forEach(function (a) { botao(ctl, "DUCfgOpcao", esc(T(a[0])), a[1]); });
  },

  // Tecla: clicar abre a grade de teclas logo abaixo da linha (a lista é refeita).
  tecla: function (ctl, def) {
    var b = criar("Button", ctl, "", "DUAbaModo DUCfgOpcao DUCfgTecla");
    var lb = rotulo(b, "", "");
    aoClicar(b, function () { central.teclaAberta = central.teclaAberta === def.id ? "" : def.id; desenharListaCentral(); });
    if (central.teclaAberta === def.id) {
      var acao = def.id.split(".")[1];
      var atual = String(valorCfg(def) || "").toLowerCase();
      var g = criar("Panel", central.lista, "", "DUCfgTeclas");
      rotulo(g, "DUCfgDesc DUCfgTeclasDica", esc(T("aj.tecla.dica")));
      TECLAS_ESCOLHA.concat([""]).forEach(function (t) {
        var usada = t && Object.keys(ajustes.teclas).some(function (a) { return a !== acao && String(ajustes.teclas[a]).toLowerCase() === t.toLowerCase(); });
        var k = criar("Button", g, "", "DUAbaModo DUCfgTeclaOpcao" + (atual === t.toLowerCase() ? " DUAbaModoAtivo" : "") + (usada ? " DUCfgTeclaUsada" : ""));
        rotulo(k, "", esc(t ? nomeTecla(t) : T("aj.nenhuma")));
        if (usada) return;
        aoClicar(k, function () { ajustes.teclas[acao] = t; central.teclaAberta = ""; salvarAjustes(); desenharListaCentral(); });
      });
    }
    return function () {
      var v = valorCfg(def);
      lb.text = esc(v ? nomeTecla(v) : T("aj.nenhuma"));
      b.SetHasClass("DUAbaModoAtivo", central.teclaAberta === def.id);
    };
  },

  // Código de amigo da Steam para o tracker.
  conta: function (ctl, def, l) {
    var campo = criar("TextEntry", ctl, "", "DUTexto DUCfgCampo", { maxchars: "80" });
    if (campo && ajustes.contaSteam) { try { campo.text = String(ajustes.contaSteam); } catch (e) {} }
    var estado = rotulo(filhos(l.painel)[0] || l.painel, "DUCfgDesc DUCfgConta", ""); // embaixo do nome
    botao(ctl, "DUBotaoPrimario DUCfgOpcao", T("aj.conta.salvar"), function () {
      var id = lerContaSteam(textoDe(campo));
      if (!id) { estado.text = "<font color='#a8322a'>" + esc(T("aj.conta.invalida")) + "</font>"; return; }
      ajustes.contaSteam = id;
      salvarAjustes();
    });
    return function () {
      estado.text = esc(T("aj.conta.atual", CONFIG.accountId ? String(CONFIG.accountId) : T("aj.conta.nenhuma")));
    };
  },

  // Camadas do mapa: liga cada uma no mapa grande ("Mapa") e no minimapa ("Mini").
  pontos: function (ctl) {
    if (!pontos.filtros) carregarFiltros();
    var chips = [];
    DADOS_MAPA.camadas.forEach(function (c) {
      var b = criar("Panel", ctl, "", "DUFiltro DUCfgCamada");
      var amostra = criar("Panel", b, "", "DUFiltroIcone " + (c.estilo === "icone" ? "DUBadge" : "DUBolinha"));
      if (amostra) {
        try { if (c.estilo === "icone") amostra.style.border = "2px solid " + c.cor; else amostra.style.backgroundColor = c.cor; } catch (e) {}
        if (c.estilo === "icone" && c.icone) { var im = imagem(amostra, "DUBadgeIcone", iconePonto(c)); if (im && !c.semCor) { try { im.style.washColor = c.cor; } catch (e) {} } }
      }
      rotulo(b, "DUFiltroNome", esc(c.nome));
      var chipG = criar("Button", b, "", "DUAbaModo DUCfgChipMini");
      rotulo(chipG, "", esc(T("aj.chipGrande")));
      aoClicar(chipG, function () { alternarFiltro(c.id); atualizarCentral(); });
      var chipM = criar("Button", b, "", "DUAbaModo DUCfgChipMini");
      rotulo(chipM, "", esc(T("aj.chipMini")));
      aoClicar(chipM, function () { alternarFiltroMini(c.id); atualizarCentral(); });
      chips.push({ c: c, b: b, g: chipG, m: chipM });
    });
    return function () {
      chips.forEach(function (x) {
        var on = !!pontos.filtros[x.c.id], onMini = !!(pontos.filtrosMini || {})[x.c.id];
        x.b.SetHasClass("DUFiltroOn", on || onMini);
        x.g.SetHasClass("DUAbaModoAtivo", on);
        x.m.SetHasClass("DUAbaModoAtivo", onMini);
      });
    };
  },

  // Backup: copiar código / colar e importar.
  codigo: function (ctl) {
    var linha = criar("Panel", ctl, "", "DUCfgCodigoAcoes");
    var campo = null, msg = null;
    botao(linha, "DUBotaoPrimario DUCfgOpcao", T("cfg.codigo.copiar"), function () {
      var c = codigoDeAjustes();
      try { campo.text = c; } catch (e) {}
      msg.text = esc(T(copiarTexto(c) ? "cfg.codigo.copiado" : "ed.copieCampo"));
      log("código das configurações: " + c);
    });
    botao(linha, "DUCfgOpcao", T("cfg.codigo.importar"), function () {
      try { importarAjustes(textoDe(campo)); msg.text = esc(T("cfg.codigo.importado")); }
      catch (e) { msg.text = "<font color='#a8322a'>" + esc(T("ed.invalido", e.message)) + "</font>"; }
    });
    campo = criar("TextEntry", ctl, "", "DUTexto DUCfgCodigo", { maxchars: "4000" });
    msg = rotulo(ctl, "DUCfgDesc DUCfgCodigoMsg", "");
  },

  sobre: function (ctl) {
    var l = rotulo(ctl, "DUCfgDesc DUCfgSobre", "");
    return function () {
      l.text = esc(T("cfg.sobre.texto", DU_DATA.versao, DU_DATA.versaoJogo)) + "<br>" +
        esc(!CONFIG.urlPonte ? T("aj.semPonte") : ponte.falhou ? T("aj.ponteFalhou") : ponte.pronto ? T("cfg.sobre.ponteOk") : T("aj.salvando")) +
        "<br>github.com/Oluizk/DeadlockUtils";
    };
  },
};
function lerPadrao(id) {
  var i = String(id).indexOf(".");
  return i < 0 ? AJUSTES_PADRAO[id] : (AJUSTES_PADRAO[id.slice(0, i)] || {})[id.slice(i + 1)];
}

// ---------- prévia (coluna da direita) ----------
function montarPrevia(tipo) {
  var p = central.previa;
  p.RemoveAndDeleteChildren();
  central.chavePrevia = "";
  central.previaDesenho = null;
  central.previaBarras = null;
  rotulo(p, "DUCfgPreviaTitulo", esc(T("cfg.previa")));
  if (tipo === "mira") {
    var caixa = criar("Panel", p, "", "DUCfgPreviaMira");
    criar("Panel", caixa, "", "DUCfgPreviaEscuro");
    criar("Panel", caixa, "", "DUCfgPreviaClaro");
    central.previaDesenho = criar("Panel", caixa, "", "DUCfgPreviaDesenho");
    rotulo(p, "DUCfgPreviaDica", esc(T("cfg.previa.mira")));
  } else if (tipo === "vida") {
    central.previaBarras = [95, 70, 45, 15].map(function (pct) {
      var linha = criar("Panel", p, "", "DUCfgPreviaVida");
      rotulo(linha, "DUCfgPreviaPct", pct + "%");
      var barra = criar("Panel", linha, "", "DUCfgPreviaBarra");
      return { pct: pct, cheia: criar("Panel", barra, "", "DUCfgPreviaCheia") };
    });
    rotulo(p, "DUCfgPreviaDica", esc(T("cfg.previa.vida")));
  }
}
function desenharPrevia(tipo) {
  if (tipo === "mira" && valido(central.previaDesenho)) {
    var c = cfgMira();
    var chave = JSON.stringify(c);
    if (chave === central.chavePrevia) return;
    central.chavePrevia = chave;
    desenharMira(central.previaDesenho, c, 260);
  } else if (tipo === "vida" && central.previaBarras) {
    // mesma textura da barra do jogo tingida com wash-color, como no HUD (cor de fundo ficaria por baixo dela)
    central.previaBarras.forEach(function (x) {
      try {
        x.cheia.style.width = x.pct + "%";
        x.cheia.style.washColor = corVida(x.pct) || null;
      } catch (e) {}
    });
  }
}
