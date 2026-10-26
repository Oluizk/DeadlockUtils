// ===================== Editor de counters (dentro da aba da loja) =====================
// Escolhe um herói, edita os itens que counteram ele (peso 1 a 4 + motivo), salva, compartilha por
// código curto (DU1:...) ou importa um código colado. O salvamento usa o armazenamento da ponte
// (navegador embutido); se não houver, as mudanças valem até fechar o jogo.
//
// Layout da coluna da direita: cabeçalho, lista dos counters (altura fixa, rola), ações e, embaixo,
// o catálogo de itens (pesquisa + abas por categoria + grade que rola) ou o painel de compartilhar.
// Tudo com altura fixa: numa coluna sem altura fixa o Panorama espreme (squish) o que não cabe e o
// catálogo sumia.

var editor = { heroi: "", rascunho: null, alvo: null, detalhe: null, busca: "", cat: "todas", compartilhando: false };
var CATEGORIAS = ["weapon", "vitality", "spirit"];

function abrirEditor(alvo, detalhe) {
  editor.alvo = alvo;
  editor.detalhe = detalhe;
  alvo.RemoveAndDeleteChildren();
  var corpo = criar("Panel", alvo, "", "DUEditor");

  var esquerda = criar("Panel", corpo, "", "DUEditorHerois");
  rotulo(esquerda, "DUAbaSecao", T("ed.heroiInimigo"));
  var grade = criar("Panel", esquerda, "", "DUGradeHerois");
  Object.keys(dados.herois).sort().forEach(function (nome) {
    var b = criar("Panel", grade, "", "DUHeroiBotao" + (nome === editor.heroi ? " DUSelecionado" : ""));
    imagem(b, "DUHeroiFoto", imagemHeroi(nome));
    rotulo(b, "DUHeroiNome", esc(nome));
    if (overrides.herois[nome]) rotulo(b, "DUHeroiEditado", T("ed.editado"));
    aoClicar(b, function () { editor.heroi = nome; editor.rascunho = null; editor.compartilhando = false; abrirEditor(alvo, detalhe); });
  });

  var direita = criar("Panel", corpo, "", "DUEditorDireita");
  editor.direita = direita;
  if (!editor.heroi) {
    rotulo(direita, "DUAbaVazio DUEditorEscolha", T("ed.escolhaHeroi"));
    desenharCompartilhar(direita);
  } else {
    desenharHeroiEditor();
  }
}

function desenharHeroiEditor() {
  var d = editor.direita;
  var h = editor.heroi;
  if (!editor.rascunho) editor.rascunho = countersDoHeroi(h).map(function (c) { return { item: c.item, peso: c.peso, motivo: c.motivo || "" }; });

  // cabeçalho: retrato, título, estado (padrão / editado) e ações
  var cab = criar("Panel", d, "", "DUEditorCab");
  imagem(cab, "DUEditorFoto", imagemHeroi(h));
  var tt = criar("Panel", cab, "", "DUEditorCabTextos");
  rotulo(tt, "DUEditorTitulo", esc(T("ed.countersContra", h)));
  rotulo(tt, "DUEditorEstado", T(overrides.herois[h] ? "ed.editadoPorVoce" : "ed.padraoComunidade") + " " + T("ed.ajudaPeso"));
  var acoes = criar("Panel", cab, "", "DUEditorAcoes");
  botao(acoes, "DUBotaoPrimario", T("ed.salvar"), function () {
    overrides.herois[h] = editor.rascunho.filter(function (c) { return dados.itensPorId[c.item]; });
    salvarOverrides();
    atualizarRecomendacoes(ultimaLeitura || lerPartida(), true);
    mensagemEditor(T("ed.salvos", h));
    redesenharEditor();
  });
  botao(acoes, "", T("ed.restaurar"), function () {
    delete overrides.herois[h];
    editor.rascunho = null;
    salvarOverrides();
    atualizarRecomendacoes(ultimaLeitura || lerPartida(), true);
    mensagemEditor(T("ed.restaurados", h));
    redesenharEditor();
  });
  botao(acoes, editor.compartilhando ? "DUAbaModoAtivo" : "", T("ed.compartilhar"), function () {
    editor.compartilhando = !editor.compartilhando;
    redesenharEditor();
  });

  // lista dos counters do herói
  var colunas = criar("Panel", d, "", "DUEditorColunas");
  rotulo(colunas, "DUEditorColItem", T("ed.col.item", editor.rascunho.length));
  rotulo(colunas, "DUEditorColPeso", T("ed.col.peso"));
  rotulo(colunas, "DUEditorColMotivo", T("ed.col.motivo"));
  var lista = criar("Panel", d, "", "DUEditorLista");
  if (!editor.rascunho.length) rotulo(lista, "DUEditorVazio", T("ed.nenhumCounter"));
  editor.rascunho.forEach(function (c, idx) {
    var it = dados.itensPorId[c.item];
    if (!it) return;
    var linha = criar("Panel", lista, "", "DUEditorLinha DUCat_" + it.categoria);
    var icone = imagem(linha, "DUEditorIcone", iconeItem(it));
    tooltipDoItem(icone, it);
    rotulo(linha, "DUEditorItemNome", esc(nomeItem(it)));
    var pesos = criar("Panel", linha, "", "DUPesos");
    [1, 2, 3, 4].forEach(function (p) {
      var b = botao(pesos, "DUPeso" + (c.peso === p ? " DUSelecionado" : ""), String(p), function () { c.peso = p; redesenharEditor(); });
      dica(b, T("ed.peso." + p));
    });
    // Sem placeholder: no Panorama ele é desenhado por cima do texto definido via código.
    var motivo = criar("TextEntry", linha, "", "DUTexto DUMotivo", { maxchars: "200" });
    if (motivo) {
      try { motivo.text = c.motivo; } catch (e) {}
      evento(motivo, "ontextentrychange", function () { c.motivo = textoDe(motivo); });
    }
    var x = botao(linha, "DURemover", "×", function () { editor.rascunho.splice(idx, 1); redesenharEditor(); });
    dica(x, T("ed.remover"));
  });

  editor.msg = rotulo(d, "DUEditorMsg", esc(editor.ultimaMsg || ""));
  if (editor.compartilhando) desenharCompartilhar(d);
  else desenharCatalogo(d);
}

// ---------- catálogo de itens: pesquisa + abas + grade ----------
function desenharCatalogo(d) {
  var caixa = criar("Panel", d, "", "DUCatalogo");
  var barra = criar("Panel", caixa, "", "DUCatalogoBarra");
  rotulo(barra, "DUCatalogoTitulo", T("ed.adicionar"));
  var abas = criar("Panel", barra, "", "DUCatalogoAbas");
  editor.abas = {};
  ["todas"].concat(CATEGORIAS).forEach(function (cat) {
    var b = botao(abas, "DUCatalogoAba DUCatAba_" + cat + (editor.cat === cat ? " DUAbaModoAtivo" : ""),
      T(cat === "todas" ? "ed.cat.todas" : "cat." + cat), function () {
        editor.cat = cat;
        Object.keys(editor.abas).forEach(function (k) { editor.abas[k].SetHasClass("DUAbaModoAtivo", k === cat); });
        desenharGradeCatalogo();
      });
    editor.abas[cat] = b;
  });
  var busca = criar("Panel", barra, "", "DUCatalogoBusca");
  rotulo(busca, "DUCatalogoLupa", T("ed.buscar"));
  var campo = criar("TextEntry", busca, "", "DUTexto DUCatalogoCampo", { maxchars: "40" });
  if (campo) {
    try { campo.text = editor.busca; } catch (e) {}
    // Só a grade é redesenhada: redesenhar tudo tiraria o foco do campo a cada letra.
    evento(campo, "ontextentrychange", function () { editor.busca = textoDe(campo); desenharGradeCatalogo(); });
  }
  rotulo(caixa, "DUCatalogoAjuda", T("ed.cliqueAdicionar"));
  editor.grade = criar("Panel", caixa, "", "DUCatalogoGrade");
  desenharGradeCatalogo();
}

function semAcento(t) {
  var de = "áàâãäéèêëíìîïóòôõöúùûüçñ", para = "aaaaaeeeeiiiiooooouuuucn";
  return String(t || "").toLowerCase().replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, function (ch) { return para.charAt(de.indexOf(ch)); });
}
function itemCombina(it, busca) {
  if (!busca) return true;
  return [nomeItem(it), it.nome, it.nome_pt].some(function (n) { return n && semAcento(n).indexOf(busca) >= 0; });
}

function desenharGradeCatalogo() {
  var g = editor.grade;
  if (!valido(g)) return;
  g.RemoveAndDeleteChildren();
  var busca = semAcento(editor.busca).trim();
  var no = {};
  editor.rascunho.forEach(function (c) { no[c.item] = true; });
  var itens = dados.itens.filter(function (it) {
    return (editor.cat === "todas" || it.categoria === editor.cat) && itemCombina(it, busca);
  }).sort(function (a, b) {
    return a.tier - b.tier || CATEGORIAS.indexOf(a.categoria) - CATEGORIAS.indexOf(b.categoria) || (nomeItem(a) < nomeItem(b) ? -1 : 1);
  });
  if (!itens.length) { rotulo(g, "DUEditorVazio", T("ed.nadaEncontrado")); return; }
  var tier = 0, linha = null;
  itens.forEach(function (it) {
    if (it.tier !== tier) {
      tier = it.tier;
      var cabTier = criar("Panel", g, "", "DUCatalogoTier");
      rotulo(cabTier, "DUCatalogoTierNome", T("ed.tier", tier));
      rotulo(cabTier, "DUCatalogoTierCusto", esc(T("almas", it.custo)));
      linha = criar("Panel", g, "", "DUCatalogoLinha");
    }
    var c = cartaoItem(linha, it, { classe: "DUCartaoEscolha" + (no[it.id] ? " DUJaNaLista" : "") });
    tooltipDoItem(c, it, function () { return no[it.id] ? T("ed.cliqueRemover") : T("ed.cliqueAdicionarItem"); });
    aoClicar(c, function () {
      if (no[it.id]) editor.rascunho = editor.rascunho.filter(function (x) { return x.item !== it.id; });
      else editor.rascunho.push({ item: it.id, peso: 2, motivo: "" });
      redesenharEditor();
    });
  });
}

// Tooltip do próprio jogo (CitadelShowModTooltip, 40-tab.js); se não houver, um texto simples.
function tooltipDoItem(p, it, extra) {
  if (!p) return;
  evento(p, "onmouseover", function () {
    if (!abrirTooltipNativo(p, it)) {
      var t = nomeItem(it) + " (T" + it.tier + ")" + (extra ? "\n" + extra() : "");
      try { $.DispatchEvent("UIShowTextTooltip", p, t); } catch (e) {}
    }
    if (valido(editor.detalhe)) editor.detalhe.text = "<b>" + esc(nomeItem(it)) + "</b>" + (extra ? ": " + esc(extra()) : "");
  });
  evento(p, "onmouseout", function () {
    fecharTooltipNativo();
    try { $.DispatchEvent("UIHideTextTooltip", p); } catch (e) {}
  });
}

// ---------- compartilhar / importar ----------
function desenharCompartilhar(d) {
  var caixa = criar("Panel", d, "", "DUCompartilhar");
  rotulo(caixa, "DUCatalogoTitulo", T("ed.compartilhar"));
  var linha = criar("Panel", caixa, "", "DUEditorAcoes");
  if (editor.heroi) botao(linha, "", esc(T("ed.copiarDe", editor.heroi)), function () { compartilhar([editor.heroi]); });
  botao(linha, "", T("ed.copiarTudo"), function () {
    var lista = Object.keys(overrides.herois);
    if (!lista.length) { mensagemEditor(T("ed.nadaEditado")); return; }
    compartilhar(lista);
  });
  rotulo(caixa, "DUEditorEstado", T("ed.recebeu"));
  editor.campoCodigo = criar("TextEntry", caixa, "", "DUTexto DUCodigo", { maxchars: "6000" });
  if (editor.campoCodigo && editor.ultimoCodigo) { try { editor.campoCodigo.text = editor.ultimoCodigo; } catch (e) {} }
  var linha2 = criar("Panel", caixa, "", "DUEditorAcoes");
  botao(linha2, "DUBotaoPrimario", T("ed.importar"), function () {
    try {
      var novos = lerCodigo(textoDe(editor.campoCodigo));
      var nomes = Object.keys(novos);
      if (!nomes.length) throw new Error(T("ed.erro.vazio"));
      nomes.forEach(function (n) { overrides.herois[n] = novos[n]; });
      salvarOverrides();
      atualizarRecomendacoes(ultimaLeitura || lerPartida(), true);
      editor.rascunho = null;
      mensagemEditor(T("ed.importado", nomes.join(", ")));
      redesenharEditor();
    } catch (e) {
      mensagemEditor(T("ed.invalido", e.message));
    }
  });
  if (!editor.heroi) editor.msg = rotulo(caixa, "DUEditorMsg", esc(editor.ultimaMsg || ""));
}

function compartilhar(herois) {
  var codigo = codigoDeCounters(herois);
  var copiou = copiarTexto(codigo);
  editor.ultimoCodigo = codigo;
  if (valido(editor.campoCodigo)) { try { editor.campoCodigo.text = codigo; } catch (e) {} }
  mensagemEditor(T(copiou ? "ed.copiado" : "ed.copieCampo") + " " + T("ed.quemRecebe"));
  log("código compartilhado (" + herois.join(",") + "): " + codigo);
}

function mensagemEditor(t) {
  editor.ultimaMsg = t;
  if (valido(editor.msg)) editor.msg.text = esc(t);
  if (valido(editor.detalhe)) editor.detalhe.text = esc(t);
}

function redesenharEditor() {
  if (valido(editor.alvo)) abrirEditor(editor.alvo, editor.detalhe);
}
