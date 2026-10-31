// ===================== Aba "Deadlock Utils" na janela do QOL Lock (só no addon) =====================
// O QOL não tem API para abas de outros mods e roda em outro contexto JS (o do menu ESC), então o encaixe é
// pela árvore de painéis e se conserta sozinho quando o QOL refaz a janela (ao carregar, ao trocar de idioma
// ou aplicar um preset nele):
//   botão: um grupo "Addons" no #SettingsTabBar, logo depois de #SettingsTabRailTabs (o QOL apaga e refaz o
//          que fica DENTRO dele; o nosso fica fora). A janela cresce a altura do grupo, senão o rodapé dela
//          (Discord, salvar build, versão) é espremido.
//   conteúdo: um painel com SettingsListContentHost dentro de #SettingsList, ao lado dos painéis do QOL.
//   abrir a nossa aba: esconde (Hidden) o painel do QOL que está à mostra e mostra o nosso. Qualquer sinal
//          de que o QOL trocou de aba (TabFading, painel dele à mostra de novo, busca, outra aba Active,
//          janela fechada) devolve a vez para ele. Clicar na aba do QOL que já estava ativa não muda nada no
//          QOL (ele ignora), então cada aba dele ganha um ouvinte nosso que devolve a vista na hora.
// Botão e conteúdo vêm de layouts nossos (qolbotao.xml, qolaba.xml) que incluem o CSS do QOL: painel criado
// pelo script não pega o CSS de outro layout (00-base.js, carregarLayout).

var qolAba = { grupo: null, conteudo: null, ativa: false, reabrir: false, escondidos: [], anterior: null,
  janela: null, base: 0, alturaPosta: "", ouvidos: [], ctl: null };
var ALTURA_GRUPO_QOL = 80; // px que o grupo "Addons" ocupa na barra (rótulo, linha, uma aba e a margem)

// Linhas da aba: valor de cada botão do XML (na ordem dos ids DUQol_<id>_<n> do qolaba.xml).
var OPCOES_QOL = {
  idioma: ["", "en", "pt", "es", "ru"],
  avisoSeg: [5, 7, 10, 15],
  teclaTracker: ["F5", "F6", "F9", "F10", ""],
  teclaDesligar: ["F8", "F9", "F10", "F11", ""],
};
// Linhas de tecla -> ação em ajustes.teclas (com o QOL não há a janela do mod, então as teclas ficam aqui).
var TECLAS_QOL = { teclaTracker: "tracker", teclaDesligar: "desligar" };
// Interruptores do XML (DUQol_<id>).
var LIGA_QOL = ["abaLoja", "faixaTab", "buildRecomendada", "avisoPerigo", "avisoSom", "mira", "miraContorno", "miraEsconderJogo"];
// Linhas com muitos botões (mira, pontos): montadas pelo script em #DUQolCtl_<chave>, a partir da mesma
// definição da central (SECOES_CFG: tipo, opções, limites, quando aparece). Painel criado pelo script não pega
// o CSS do QOL: esses botões usam o nosso (.DUQolChip), copiado do visual dos botões dele.
var CHIPS_QOL = ["miraPresets", "miraEstilo", "miraCor", "miraTam", "miraEsp", "miraGap", "miraRaio", "miraPonto", "miraOpac",
  "miraContornoEsp", "miraContornoCor", "miniPontos", "camadas"];
// Descrição (dica do jogo ao passar o mouse no nome) das linhas que não vêm da central.
var DICAS_QOL = { modLigado: "qol.modLigado.desc", counters: "qol.counters.codigo.desc", conta: "aj.conta.desc", codigo: "cfg.codigo.desc", restaurar: "cfg.restaurar.desc" };
// Definição da central para uma linha da aba (pelo id; as que não têm id, pelo nome ou tipo).
function defQol(chave) {
  var achada = null;
  SECOES_CFG.forEach(function (s) {
    s.itens.forEach(function (d) {
      if (!achada && !d.grupo && (d.id === chave || (chave === "miraPresets" && d.nome === "cfg.miraPresets") || (chave === "camadas" && d.tipo === "pontos"))) achada = d;
    });
  });
  return achada;
}
function chipQol(pai, texto, fn) {
  var b = criar("Button", pai, "", "DUQolChip");
  rotulo(b, "", texto);
  aoClicar(b, function () { fn(); atualizarAbaQol(); });
  return b;
}
// Um construtor por tipo de linha da central; cada um devolve a função que atualiza os botões.
var CHIPS_TIPO = {
  opcoes: function (ctl, def) {
    var bs = def.opcoes.map(function (o) { return { b: chipQol(ctl, esc(textoOpcao(def, o)), function () { definirCfg(def, o[0]); }), v: o[0] }; });
    return function () { var v = valorCfg(def); bs.forEach(function (x) { x.b.SetHasClass("DUQolAtivo", x.v === v); }); };
  },
  numero: function (ctl, def) {
    var passo = function (dir) {
      var v = Math.max(def.min, Math.min(def.max, Math.round((Number(valorCfg(def)) + dir * def.passo) * 100) / 100));
      if (v !== valorCfg(def)) definirCfg(def, v);
    };
    chipQol(ctl, "-", function () { passo(-1); });
    var valor = rotulo(ctl, "DUQolValor", "");
    chipQol(ctl, "+", function () { passo(1); });
    return function () { valor.text = esc(fmtCfg(def, Number(valorCfg(def)))); };
  },
  cor: function (ctl, def) {
    var as = CORES_PALETA.map(function (c) {
      var a = criar("Button", ctl, "", "DUQolCor");
      try { a.style.backgroundColor = c; } catch (e) {}
      aoClicar(a, function () { definirCfg(def, c); atualizarAbaQol(); });
      return { a: a, c: c };
    });
    return function () { var v = String(valorCfg(def)).toUpperCase(); as.forEach(function (x) { x.a.SetHasClass("DUQolAtivo", x.c.toUpperCase() === v); }); };
  },
  acoes: function (ctl, def) {
    (def.acoes || []).forEach(function (a) { chipQol(ctl, esc(T(a[0])), a[1]); });
    return function () {};
  },
  // camadas do mapa: aqui só as do minimapa (o mapa grande é da versão normal)
  pontos: function (ctl) {
    if (!pontos.filtros) carregarFiltros();
    var bs = DADOS_MAPA.camadas.map(function (c) { return { b: chipQol(ctl, esc(c.nome), function () { alternarFiltroMini(c.id); }), id: c.id }; });
    return function () { bs.forEach(function (x) { x.b.SetHasClass("DUQolAtivo", !!(pontos.filtrosMini || {})[x.id]); }); };
  },
};

// Painéis do QOL, guardados enquanto valem (FindChildTraverse no menu ESC inteiro custa).
function paineisQol() {
  var c = qolAba.ctl;
  if (!c || !valido(c.lista) || !valido(c.barra) || !valido(c.janela)) {
    var janela = achar(menuEsc(), "SettingsWindow");
    c = { janela: janela, barra: achar(janela, "SettingsTabBar"), trilho: achar(janela, "SettingsTabRailTabs"),
      lista: achar(janela, "SettingsList"), cache: achar(janela, "SettingsListCacheHost"), busca: achar(janela, "SettingsListSearchHost"),
      versao: achar(janela, "FooterVersionLabel") };
    if (!valido(c.janela) || !valido(c.barra) || !valido(c.lista)) return null; // o QOL ainda não montou a janela
    qolAba.ctl = c;
  }
  if (!valido(c.trilho)) c.trilho = achar(c.janela, "SettingsTabRailTabs");
  if (!valido(c.cache)) c.cache = achar(c.janela, "SettingsListCacheHost");
  if (!valido(c.busca)) c.busca = achar(c.janela, "SettingsListSearchHost");
  if (!valido(c.versao)) c.versao = achar(c.janela, "FooterVersionLabel");
  return c;
}

// ---------- montar e manter o botão e o conteúdo ----------
function montarAbaQol(c) {
  if (!valido(qolAba.grupo) || qolAba.grupo.GetParent() !== c.barra) {
    qolAba.grupo = painelComLayout(c.barra, "DUQolGrupo", "qolbotao");
    if (!qolAba.grupo) return false;
    aoClicar(achar(qolAba.grupo, "DUQolBotao"), function () { if (qolAba.ativa) return; ativarAbaQol(); });
    log("aba Deadlock Utils adicionada à janela do QOL Lock");
  }
  // o QOL reordena os filhos da barra quando refaz a janela: o grupo volta para logo depois das abas dele
  var irmaos = filhos(c.barra);
  if (valido(c.trilho) && irmaos.indexOf(qolAba.grupo) !== irmaos.indexOf(c.trilho) + 1) {
    try { c.barra.MoveChildAfter(qolAba.grupo, c.trilho); } catch (e) {}
  }
  if (!valido(qolAba.conteudo) || qolAba.conteudo.GetParent() !== c.lista) {
    qolAba.conteudo = painelComLayout(c.lista, "DUQolConteudo", "qolaba");
    if (!qolAba.conteudo) return false;
    ligarConteudoQol(qolAba.conteudo);
    qolAba.ativa = false;
  }
  if (qolAba.reabrir) { qolAba.reabrir = false; ativarAbaQol(); }
  return true;
}

// A janela fica mais alta o tanto do nosso grupo. Altura de referência = a da janela antes de mexer
// (actuallayoutheight vem em px de tela: divide pela escala, medida no cabeçalho de 50px do QOL).
function ajustarAlturaQol(c) {
  if (c.janela !== qolAba.janela) { qolAba.janela = c.janela; qolAba.base = 0; qolAba.alturaPosta = ""; }
  if (!qolAba.base) {
    var h = 0, cab = 0;
    try { h = c.janela.actuallayoutheight; cab = achar(c.janela, "SettingsHeader").actuallayoutheight; } catch (e) {}
    if (!(h > 0)) return; // fechada (sem layout): mede quando abrir
    qolAba.base = cab > 0 ? Math.round(h * 50 / cab) : 720;
  }
  var alvo = (qolAba.base + ALTURA_GRUPO_QOL) + "px";
  if (qolAba.alturaPosta === alvo) return;
  try { c.janela.style.height = alvo; qolAba.alturaPosta = alvo; } catch (e) {}
}

// Cada aba do QOL ganha um ouvinte (uma vez por botão): clicou numa aba dele com a nossa aberta, a vista volta.
function ouvirAbasQol(c) {
  var abas = porClasse(c.trilho, "TabItem");
  if (valido(c.versao)) abas.push(c.versao);
  qolAba.ouvidos = qolAba.ouvidos.filter(valido);
  abas.forEach(function (b) {
    if (qolAba.ouvidos.indexOf(b) >= 0) return;
    qolAba.ouvidos.push(b);
    try { $.RegisterEventHandler("Activated", b, function () { if (qolAba.ativa) desativarAbaQol(true); }); } catch (e) {}
  });
}

// ---------- abrir e fechar a nossa aba ----------
function ativarAbaQol() {
  var c = paineisQol();
  if (!c || !valido(qolAba.conteudo)) return;
  filhos(c.cache).forEach(function (p) {
    if (!temClasse(p, "SettingsListCachedTabContent") || temClasse(p, "Hidden")) return;
    p.AddClass("Hidden");
    if (qolAba.escondidos.indexOf(p) < 0) qolAba.escondidos.push(p);
  });
  if (valido(c.busca) && !temClasse(c.busca, "Hidden")) c.busca.AddClass("Hidden");
  // a aba do QOL que estava acesa apaga (ele mesmo acende de novo quando trocar de aba)
  porClasse(c.trilho, "TabItem").concat([c.versao]).forEach(function (b) {
    if (!temClasse(b, "Active")) return;
    b.RemoveClass("Active");
    qolAba.anterior = b;
  });
  qolAba.conteudo.RemoveClass("Hidden");
  var botao = achar(qolAba.grupo, "DUQolBotao");
  if (valido(botao)) botao.AddClass("Active");
  qolAba.ativa = true;
  atualizarAbaQol();
}
// devolver: a vista volta para o painel do QOL que escondemos (quando o QOL não vai trocar sozinho).
function desativarAbaQol(devolver) {
  qolAba.ativa = false;
  if (valido(qolAba.conteudo)) qolAba.conteudo.AddClass("Hidden");
  var botao = achar(qolAba.grupo, "DUQolBotao");
  if (valido(botao)) botao.RemoveClass("Active");
  if (devolver) {
    qolAba.escondidos.forEach(function (p) { if (valido(p)) p.RemoveClass("Hidden"); });
    if (valido(qolAba.anterior)) qolAba.anterior.AddClass("Active");
  }
  qolAba.escondidos = [];
  qolAba.anterior = null;
}
// O QOL trocou de aba, pesquisou ou se redesenhou: a vez é dele.
function qolTomouAVez(c) {
  if (temClasse(c.lista, "TabFading")) return true;
  if (valido(c.busca) && !temClasse(c.busca, "Hidden")) return true;
  if (filhos(c.cache).some(function (p) { return temClasse(p, "SettingsListCachedTabContent") && !temClasse(p, "Hidden"); })) return true;
  return porClasse(c.trilho, "TabItem").concat([c.versao]).some(function (b) { return temClasse(b, "Active"); });
}

// Loop próprio (não depende do mod estar ligado: a aba é por onde se religa). Rápido com a aba aberta.
function vigiarAbaQol() {
  if (compat.cedeu) return; // a versão normal também está instalada e é ela que roda (02-compat.js)
  var espera = 0.5;
  try {
    var c = compat.qol ? paineisQol() : null;
    if (c && montarAbaQol(c)) {
      var aberta = temClasse(c.janela, "Visible");
      if (aberta) { ajustarAlturaQol(c); ouvirAbasQol(c); }
      if (qolAba.ativa) {
        if (!aberta || qolTomouAVez(c)) desativarAbaQol(false);
        else { atualizarAbaQol(); espera = 0.1; }
      }
    }
  } catch (e) { log("aba do QOL: " + e); espera = 2; }
  $.Schedule(espera, vigiarAbaQol);
}

// ---------- controles ----------
function linhaQol(id) { return achar(qolAba.conteudo, "DUQolLinha_" + id); }
function ligarConteudoQol(p) {
  // dicas: a descrição da central (ou a própria da aba)
  filhos(p).forEach(function (l) {
    var chave = String(l.id || "").replace(/^DUQolLinha_/, "");
    if (!chave || chave === l.id) return;
    var def = defQol(chave);
    var texto = def ? descLinha(def) : temTexto(DICAS_QOL[chave] || "") ? T(DICAS_QOL[chave]) : "";
    if (texto) dica(porClasse(l, "LabelContainer")[0] || l, texto);
  });
  LIGA_QOL.forEach(function (id) {
    aoClicar(porClasse(achar(p, "DUQol_" + id), "SwitchButton")[0], function () { definirCfg({ id: id }, !ajustes[id]); atualizarAbaQol(); });
  });
  qolAba.chips = [];
  CHIPS_QOL.forEach(function (chave) {
    var def = defQol(chave), ctl = achar(p, "DUQolCtl_" + chave);
    if (!def || !valido(ctl) || !CHIPS_TIPO[def.tipo]) return;
    qolAba.chips.push(CHIPS_TIPO[def.tipo](ctl, def));
  });
  qolAba.previa = montarPreviaQol(achar(p, "DUQolPreviaMira"));
  aoClicar(achar(p, "DUQolPontosPadrao"), function () { restaurarPontos(); atualizarAbaQol(); });
  aoClicar(porClasse(achar(p, "DUQol_modLigado"), "SwitchButton")[0], function () { alternarMod(); atualizarAbaQol(); });
  Object.keys(OPCOES_QOL).forEach(function (id) {
    OPCOES_QOL[id].forEach(function (v, i) {
      aoClicar(achar(p, "DUQol_" + id + "_" + i), function () { escolherQol(id, v); atualizarAbaQol(); });
    });
  });
  // counters: copiar os editados / importar um código DU1 (o editor continua na aba da loja)
  var campoCounters = achar(p, "DUQolCampoCounters"), msgCounters = achar(p, "DUQolMsgCounters");
  aoClicar(achar(p, "DUQolCopiarCounters"), function () {
    var lista = Object.keys(overrides.herois);
    if (!lista.length) { msgCounters.text = esc(T("ed.nadaEditado")); return; }
    var codigo = codigoDeCounters(lista);
    try { campoCounters.text = codigo; } catch (e) {}
    msgCounters.text = esc(T(copiarTexto(codigo) ? "ed.copiado" : "ed.copieCampo"));
  });
  aoClicar(achar(p, "DUQolImportarCounters"), function () {
    try { msgCounters.text = esc(T("ed.importado", importarCodigoCounters(textoDe(campoCounters)).join(", "))); editor.rascunho = null; }
    catch (e) { msgCounters.text = "<font color='#ff3045'>" + esc(T("ed.invalido", e.message)) + "</font>"; }
  });
  // tracker
  aoClicar(achar(p, "DUQolAbrirTracker"), function () { abrirTracker(); });
  var campoConta = achar(p, "DUQolCampoConta");
  if (ajustes.contaSteam) { try { campoConta.text = String(ajustes.contaSteam); } catch (e) {} }
  aoClicar(achar(p, "DUQolSalvarConta"), function () {
    var id = lerContaSteam(textoDe(campoConta));
    if (!id) { achar(p, "DUQolEstadoConta").text = "<font color='#ff3045'>" + esc(T("aj.conta.invalida")) + "</font>"; qolAba.contaErro = true; return; }
    qolAba.contaErro = false;
    ajustes.contaSteam = id;
    salvarAjustes();
    atualizarAbaQol();
  });
  // backup das configurações (o mesmo código DUC1 da central)
  var campoCodigo = achar(p, "DUQolCampoCodigo"), msgCodigo = achar(p, "DUQolMsgCodigo");
  aoClicar(achar(p, "DUQolCopiarCodigo"), function () {
    var codigo = codigoDeAjustes();
    try { campoCodigo.text = codigo; } catch (e) {}
    msgCodigo.text = esc(T(copiarTexto(codigo) ? "cfg.codigo.copiado" : "ed.copieCampo"));
  });
  aoClicar(achar(p, "DUQolImportarCodigo"), function () {
    try { importarAjustes(textoDe(campoCodigo)); msgCodigo.text = esc(T("cfg.codigo.importado")); }
    catch (e) { msgCodigo.text = "<font color='#ff3045'>" + esc(T("ed.invalido", e.message)) + "</font>"; }
    atualizarAbaQol();
  });
  aoClicar(achar(p, "DUQolRestaurar"), function () { restaurarTudo(); atualizarAbaQol(); });
}

// Prévia da mira (o mesmo desenho de 80-mira.js) num quadro meio escuro, meio claro, como a da central.
function montarPreviaQol(caixa) {
  if (!valido(caixa) || !temModulo("mira")) return null;
  criar("Panel", caixa, "", "DUQolPreviaEscuro");
  criar("Panel", caixa, "", "DUQolPreviaClaro");
  var desenho = criar("Panel", caixa, "", "DUQolPreviaDesenho");
  var chave = "";
  return function () {
    var c = cfgMira(), k = JSON.stringify(c);
    if (k === chave) return;
    chave = k;
    desenharMira(desenho, c, 150);
  };
}

// Tecla já usada por outra ação (desligar, tracker): não dá para escolher.
function teclaOcupada(acao, v) {
  return !!v && Object.keys(ajustes.teclas).some(function (a) { return a !== acao && String(ajustes.teclas[a]).toLowerCase() === v.toLowerCase(); });
}
function escolherQol(id, v) {
  var acao = TECLAS_QOL[id];
  if (!acao) { definirCfg({ id: id }, v); return; }
  if (teclaOcupada(acao, v)) return;
  ajustes.teclas[acao] = v;
  salvarAjustes();
}

// Valores, linhas que somem e textos de estado. Barato: só classes e textos.
function atualizarAbaQol() {
  var p = qolAba.conteudo;
  if (!valido(p)) return;
  LIGA_QOL.concat(["modLigado"]).forEach(function (id) {
    var on = id === "modLigado" ? modLigado : !!ajustes[id];
    var sw = achar(p, "DUQol_" + id);
    if (!valido(sw)) return;
    sw.SetHasClass("ToggleOn", on);
    sw.SetHasClass("ToggleActive", on);
    sw.SetHasClass("ToggleOff", !on);
  });
  var valores = { idioma: ajustes.idioma || "", avisoSeg: ajustes.avisoSeg };
  Object.keys(TECLAS_QOL).forEach(function (id) { valores[id] = String(ajustes.teclas[TECLAS_QOL[id]] || "").toUpperCase(); });
  Object.keys(OPCOES_QOL).forEach(function (id) {
    OPCOES_QOL[id].forEach(function (v, i) {
      var b = achar(p, "DUQol_" + id + "_" + i);
      if (!valido(b)) return;
      b.SetHasClass("Active", v === valores[id]);
      if (TECLAS_QOL[id]) b.SetHasClass("DUQolUsada", teclaOcupada(TECLAS_QOL[id], v));
    });
  });
  (qolAba.chips || []).forEach(function (f) { f(); });
  mostrarPainel(linhaQol("miraPrevia"), !!ajustes.mira);
  if (qolAba.previa && ajustes.mira) qolAba.previa();
  // quando cada linha aparece: a mesma regra da central (ex.: o tamanho só com a mira ligada)
  LIGA_QOL.concat(CHIPS_QOL, ["avisoSeg", "avisoSom"]).forEach(function (chave) {
    var def = defQol(chave);
    if (!def || !def.mostrarSe) return;
    var vis = true;
    try { vis = !!def.mostrarSe(); } catch (e) {}
    mostrarPainel(linhaQol(chave), vis);
  });
  if (!qolAba.contaErro) achar(p, "DUQolEstadoConta").text = esc(T("aj.conta.atual", CONFIG.accountId ? String(CONFIG.accountId) : T("aj.conta.nenhuma")));
  achar(p, "DUQolSobre").text = esc(T("cfg.sobre.texto", DU_DATA.versao, DU_DATA.versaoJogo)) + "  ·  " +
    esc(!CONFIG.urlPonte ? T("aj.semPonte") : ponte.falhou ? T("aj.ponteFalhou") : estadoAjustes.salvo ? T("aj.salvo") : ponte.pronto ? T("cfg.sobre.ponteOk") : T("aj.salvando")) +
    "<br>" + esc(T("qol.creditos", compat.qolVersao || "?"));
}

// Idioma novo: os textos do layout são traduzidos ao carregar, então botão e conteúdo são refeitos
// (o vigia remonta na próxima volta e reabre a aba se ela estava aberta).
registrarModulo("qolaba", {
  idioma: function () {
    qolAba.reabrir = qolAba.ativa;
    qolAba.ativa = false;
    [qolAba.grupo, qolAba.conteudo].forEach(function (p) { if (valido(p)) p.DeleteAsync(0); });
    qolAba.grupo = null;
    qolAba.conteudo = null;
  },
});
if (ADDON_QOL) $.Schedule(2.0, vigiarAbaQol);
