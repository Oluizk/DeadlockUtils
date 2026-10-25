// ===================== Tab: itens recomendados acima dos "investimentos" + avisos =====================
// Ao segurar Tab (placar), aparece uma fileira com os itens mais recomendados agora (build do seu
// herói + counters), logo acima dos três círculos de investimento (canto inferior esquerdo).
// Quando um inimigo compra um item perigoso, aparece um aviso no topo da tela.

var faixa = { painel: null, falhou: false };
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
  faixa.motivo = achar(faixa.painel, "DUFaixaMotivo");
  faixa.porque = achar(faixa.painel, "DUFaixaPorque");
  faixa.assinatura = "";
  mostrarPainel(faixa.painel, false);
}

// Só o que faz sentido comprar AGORA: não tenho e posso pagar.
// Pagar: o painel nativo da loja diz (canAffordMod); sem ele, usa as almas lidas do placar.
function compravelAgora(it) {
  if (jaTem(it.id)) return false;
  var pode = podeComprar(it.id);
  if (pode !== null) return pode;
  var almas = ultimaLeitura ? ultimaLeitura.almas : null;
  return almas == null || it.custo <= almas;
}
function selecionar(lista, n, jaUsados) {
  var out = [];
  for (var i = 0; i < lista.length && out.length < n; i++) {
    var rec = lista[i];
    if (jaUsados[rec.item.id] || !compravelAgora(rec.item)) continue;
    jaUsados[rec.item.id] = true;
    out.push(rec);
  }
  return out;
}

function desenharLinha(alvo, recs, tipo) {
  alvo.RemoveAndDeleteChildren();
  recs.forEach(function (rec) {
    var it = rec.item;
    var c = criar("Panel", alvo, "", "DUIcone DUIcone_" + it.categoria);
    imagem(c, "DUIconeImagem", iconeItem(it));
    if (tipo === "counter") {
      var alvos = alvosDoCounter(rec);
      if (alvos.length) imagem(c, "DUIconeHeroi", imagemHeroi(alvos[0]));
    }
    evento(c, "onmouseover", function () { mostrarDicaFaixa(rec, tipo, c); });
    evento(c, "onmouseout", esconderDica);
    aoClicar(c, function () {
      c.AddClass("DUComprando");
      comprarItem(it.id, function (ok, msg) {
        c.RemoveClass("DUComprando");
        if (ok) { esconderDica(); atualizarFaixa(true); }
        else if (dicaItem.item === it.id) mostrarDica(rec, tipo, c, msg);
        else if (tooltipNativo.ancora === c) mostrarPorque("<font color='#ffa1a1'>" + esc(msg) + "</font>");
      });
    });
  });
}

// Tab: abre o tooltip DO JOGO (o mesmo da loja) e escreve na faixa por que o item foi recomendado.
// Se o tooltip do jogo não aparecer na primeira vez, passa a usar o tooltip do mod.
function mostrarDicaFaixa(rec, tipo, c) {
  if (!abrirTooltipNativo(c, rec.item)) { mostrarDica(rec, tipo, c); return; }
  var alvos = tipo === "counter" ? alvosDoCounter(rec) : [];
  mostrarPorque((alvos.length ? "<font color='#ec9719'>Counter de <b>" + esc(alvos.join(", ")) + "</b></font> · " :
    tipo === "build" ? "<font color='#99ffd6'>Build</font> · " : "") +
    rec.motivos.slice(0, 2).map(function (m) { return esc(m.texto); }).join(" · "));
  if (tooltipNativo.funciona !== null) return;
  $.Schedule(0.25, function () {
    if (tooltipNativo.funciona !== null || tooltipNativo.ancora !== c) return;
    tooltipNativo.funciona = tooltipNativoVisivel();
    log("tooltip nativo do jogo: " + (tooltipNativo.funciona ? "funciona" : "não apareceu, usando o tooltip do mod"));
    if (!tooltipNativo.funciona) { fecharTooltipNativo(); mostrarPainel(faixa.porque, false); mostrarDica(rec, tipo, c); }
  });
}
function mostrarPorque(html) {
  if (!valido(faixa.porque)) return;
  faixa.porque.text = html;
  mostrarPainel(faixa.porque, true);
}

// Duas seções (Counters e Recomendados). Só redesenha se a lista mudou — o Tab aparece na hora
// porque os ícones já estão prontos; o loop rápido só troca a visibilidade.
function atualizarFaixa(forcar) {
  montarFaixa();
  if (!valido(faixa.painel) || !ultimoResultado) return;
  var n = CONFIG.itensPorSecao || 4, usados = {};
  var counters = selecionar(ultimoResultado.counters, n, usados);
  var build = selecionar(ultimoResultado.build, n, usados);
  var assinatura = counters.map(function (x) { return x.item.id; }).join(",") + "|" + build.map(function (x) { return x.item.id; }).join(",");
  if (!forcar && assinatura === faixa.assinatura) return;
  faixa.assinatura = assinatura;
  desenharLinha(faixa.counters, counters, "counter");
  desenharLinha(faixa.build, build, "build");
  mostrarPainel(faixa.secCounters, counters.length > 0);
  mostrarPainel(faixa.secBuild, build.length > 0);
}
aoMudarResultado(function (r) { varrerNativos(false); atualizarFaixa(false); checarNovasAmeacas(r); });

// ---------- tooltip nativo do jogo ----------
// CitadelShowModTooltip(painel, id) — "Show the tooltip of an Ability by ID" (client.dll). O id é o hash
// do nome da classe do item (DU_DATA.idsJogo, gerado no build; confere com o deadlock-api).
var tooltipNativo = { funciona: null, ancora: null };
function abrirTooltipNativo(ancora, it) {
  var id = (DU_DATA.idsJogo || {})[it.id];
  if (!id || tooltipNativo.funciona === false) return false;
  try { $.DispatchEvent("CitadelShowModTooltip", ancora, id); } catch (e) { tooltipNativo.funciona = false; log("CitadelShowModTooltip: " + e); return false; }
  tooltipNativo.ancora = ancora;
  return true;
}
function fecharTooltipNativo() {
  if (!tooltipNativo.ancora) return;
  try { $.DispatchEvent("CitadelHideModTooltip", tooltipNativo.ancora); } catch (e) {}
  tooltipNativo.ancora = null;
}
// O tooltip do jogo é um CitadelTooltipModDetails que ganha a classe TooltipVisible (tooltip_mod_details.css).
function tooltipNativoVisivel() {
  var raiz = hud;
  try { while (raiz.GetParent()) raiz = raiz.GetParent(); } catch (e) {}
  return porClasse(raiz, "TooltipVisible").some(function (p) {
    try { return p.paneltype === "CitadelTooltipModDetails" || temClasse(p, "ModTooltip"); } catch (e) { return false; }
  });
}

// ---------- tooltip do mod: mesma estrutura, texturas e medidas do tooltip de item do jogo ----------
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
  dicaItem.DUDicaRodape.text = "Clique para comprar (perto da loja)";
  try { dicaItem.DUDicaIcone.SetImage(iconeItem(it)); } catch (e) {}
  dicaItem.DUDicaNome.text = nomeItem(it);
  var pode = podeComprar(it.id);
  dicaItem.DUDicaCusto.text = String(it.custo);
  dicaItem.painel.SetHasClass("DUSemAlmas", pode === false);
  dicaItem.DUDicaStatus.text = statusExtra ? esc(statusExtra) : jaTem(it.id) ? "Comprado" : "";
  mostrarPainel(dicaItem.DUDicaStatus, !!(statusExtra || jaTem(it.id)));
  var alvos = tipo === "counter" ? alvosDoCounter(rec) : [];
  mostrarPainel(dicaItem.DUDicaContra, alvos.length > 0);
  if (alvos.length) {
    try { dicaItem.DUDicaHeroi.SetImage(imagemHeroi(alvos[0])); } catch (e) {}
    dicaItem.DUDicaContraTexto.text = "Counter de <b>" + esc(alvos.join(", ")) + "</b>";
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
function esconderDica() {
  fecharTooltipNativo();
  if (valido(faixa.porque)) mostrarPainel(faixa.porque, false);
  dicaItem.item = "";
  if (valido(dicaItem.painel)) mostrarPainel(dicaItem.painel, false);
}

function atualizarVisibilidadeFaixa(leitura) {
  if (!valido(faixa.painel)) return;
  // Só com o Tab: nunca junto com loja, mapa, tracker ou menu ESC.
  var visivel = leitura.placarAberto && !leitura.lojaAberta && !leitura.escAberto && !mapa.aberto && !tracker.aberto;
  if (visivel !== faixa.visivel) {
    faixa.visivel = visivel;
    mostrarPainel(faixa.painel, visivel);
    if (visivel) atualizarFaixa(false); else esconderDica();
  }
}

// ---------- aviso de item perigoso ----------
function montarAviso() {
  if (valido(aviso.painel)) return;
  aviso.painel = painelComLayout(hud, "DU_Aviso", "aviso");
  if (!aviso.painel) return;
  aviso.titulo = achar(aviso.painel, "DUAvisoTitulo");
  aviso.texto = achar(aviso.painel, "DUAvisoTexto");
  mostrarPainel(aviso.painel, false);
}

function checarNovasAmeacas(r) {
  r.alertas.forEach(function (a) {
    var chave = a.heroi + "|" + a.itemId;
    if (aviso.vistos[chave]) return;
    aviso.vistos[chave] = true;
    if (a.perigo >= 2) aviso.fila.push(a);
    log("item perigoso: " + a.nomeItem + " (" + a.heroi + ")");
  });
}

// Aviso com texto livre (usado pelo liga/desliga). "agora" ignora a fila.
function mostrarAvisoTexto(titulo, texto, agora) {
  montarAviso();
  if (!valido(aviso.painel)) return;
  if (agora) aviso.fila = [];
  aviso.painel.SetHasClass("DUPerigo3", false);
  aviso.titulo.text = titulo;
  aviso.texto.text = esc(texto);
  mostrarPainel(aviso.painel, true);
  aviso.ate = agoraSeg + 3;
}

function tickAviso() {
  montarAviso();
  if (!valido(aviso.painel) || agoraSeg < aviso.ate) return;
  var a = aviso.fila.shift();
  if (!a) { mostrarPainel(aviso.painel, false); return; }
  aviso.painel.SetHasClass("DUPerigo3", a.perigo >= 3);
  aviso.titulo.text = esc(a.heroi) + " comprou <b>" + esc(a.nomeItem) + "</b>";
  aviso.texto.text = esc(a.alerta);
  mostrarPainel(aviso.painel, true);
  aviso.ate = agoraSeg + (CONFIG.segundosAviso || 7);
  som("UI.Quickbuy.DragDrop");
}
