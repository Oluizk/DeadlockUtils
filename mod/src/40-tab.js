// ===================== Tab: counters e próximos itens acima dos "investimentos" + avisos =====================
// Ao segurar Tab (placar), aparecem duas fileiras de cartas no formato da loja, logo acima dos três círculos
// de investimento (canto inferior esquerdo): os counters contra o time inimigo e os próximos itens do guia
// que você escolheu na aba Builds da loja (ou da Build Recomendada, se ela estiver ligada).
// As cartas ficam prontas antes do Tab; com ele segurado, o estado de cada uma (dá para comprar, sem almas,
// longe da loja) é relido a cada 100 ms do painel nativo do item, como a loja faz.
// Quando um inimigo compra um item perigoso, aparece um aviso no topo da tela.

var CARTAS_POR_FILEIRA = 5;
var faixa = { painel: null, falhou: false, cartas: [], estadosEm: 0 };
var aviso = { painel: null, fila: [], ate: 0, vistos: {} };
var agoraSeg = 0;

function montarFaixa() {
  if (faixa.falhou || valido(faixa.painel)) return;
  faixa.painel = painelComLayout(hud, "DU_Faixa", "faixa");
  if (!faixa.painel) { faixa.falhou = true; log("faixa do Tab desativada: layout não carregou"); return; }
  faixa.secCounters = achar(faixa.painel, "DUFaixaSecaoCounters");
  faixa.secBuild = achar(faixa.painel, "DUFaixaSecaoBuild");
  faixa.counters = achar(faixa.painel, "DUFaixaCounters");
  faixa.build = achar(faixa.painel, "DUFaixaBuild");
  faixa.tituloBuild = achar(faixa.painel, "DUFaixaTituloBuild");
  faixa.subBuild = achar(faixa.painel, "DUFaixaSubBuild");
  faixa.motivo = achar(faixa.painel, "DUFaixaMotivo");
  faixa.porque = achar(faixa.painel, "DUFaixaPorque");
  faixa.assinatura = "";
  mostrarPainel(faixa.painel, false);
}

// Item que já tenho some. Os outros aparecem sempre; ficam meio transparentes quando não dá para
// comprar agora: sem almas (canAffordMod do painel nativo, ou as almas do placar) ou longe da loja.
function temAlmas(it) {
  var pode = podeComprar(it.id);
  if (pode !== null) return pode;
  var almas = ultimaLeitura ? ultimaLeitura.almas : null;
  return almas == null || it.custo <= almas;
}
// O jogo marca a loja com shopClosed/purchasingDisabled quando você está fora da área de compra.
function longeDaLoja() {
  var s = valido(loja.shop) ? loja.shop : lojaDoJogo();
  if (!s) return false;
  if (temClasse(s, "shopClosed") || temClasse(s, "purchasingDisabled")) return true;
  try { return s.BAscendantHasClass("shopClosed") || s.BAscendantHasClass("purchasingDisabled"); } catch (e) { return false; }
}
function compravelAgora(it) { return !jaTem(it.id) && temAlmas(it) && !longeDaLoja(); }
// Comprado (ou pedido agora há pouco): sai da fileira.
function saiDaFaixa(id) { return jaTem(id) || compraPendente(id); }
function selecionar(lista, n, jaUsados) {
  var out = [];
  for (var i = 0; i < lista.length && out.length < n; i++) {
    var rec = lista[i];
    if (jaUsados[rec.item.id] || saiDaFaixa(rec.item.id)) continue;
    jaUsados[rec.item.id] = true;
    out.push(rec);
  }
  return out;
}
// Segunda fileira: a Build Recomendada (se ligada) ou os próximos itens do guia escolhido no jogo.
function proximosDoGuia() {
  return lerGuia().map(function (g) {
    var it = dados.itensPorId[g.id];
    return it ? { item: it, motivos: [{ tipo: "guia", texto: g.etapa ? T("faixa.etapaGuia", g.etapa) : T("faixa.doGuia") }] } : null;
  }).filter(Boolean);
}

// Estado da carta, como na loja: comprando (pedido agora), longe da loja, sem almas ou disponível.
// longe: longeDaLoja() já calculado (é o mesmo para todas as cartas de uma passada).
function estadoCarta(it, longe) {
  if (compraPendente(it.id)) return "DUComprando";
  if (longe === undefined ? longeDaLoja() : longe) return "DULonge";
  return temAlmas(it) ? "" : "DUSemAlmas";
}
var CLASSES_ESTADO_CARTA = ["DUComprando", "DULonge", "DUSemAlmas"];

// Carta no formato do CitadelShopMod (fundo do tier, ícone, nome, preço, "Ativo"), menor.
function cartaFaixa(alvo, rec, tipo) {
  var it = rec.item;
  var c = criar("Panel", alvo, "", "DUCartaTab DUCartaTab_" + it.categoria);
  try { c.style.backgroundImage = fundoCartao(it); c.style.backgroundSize = "100% 100%"; } catch (e) {}
  imagem(c, "DUCartaTabIcone", iconeItem(it));
  rotulo(c, "DUCartaTabNome", esc(nomeItem(it)));
  if (it.ativo) rotulo(c, "DUCartaTabAtivo", T("cartao.ativo"));
  var preco = criar("Panel", c, "", "DUCartaTabPreco");
  rotulo(preco, "DUCartaTabCusto", String(it.custo));
  if (tipo === "counter") {
    var alvos = alvosDoCounter(rec);
    if (alvos.length) imagem(c, "DUCartaTabHeroi", imagemHeroi(alvos[0]));
  }
  evento(c, "onmouseover", function () { mostrarDica(rec, tipo, c); });
  evento(c, "onmouseout", esconderDica);
  aoClicar(c, function () {
    // Sem almas ou longe da loja: nem pede (o jogo recusaria); só diz o motivo.
    if (!compravelAgora(it)) {
      var motivo = longeDaLoja() ? T("longeDaLoja") : T("compra.semAlmas");
      if (dicaItem.item === it.id) mostrarDica(rec, tipo, c, motivo);
      else mostrarPorque("<font color='#ffa1a1'>" + esc(motivo) + "</font>");
      return;
    }
    comprarItem(it.id, function (ok, msg) {
      if (ok) { esconderDica(); atualizarFaixa(true); return; } // comprado: sai da fileira na hora
      if (dicaItem.item === it.id) mostrarDica(rec, tipo, c, msg);
      else mostrarPorque("<font color='#ffa1a1'>" + esc(msg) + "</font>");
    });
    atualizarEstadosFaixa(true);
  });
  faixa.cartas.push({ painel: c, item: it, estado: null });
  return c;
}

function desenharLinha(alvo, recs, tipo) {
  alvo.RemoveAndDeleteChildren();
  recs.forEach(function (rec) { cartaFaixa(alvo, rec, tipo); });
}

// Com o Tab segurado (loop rápido): estado de cada carta na hora; um item comprado refaz a fileira.
function atualizarEstadosFaixa(forcar) {
  if (!forcar && Date.now() - faixa.estadosEm < 100) return;
  faixa.estadosEm = Date.now();
  var refazer = false, longe = longeDaLoja();
  faixa.cartas.forEach(function (x) {
    if (!valido(x.painel)) return;
    if (jaTem(x.item.id)) { refazer = true; return; }
    var e = estadoCarta(x.item, longe);
    if (e === x.estado) return;
    x.estado = e;
    CLASSES_ESTADO_CARTA.forEach(function (k) { x.painel.SetHasClass(k, k === e); });
  });
  if (refazer) atualizarFaixa(true);
}

// Motivo de não comprar, escrito na faixa (quando o tooltip do mod não está aberto nessa carta).
function mostrarPorque(html) {
  if (!valido(faixa.porque)) return;
  faixa.porque.text = html;
  mostrarPainel(faixa.porque, true);
}

// Duas fileiras (Counters e Guia/Build). Só refaz as cartas se os itens mudaram: o Tab aparece na hora
// porque as cartas já estão prontas; o loop rápido só troca a visibilidade e o estado delas.
function atualizarFaixa(forcar) {
  montarFaixa();
  if (!valido(faixa.painel) || !ultimoResultado) return;
  var usados = {};
  var counters = selecionar(ultimoResultado.counters, CARTAS_POR_FILEIRA, usados);
  var doGuia = !ajustes.buildRecomendada;
  var build = selecionar(doGuia ? proximosDoGuia() : ultimoResultado.build, CARTAS_POR_FILEIRA, usados);
  var ids = function (lista) { return lista.map(function (x) { return x.item.id; }).join(","); };
  var assinatura = ids(counters) + "|" + ids(build) + "|" + doGuia + "|" + IDIOMA;
  if (!forcar && assinatura === faixa.assinatura) return;
  faixa.assinatura = assinatura;
  faixa.cartas = [];
  desenharLinha(faixa.counters, counters, "counter");
  desenharLinha(faixa.build, build, doGuia ? "guia" : "build");
  if (valido(faixa.tituloBuild)) faixa.tituloBuild.text = esc(T(doGuia ? "faixa.guia" : "faixa.buildRecomendada"));
  if (valido(faixa.subBuild)) faixa.subBuild.text = doGuia && !build.length ? esc(T("faixa.semGuia")) : "";
  mostrarPainel(faixa.secCounters, counters.length > 0);
  mostrarPainel(faixa.secBuild, build.length > 0 || doGuia);
  atualizarEstadosFaixa(true);
}
aoMudarResultado(function (r) { varrerNativos(false); atualizarFaixa(false); checarNovasAmeacas(r); });

// ---------- tooltip do mod: mesma estrutura, texturas e medidas do tooltip de item do jogo ----------
// O tooltip de item do jogo (CitadelShowModTooltip) só é tratado dentro das listas da loja (client.dll:
// CCitadel_ShopModsTier::EventShowModTooltip): em painéis do mod ele não abre.
var dicaItem = { painel: null, item: "" };
function montarDica() {
  if (valido(dicaItem.painel)) return true;
  dicaItem.painel = painelComLayout(hud, "DU_Dica", "dica");
  if (!dicaItem.painel) return false;
  ["DUDicaFundo", "DUDicaIcone", "DUDicaNome", "DUDicaCustoLinha", "DUDicaCusto", "DUDicaStatus", "DUDicaContra", "DUDicaHeroi",
    "DUDicaContraTexto", "DUDicaMotivos", "DUDicaRodape"]
    .forEach(function (id) { dicaItem[id] = achar(dicaItem.painel, id); });
  mostrarPainel(dicaItem.painel, false);
  return true;
}
function mostrarDica(rec, tipo, ancora, statusExtra) {
  if (!montarDica()) return;
  var it = rec.item;
  dicaItem.item = it.id;
  ["weapon", "vitality", "spirit"].forEach(function (c) { dicaItem.painel.SetHasClass("DUDica_" + c, it.categoria === c); });
  // o mesmo painel serve ao tooltip do mapa: desfaz o que ele muda
  dicaItem.painel.RemoveClass("DUDica_mapa");
  mostrarPainel(dicaItem.DUDicaIcone, true);
  mostrarPainel(dicaItem.DUDicaCustoLinha, true);
  mostrarPainel(dicaItem.DUDicaMotivos, true);
  dicaItem.DUDicaRodape.text = T("dica.comprar");
  mostrarPainel(dicaItem.DUDicaRodape, true);
  try { dicaItem.DUDicaIcone.SetImage(iconeItem(it)); } catch (e) {}
  dicaItem.DUDicaNome.text = nomeItem(it);
  var pode = podeComprar(it.id);
  dicaItem.DUDicaCusto.text = String(it.custo);
  dicaItem.painel.SetHasClass("DUSemAlmas", pode === false);
  var estado = statusExtra ? esc(statusExtra) : jaTem(it.id) ? T("comprado") : longeDaLoja() ? T("longeDaLoja") : "";
  dicaItem.DUDicaStatus.text = estado;
  mostrarPainel(dicaItem.DUDicaStatus, !!estado);
  var alvos = tipo === "counter" ? alvosDoCounter(rec) : [];
  mostrarPainel(dicaItem.DUDicaContra, alvos.length > 0);
  if (alvos.length) {
    try { dicaItem.DUDicaHeroi.SetImage(imagemHeroi(alvos[0])); } catch (e) {}
    dicaItem.DUDicaContraTexto.text = T("dica.counterDe", "<b>" + esc(alvos.join(", ")) + "</b>");
  }
  dicaItem.DUDicaMotivos.text = rec.motivos.slice(0, 4).map(function (m) {
    return "<span class='" + (m.tipo === "build" ? "highlight_spirit" : "highlight_weapon") + "'>•</span> " + esc(m.texto);
  }).join("<br>");
  // Posição: ao lado do ícone (se o jogo informar a posição), senão à direita da fileira.
  try {
    var pos = ancora.GetPositionWithinWindow();
    var escala = ancora.actualuiscale_x || 1;
    dicaItem.painel.style.position = Math.round(pos.x / escala + 70) + "px " + Math.max(10, Math.round(pos.y / escala - 120)) + "px 0px";
  } catch (e) {}
  mostrarPainel(dicaItem.painel, true);
}
// Tooltip com os detalhes do item (descrição e atributos do jogo, data/itens-detalhes.json), para o
// editor de counters: o tooltip nativo não abre em painéis criados pelo mod.
function detalhesDoItem(it) {
  var d = DU_DATA.detalhesItens || {};
  return (d[IDIOMA] || {})[it.id] || (d.en || {})[it.id] || [];
}
function htmlDetalhes(it) {
  var cor = { weapon: "#EC9719", vitality: "#8EDA3B", spirit: "#CE90FF" }[it.categoria] || "#FFEFD7";
  return detalhesDoItem(it).map(function (s) {
    var cab = s.tipo === "active" ? "<font color='#FFEFD7'><b>" + esc(T("dica.ativo").toUpperCase()) + "</b></font><br>" :
      s.tipo === "passive" ? "<font color='#FFEFD7'><b>" + esc(T("dica.passivo").toUpperCase()) + "</b></font><br>" : "";
    var stats = (s.st || []).map(function (p) { return "<font color='" + cor + "'><b>" + esc(p[0]) + "</b></font> " + esc(p[1]); }).join("<br>");
    return cab + (s.txt ? s.txt + (stats ? "<br>" : "") : "") + stats;
  }).join("<br><br>");
}
// status: texto no lugar do tier (aba da loja: já tem, sem almas, longe da loja).
function mostrarDicaDetalhe(it, ancora, rodape, status) {
  if (!montarDica()) return;
  dicaItem.item = it.id;
  ["weapon", "vitality", "spirit"].forEach(function (c) { dicaItem.painel.SetHasClass("DUDica_" + c, it.categoria === c); });
  dicaItem.painel.RemoveClass("DUDica_mapa");
  dicaItem.painel.SetHasClass("DUSemAlmas", !!status && podeComprar(it.id) === false);
  mostrarPainel(dicaItem.DUDicaIcone, true);
  mostrarPainel(dicaItem.DUDicaCustoLinha, true);
  try { dicaItem.DUDicaIcone.SetImage(iconeItem(it)); } catch (e) {}
  dicaItem.DUDicaNome.text = nomeItem(it);
  dicaItem.DUDicaCusto.text = String(it.custo);
  dicaItem.DUDicaStatus.text = esc(status || T("ed.tier", it.tier));
  mostrarPainel(dicaItem.DUDicaStatus, true);
  mostrarPainel(dicaItem.DUDicaContra, false);
  var html = htmlDetalhes(it);
  dicaItem.DUDicaMotivos.text = html;
  mostrarPainel(dicaItem.DUDicaMotivos, !!html);
  dicaItem.DUDicaRodape.text = rodape || "";
  mostrarPainel(dicaItem.DUDicaRodape, !!rodape);
  // Ao lado do item; se não couber à direita (itens na borda da tela), à esquerda.
  try {
    var pos = ancora.GetPositionWithinWindow();
    var escala = ancora.actualuiscale_x || 1;
    var largura = (hud.actuallayoutwidth || 1920 * escala) / escala;
    var x = pos.x / escala + (ancora.actuallayoutwidth || 64 * escala) / escala + 8;
    if (x + 460 > largura) x = pos.x / escala - 460;
    dicaItem.painel.style.position = Math.round(Math.max(0, x)) + "px " + Math.max(10, Math.round(pos.y / escala - 140)) + "px 0px";
  } catch (e) {}
  mostrarPainel(dicaItem.painel, true);
}
function esconderDica() {
  if (valido(faixa.porque)) mostrarPainel(faixa.porque, false);
  dicaItem.item = "";
  if (valido(dicaItem.painel)) mostrarPainel(dicaItem.painel, false);
}

function atualizarVisibilidadeFaixa(leitura) {
  if (!valido(faixa.painel)) return;
  // Só com o Tab e na partida ativa: nunca junto com loja, mapa, tracker, central ou menu ESC.
  var visivel = ajustes.faixaTab && leitura.ativa && leitura.placarAberto && !leitura.lojaAberta && !leitura.escAberto &&
    !algumModuloAberto() && !tracker.aberto && !central.aberto;
  if (visivel !== faixa.visivel) {
    faixa.visivel = visivel;
    mostrarPainel(faixa.painel, visivel);
    if (visivel) atualizarFaixa(false); else esconderDica();
  } else if (visivel) atualizarEstadosFaixa(false);
}

// ---------- aviso de item perigoso ----------
function montarAviso() {
  if (valido(aviso.painel)) return;
  aviso.painel = painelComLayout(hud, "DU_Aviso", "aviso");
  if (!aviso.painel) return;
  aviso.titulo = achar(aviso.painel, "DUAvisoTitulo");
  aviso.texto = achar(aviso.painel, "DUAvisoTexto");
  aviso.heroi = achar(aviso.painel, "DUAvisoHeroi");
  aviso.item = achar(aviso.painel, "DUAvisoItem");
  mostrarPainel(aviso.painel, false);
}
// Retrato do inimigo e ícone do item (vazio = esconde).
function imagensAviso(heroi, it) {
  [[aviso.heroi, heroi ? imagemHeroi(heroi) : ""], [aviso.item, it ? iconeItem(it) : ""]].forEach(function (x) {
    mostrarPainel(x[0], !!x[1]);
    if (x[1]) { try { x[0].SetImage(x[1]); } catch (e) {} }
  });
  if (valido(aviso.item) && it) ["weapon", "vitality", "spirit"].forEach(function (c) { aviso.item.SetHasClass("DUAvisoItem_" + c, it.categoria === c); });
}

function checarNovasAmeacas(r) {
  r.alertas.forEach(function (a) {
    var chave = a.heroi + "|" + a.itemId;
    if (aviso.vistos[chave]) return;
    aviso.vistos[chave] = true;
    if (a.perigo >= 2 && ajustes.avisoPerigo) aviso.fila.push(a);
    log("item perigoso: " + a.nomeItem + " (" + a.heroi + ")");
  });
}

// Aviso com texto livre (liga/desliga, avisos de compatibilidade). "agora" ignora a fila; padrão 3 s na tela.
function mostrarAvisoTexto(titulo, texto, agora, segundos) {
  montarAviso();
  if (!valido(aviso.painel)) return;
  if (agora) aviso.fila = [];
  aviso.painel.SetHasClass("DUPerigo3", false);
  aviso.painel.AddClass("DUAvisoSoTexto");
  imagensAviso("", null);
  aviso.titulo.text = titulo;
  aviso.texto.text = esc(texto);
  mostrarPainel(aviso.painel, true);
  aviso.ate = agoraSeg + (segundos || 3);
}

// Os avisos de item perigoso só saem com a partida ativa. Fora dela a fila é descartada: um item comprado
// no fim de uma partida não pode aparecer no começo da outra.
function tickAviso(l) {
  montarAviso();
  if (!valido(aviso.painel) || agoraSeg < aviso.ate) return;
  if (!l.ativa) { aviso.fila = []; mostrarPainel(aviso.painel, false); return; }
  var a = aviso.fila.shift();
  if (!a) { mostrarPainel(aviso.painel, false); return; }
  aviso.painel.SetHasClass("DUPerigo3", a.perigo >= 3);
  aviso.painel.RemoveClass("DUAvisoSoTexto");
  imagensAviso(a.heroi, dados.itensPorId[a.itemId]);
  aviso.titulo.text = T("aviso.comprou", esc(a.heroi), "<b>" + esc(a.nomeItem) + "</b>");
  aviso.texto.text = esc(a.alerta);
  mostrarPainel(aviso.painel, true);
  aviso.ate = agoraSeg + (ajustes.avisoSeg || CONFIG.segundosAviso || 7);
  if (ajustes.avisoSom) som("UI.Quickbuy.DragDrop");
}
