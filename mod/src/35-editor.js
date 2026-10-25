// ===================== Editor de counters (dentro da aba da loja) =====================
// Escolhe um herói, edita os itens que counteram ele (peso 1 a 4 + motivo), salva, compartilha por
// código curto (DU1:...) ou importa um código colado. O salvamento usa o armazenamento da ponte
// (navegador embutido); se não houver, as mudanças valem até fechar o jogo.

var editor = { heroi: "", rascunho: null, alvo: null, detalhe: null, escolhendoItem: false };
var CATEGORIAS = [["weapon", "Arma"], ["vitality", "Vitalidade"], ["spirit", "Spirit"]];

function abrirEditor(alvo, detalhe) {
  editor.alvo = alvo;
  editor.detalhe = detalhe;
  alvo.RemoveAndDeleteChildren();
  var corpo = criar("Panel", alvo, "", "DUEditor");

  var esquerda = criar("Panel", corpo, "", "DUEditorHerois");
  rotulo(esquerda, "DUAbaSecao", "Herói inimigo");
  var grade = criar("Panel", esquerda, "", "DUGradeHerois");
  Object.keys(dados.herois).sort().forEach(function (nome) {
    var b = criar("Panel", grade, "", "DUHeroiBotao" + (nome === editor.heroi ? " DUSelecionado" : ""));
    imagem(b, "DUHeroiFoto", imagemHeroi(nome));
    rotulo(b, "DUHeroiNome", esc(nome));
    if (overrides.herois[nome]) rotulo(b, "DUHeroiEditado", "editado");
    aoClicar(b, function () { editor.heroi = nome; editor.rascunho = null; editor.escolhendoItem = false; abrirEditor(alvo, detalhe); });
  });

  var direita = criar("Panel", corpo, "", "DUEditorDireita");
  editor.direita = direita;
  if (!editor.heroi) {
    rotulo(direita, "DUAbaVazio", "Escolha um herói à esquerda para ver e editar os counters dele.");
  } else {
    desenharHeroiEditor();
  }
  desenharCompartilhar(direita);
}

function desenharHeroiEditor() {
  var d = editor.direita;
  var h = editor.heroi;
  if (!editor.rascunho) editor.rascunho = countersDoHeroi(h).map(function (c) { return { item: c.item, peso: c.peso, motivo: c.motivo || "" }; });

  var cab = criar("Panel", d, "", "DUEditorCab");
  imagem(cab, "DUEditorFoto", imagemHeroi(h));
  var tt = criar("Panel", cab, "", "DUEditorCabTextos");
  rotulo(tt, "DUAbaSecao", "Counters contra " + esc(h));
  rotulo(tt, "DUAbaVazio", (overrides.herois[h] ? "Editado por você." : "Padrão da comunidade.") +
    " Peso: 1 situacional · 4 quase obrigatório. Clique no texto para escrever o motivo.");

  var lista = criar("Panel", d, "", "DUEditorLista");
  if (!editor.rascunho.length) rotulo(lista, "DUAbaVazio", "Nenhum counter ainda. Adicione itens abaixo.");
  editor.rascunho.forEach(function (c, idx) {
    var it = dados.itensPorId[c.item];
    if (!it) return;
    var linha = criar("Panel", lista, "", "DUEditorLinha DUCat_" + it.categoria);
    imagem(linha, "DUEditorIcone", iconeItem(it));
    rotulo(linha, "DUEditorItemNome", esc(nomeItem(it)));
    var pesos = criar("Panel", linha, "", "DUPesos");
    [1, 2, 3, 4].forEach(function (p) {
      var b = botao(pesos, "DUPeso" + (c.peso === p ? " DUSelecionado" : ""), String(p), function () { c.peso = p; redesenharEditor(); });
      dica(b, ["", "Situacional", "Bom", "Forte", "Quase obrigatório"][p]);
    });
    // Sem placeholder: no Panorama ele é desenhado por cima do texto definido via código.
    var motivo = criar("TextEntry", linha, "", "DUTexto DUMotivo", { maxchars: "200" });
    if (motivo) {
      try { motivo.text = c.motivo; } catch (e) {}
      evento(motivo, "ontextentrychange", function () { c.motivo = textoDe(motivo); });
    }
    botao(linha, "DURemover", "×", function () { editor.rascunho.splice(idx, 1); redesenharEditor(); });
  });

  var acoes = criar("Panel", d, "", "DUEditorAcoes");
  botao(acoes, "", editor.escolhendoItem ? "Fechar lista de itens" : "+ Adicionar item", function () { editor.escolhendoItem = !editor.escolhendoItem; redesenharEditor(); });
  botao(acoes, "DUBotaoPrimario", "Salvar", function () {
    overrides.herois[h] = editor.rascunho.filter(function (c) { return dados.itensPorId[c.item]; });
    salvarOverrides();
    atualizarRecomendacoes(ultimaLeitura || lerPartida(), true);
    mensagemEditor("Counters de " + h + " salvos.");
    redesenharEditor();
  });
  botao(acoes, "", "Restaurar padrão", function () {
    delete overrides.herois[h];
    editor.rascunho = null;
    salvarOverrides();
    atualizarRecomendacoes(ultimaLeitura || lerPartida(), true);
    mensagemEditor("Counters de " + h + " voltaram ao padrão da comunidade.");
    redesenharEditor();
  });

  if (editor.escolhendoItem) desenharEscolhaItem(d);
}

function desenharEscolhaItem(d) {
  var caixa = criar("Panel", d, "", "DUEscolhaItem");
  CATEGORIAS.forEach(function (cat) {
    rotulo(caixa, "DUEscolhaTitulo DUCat_" + cat[0], cat[1]);
    var grade = criar("Panel", caixa, "", "DUEscolhaGrade");
    dados.itens.filter(function (it) { return it.categoria === cat[0]; })
      .sort(function (a, b) { return a.tier - b.tier || nomeItem(a).localeCompare(nomeItem(b)); })
      .forEach(function (it) {
        var ja = editor.rascunho.some(function (c) { return c.item === it.id; });
        var b = criar("Panel", grade, "", "DUEscolhaBotao" + (ja ? " DUSelecionado" : ""));
        imagem(b, "DUEscolhaIcone", iconeItem(it));
        dica(b, nomeItem(it) + " (T" + it.tier + ")");
        aoClicar(b, function () {
          if (ja) return;
          editor.rascunho.push({ item: it.id, peso: 2, motivo: "" });
          redesenharEditor();
        });
      });
  });
}

function desenharCompartilhar(d) {
  var caixa = criar("Panel", d, "", "DUCompartilhar");
  rotulo(caixa, "DUAbaSecao", "Compartilhar / importar");
  var linha = criar("Panel", caixa, "", "DUEditorAcoes");
  if (editor.heroi) botao(linha, "", "Copiar código de " + esc(editor.heroi), function () { compartilhar([editor.heroi]); });
  botao(linha, "", "Copiar código de tudo que editei", function () {
    var lista = Object.keys(overrides.herois);
    if (!lista.length) { mensagemEditor("Você ainda não editou nenhum herói."); return; }
    compartilhar(lista);
  });
  rotulo(caixa, "DUAbaVazio", "Recebeu um código DU1:…? Cole abaixo (Ctrl+V) e clique em Importar.");
  editor.campoCodigo = criar("TextEntry", caixa, "", "DUTexto DUCodigo", { maxchars: "6000" });
  if (editor.campoCodigo && editor.ultimoCodigo) { try { editor.campoCodigo.text = editor.ultimoCodigo; } catch (e) {} }
  var linha2 = criar("Panel", caixa, "", "DUEditorAcoes");
  botao(linha2, "DUBotaoPrimario", "Importar", function () {
    try {
      var novos = lerCodigo(textoDe(editor.campoCodigo));
      var nomes = Object.keys(novos);
      if (!nomes.length) throw new Error("nenhum herói no código");
      nomes.forEach(function (n) { overrides.herois[n] = novos[n]; });
      salvarOverrides();
      atualizarRecomendacoes(ultimaLeitura || lerPartida(), true);
      editor.rascunho = null;
      mensagemEditor("Importado: " + nomes.join(", ") + ".");
      redesenharEditor();
    } catch (e) {
      mensagemEditor("Código inválido: " + e.message);
    }
  });
  editor.msg = rotulo(caixa, "DUEditorMsg", esc(editor.ultimaMsg || ""));
}

function compartilhar(herois) {
  var codigo = codigoDeCounters(herois);
  var copiou = copiarTexto(codigo);
  editor.ultimoCodigo = codigo;
  if (valido(editor.campoCodigo)) { try { editor.campoCodigo.text = codigo; } catch (e) {} }
  mensagemEditor((copiou ? "Código copiado! Cole no grupo (Ctrl+V). " : "Copie o código do campo acima. ") +
    "Quem receber clica em Importar.");
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
