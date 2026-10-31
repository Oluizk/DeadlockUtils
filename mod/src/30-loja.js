// ===================== Aba "Deadlock Utils" na loja (B) =====================
// Botão a mais na barra lateral de abas (#ShopNavigation) + painel por cima da lista de itens
// (#ShopModListsContainer). A loja marca a aba ativa com uma classe na raiz (showingWeapon…).
// Ao abrir a nossa, tiramos essa classe. Se o jogador clicar numa OUTRA aba, o jogo recoloca a
// classe e fechamos a nossa. Se clicar na MESMA aba de antes, o jogo não muda nada, por isso
// pomos uma "captura" invisível sobre ela, que fecha a nossa e devolve a classe.
// A vista de filtros (showingFilters, ex.: filtrar por cura) não tem botão na barra: sem captura; escolher
// um filtro de novo recoloca a classe e fecha a nossa.
// Fechar a loja com a nossa aba aberta não fecha a aba: ela fica aberta por baixo e reaparece junto com a
// loja, sem a troca visível. Ao abrir, o jogo recoloca a classe da última aba dele; nos primeiros instantes
// isso é o jogo (não o jogador) e a classe sai de novo.

var ABAS_JOGO = {
  showingFavorites: "FavoritesNav", showingRecommendations: "RecommendedNav", showingAllItems: "FilteredNav",
  showingWeapon: "WeaponNav", showingTech: "TechNav", showingArmor: "ArmorNav", showingFilters: "",
};
var GRACA_ABRIR_LOJA = 400; // ms depois de abrir a loja em que a classe que aparece é do jogo restaurando a aba dele
var loja = { ativa: false, classeAnterior: "", falhou: false, vista: "recs", abriuEm: 0, cartas: [], estadosEm: 0 };

function montarAbaLoja() {
  if (loja.falhou) return false;
  if (valido(loja.botao) && valido(loja.conteudo)) return true;
  var shop = lojaDoJogo();
  var nav = achar(shop, "ShopNavigation");
  var listas = achar(shop, "ShopModListsContainer");
  if (!valido(nav) || !valido(listas)) return false;
  loja.shop = shop;

  var b = painelComLayout(nav, "DUNav", "botao");
  var c = painelComLayout(listas, "DUAbaLoja", "loja");
  if (!b || !c) {
    loja.falhou = true;
    if (valido(b)) b.DeleteAsync(0);
    if (valido(c)) c.DeleteAsync(0);
    log("aba da loja desativada: layout não carregou");
    return false;
  }
  mostrarPainel(c, false);
  mostrarPainel(b, modLigado && ajustes.abaLoja);
  evento(b, "onmouseactivate", function () { ativarAba(!loja.ativa); });
  dica(b, T("dica.botaoNav"));

  loja.botao = b;
  loja.conteudo = c;
  loja.status = achar(c, "DUStatusLoja");
  loja.heroi = achar(c, "DUAbaHeroi");
  loja.secBuild = achar(c, "DUSecaoBuild");
  loja.build = achar(c, "DUBuild");
  loja.counters = achar(c, "DUCounters");
  loja.detalhe = achar(c, "DUDetalhe");
  loja.vistaRecs = achar(c, "DUVistaRecs");
  loja.vistaEditor = achar(c, "DUVistaEditor");
  // Cartazes (componente em 15-cartaz.js): o cabeçalho e um por seção, com texto traduzível.
  var topo = achar(c, "DUAbaTopo");
  loja.cTopo = cartaz(topo, { titulo: "Deadlock Utils", sub: T("cartaz.topo.sub"), tema: "vermelho", tamanho: "grande" });
  if (loja.cTopo) { loja.cTopo.painel.AddClass("DUCartazComHeroi"); try { topo.MoveChildBefore(loja.cTopo.painel, filhos(topo)[0]); } catch (e) {} }
  loja.cBuild = cartaz(achar(c, "DUCabBuild"), { titulo: T("cartaz.build"), sub: T("cartaz.build.semHeroi"), tema: "teal",
    icone: "s2r://panorama/images/shop/catalog/catalog_shop_tab_icon_builds_psd.vtex" });
  loja.cCounters = cartaz(achar(c, "DUCabCounters"), { titulo: T("cartaz.counters"), sub: T("cartaz.counters.sub"), tema: "arma",
    icone: "s2r://panorama/images/shop/catalog/catalog_shop_tab_icon_weapon_psd.vtex" });
  achar(c, "DUBotaoRecsTexto").text = T("botao.recomendados");
  achar(c, "DUBotaoEditarTexto").text = T("botao.editar");
  achar(c, "DUBotaoAjustesTexto").text = T("botao.ajustes");
  loja.detalhe.text = T("detalhe.inicial");
  aoClicar(achar(c, "DUBotaoRecs"), function () { trocarVista("recs"); });
  aoClicar(achar(c, "DUBotaoEditar"), function () { trocarVista("editor"); });
  aoClicar(achar(c, "DUBotaoAjustes"), function () { abrirCentral(); }); // central de configurações (76-central.js)
  log("aba da loja criada (layout ok: " + [loja.status, loja.build, loja.counters, loja.detalhe].every(valido) + ")");
  if (ultimoResultado) desenharAba(ultimoResultado, ultimaLeitura);
  return true;
}

// Troca de idioma: refaz os textos da aba sem recriar a estrutura (a aba pode estar aberta).
function traduzirAbaLoja() {
  if (!valido(loja.conteudo)) return;
  textoCartaz(loja.cTopo, null, T("cartaz.topo.sub"));
  textoCartaz(loja.cBuild, T("cartaz.build"), T("cartaz.build.semHeroi"));
  textoCartaz(loja.cCounters, T("cartaz.counters"), T("cartaz.counters.sub"));
  achar(loja.conteudo, "DUBotaoRecsTexto").text = T("botao.recomendados");
  achar(loja.conteudo, "DUBotaoEditarTexto").text = T("botao.editar");
  achar(loja.conteudo, "DUBotaoAjustesTexto").text = T("botao.ajustes");
  dica(loja.botao, T("dica.botaoNav"));
  loja.detalhe.text = T("detalhe.inicial");
  loja.assinatura = "";
  trocarVista(loja.vista);
}

function trocarVista(v) {
  loja.vista = v;
  mostrarPainel(loja.vistaRecs, v === "recs");
  mostrarPainel(loja.vistaEditor, v === "editor");
  achar(loja.conteudo, "DUBotaoRecs").SetHasClass("DUAbaModoAtivo", v === "recs");
  achar(loja.conteudo, "DUBotaoEditar").SetHasClass("DUAbaModoAtivo", v === "editor");
  if (v !== "recs") loja.assinatura = "";
  if (v === "editor") abrirEditor(loja.vistaEditor, loja.detalhe);
  else if (ultimoResultado) desenharAba(ultimoResultado, ultimaLeitura);
}

function classeAbaDoJogo() {
  for (var c in ABAS_JOGO) if (temClasse(loja.shop, c)) return c;
  return "";
}

function ativarAba(on) {
  if (!valido(loja.shop) || !valido(loja.conteudo)) return;
  if (on && !loja.ativa) {
    loja.classeAnterior = classeAbaDoJogo();
    if (loja.classeAnterior) {
      loja.shop.RemoveClass(loja.classeAnterior);
      criarCaptura(ABAS_JOGO[loja.classeAnterior]);
    }
    som("UI.Shop.Mod.Starred.Click");
  } else if (!on && loja.ativa) {
    removerCaptura();
    esconderDica();
    if (loja.classeAnterior && !classeAbaDoJogo()) loja.shop.AddClass(loja.classeAnterior);
  }
  loja.ativa = on;
  loja.botao.SetHasClass("DUNavAtiva", on);
  mostrarPainel(loja.conteudo, on);
  if (on && ultimoResultado && loja.vista === "recs") desenharAba(ultimoResultado, ultimaLeitura);
  if (on) atualizarEstadosLoja(true);
}

function criarCaptura(idBotao) {
  removerCaptura();
  if (!idBotao) return; // vista de filtros: não tem botão na barra (achar com id vazio pegava um painel qualquer)
  var alvo = achar(loja.shop, idBotao);
  if (!valido(alvo)) return;
  var cap = criar("Panel", alvo, "DUCaptura");
  if (!cap) return;
  try { cap.style.width = "100%"; cap.style.height = "100%"; cap.style.zIndex = "10"; } catch (e) {}
  evento(cap, "onmouseactivate", function () { ativarAba(false); });
  loja.captura = cap;
}
function removerCaptura() {
  if (valido(loja.captura)) loja.captura.DeleteAsync(0);
  loja.captura = null;
}

function motivoTexto(rec) {
  return rec.motivos.map(function (m) {
    var tag = m.tipo === "build" ? "<font color='#9fe3d6'>BUILD</font> " : "<font color='#e0a060'>COUNTER</font> ";
    return "• " + tag + esc(m.texto) + (m.origem && m.origem.length ? " <font color='#c9bba1'>(" + esc(m.origem.join(", ")) + ")</font>" : "");
  }).join("<br>");
}

// Contra quem é o counter (heróis inimigos citados nos motivos).
function alvosDoCounter(rec) {
  var alvos = [];
  rec.motivos.forEach(function (m) {
    if (m.tipo !== "counter") return;
    (m.origem || []).forEach(function (h) { if (dados.herois[h] && alvos.indexOf(h) < 0) alvos.push(h); });
  });
  return alvos;
}
function pickDaBuild(rec) {
  var m = rec.motivos.filter(function (x) { return x.tipo === "build"; })[0];
  var r = m && /^(\d+)%/.exec(m.texto);
  return r ? r[1] + "%" : "";
}

// Um item na aba: o nosso cartão no formato do da loja. O estado (já tem, sem almas, longe da loja, comprando)
// vem do painel nativo do item, que continua no lugar dele na loja (ver 25-nativos.js), e é relido pelo loop
// rápido com a loja aberta. Itens que você já tem continuam na página, apagados como na loja.
function slotItem(pai, rec, tipo) {
  var slot = criar("Panel", pai, "", "DUSlot");
  var it = rec.item;
  var carta = cartaoItem(slot, it, { preco: true, aoClicar: function () { comprarComAviso(it); } });
  if (carta) loja.cartas.push({ painel: carta, item: it, estado: null });
  var leg = criar("Panel", slot, "", "DUSlotLegenda");
  if (tipo === "counter") {
    var alvos = alvosDoCounter(rec);
    if (alvos.length) {
      imagem(leg, "DUSlotHeroi", imagemHeroi(alvos[0]));
      rotulo(leg, "DUSlotTexto", esc(T("legenda.vs", alvos[0])) + (alvos.length > 1 ? " +" + (alvos.length - 1) : ""));
    } else rotulo(leg, "DUSlotTexto", T("legenda.counter"));
  } else {
    rotulo(leg, "DUSlotTexto DUSlotBuild", esc(T("legenda.build", pickDaBuild(rec))));
  }
  evento(slot, "onmouseover", function () {
    loja.detalhe.text = "<b>" + esc(nomeItem(it)) + "</b><br>" + motivoTexto(rec);
    // tooltip do mod com a descrição do item (o do jogo só abre dentro das listas da loja)
    if (carta) mostrarDicaDetalhe(it, carta, T("dica.comprar"), estadoTexto(it));
  });
  evento(slot, "onmouseout", esconderDica);
  return slot;
}
function estadoTexto(it) {
  return jaTem(it.id) ? T("comprado") : longeDaLoja() ? T("longeDaLoja") : podeComprar(it.id) === false ? T("compra.semAlmas") : null;
}

// Estado dos cartões, como na loja (loop rápido, com a nossa aba aberta na loja aberta).
var CLASSES_ESTADO_LOJA = ["DUComprado", "DUComprando", "DULonge", "DUSemAlmas"];
function atualizarEstadosLoja(forcar) {
  if (!forcar && Date.now() - loja.estadosEm < 150) return;
  loja.estadosEm = Date.now();
  var longe = longeDaLoja();
  loja.cartas.forEach(function (x) {
    if (!valido(x.painel)) return;
    var e = jaTem(x.item.id) ? "DUComprado" : estadoCarta(x.item, longe);
    if (e === x.estado) return;
    x.estado = e;
    CLASSES_ESTADO_LOJA.forEach(function (k) { x.painel.SetHasClass(k, k === e); });
  });
}

// A aba mostra o resultado já confirmado ("Comprando…" até lá); a fileira do Tab é que não espera.
// Sem almas, longe da loja ou já comprado: nem pede (o jogo recusaria); só diz o motivo.
function comprarComAviso(it) {
  var mostrar = function (ok, msg) { loja.detalhe.text = "<b>" + esc(nomeItem(it)) + "</b>: " + esc(msg); };
  if (!compravelAgora(it)) { mostrar(false, estadoTexto(it) || T("compra.recusou")); return; }
  loja.detalhe.text = esc(T("comprando", nomeItem(it)));
  comprarItem(it.id, function (ok, msg) { if (!ok) mostrar(ok, msg); }, mostrar);
  atualizarEstadosLoja(true);
}

function desenharTiers(alvo, lista, porTier, vazio, tipo) {
  alvo.RemoveAndDeleteChildren();
  var custos = DU_DATA.items.custos;
  var algum = false;
  [1, 2, 3, 4].forEach(function (tier) {
    var recs = lista.filter(function (x) { return x.item.tier === tier; }).slice(0, porTier);
    if (!recs.length) return;
    algum = true;
    // Igual à aba "Populares": etiqueta de preço do jogo (pricetag_tierN) à esquerda de cada fileira.
    var linha = criar("Panel", alvo, "", "DUTierLinha DUTier" + tier);
    var preco = criar("Panel", linha, "", "DUTierPreco");
    criar("Panel", preco, "", "DUTierEtiqueta");
    dica(preco, T("almas", custos[tier]));
    var cartas = criar("Panel", linha, "", "DUTierCartas");
    recs.forEach(function (rec) { slotItem(cartas, rec, tipo); });
  });
  if (!algum) rotulo(alvo, "DUAbaVazio", esc(vazio));
}

// Itens das listas da página: 6 por custo na build; counters sem repetir o que já está na build.
// Com a Build Recomendada desligada (padrão), a página é só dos counters.
function listasDaPagina(r) {
  if (!ajustes.buildRecomendada) return { build: [], counters: r.counters };
  var naBuild = {}, porTier = {};
  r.build.forEach(function (x) {
    porTier[x.item.tier] = (porTier[x.item.tier] || 0) + 1;
    if (porTier[x.item.tier] <= 6) naBuild[x.item.id] = true;
  });
  return { build: r.build, counters: r.counters.filter(function (x) { return !naBuild[x.item.id]; }) };
}

function desenharAba(r, leitura) {
  if (!valido(loja.conteudo) || !valido(loja.build)) return;
  var rp = ultimoResultadoPagina || r; // a página usa o resultado que mantém os itens comprados
  var fase = T("fase." + rp.fase);
  var lidos = leitura.inimigos.filter(function (j) { return j.heroi; }).length;
  loja.status.text = !leitura.emPartida ? esc(T("status.foraDePartida")) :
    esc(leitura.eu || T("status.semHeroi")) + "  ·  " + esc(fase) +
    (leitura.segundos != null ? " (" + relogio(leitura.segundos) + ")" : "") + "  ·  " + esc(T("status.inimigosLidos", lidos));
  if (nativos.contagem && !nativos.mapeados) loja.status.text += "  ·  " + esc(resumoNativos()); // só quando há problema
  mostrarPainel(achar(loja.conteudo, "DUBotaoAjustes"), centralDisponivel()); // com o QOL, configurações só na janela dele

  var img = leitura.eu ? imagemHeroi(leitura.eu) : "";
  mostrarPainel(loja.heroi, !!img);
  if (img && loja.heroiAtual !== img) { loja.heroiAtual = img; try { loja.heroi.SetImage(img); } catch (e) {} }
  textoCartaz(loja.cBuild, null, leitura.eu ? T("cartaz.build.sub", leitura.eu, fase) : T("cartaz.build.semHeroi"));

  // Só refaz as listas quando o conteúdo muda: refazer faz a rolagem voltar ao topo. Comprar um item não
  // muda a página (o cartão só muda de estado).
  var l = listasDaPagina(rp);
  var ids = function (lista) { return lista.map(function (x) { return x.item.id; }).join(","); };
  var assinatura = [ids(l.build), ids(l.counters), leitura.eu || "", !!ajustes.buildRecomendada].join("|");
  if (assinatura === loja.assinatura) return;
  loja.assinatura = assinatura;

  varrerNativos(true);
  esconderDica(); // o cartão por baixo do tooltip vai ser apagado
  loja.cartas = [];
  mostrarPainel(loja.secBuild, !!ajustes.buildRecomendada);
  desenharTiers(loja.build, l.build, 6, leitura.eu ? T("vazio.build") : T("vazio.buildSemHeroi"), "build");
  desenharTiers(loja.counters, l.counters, 6, T("vazio.counters"), "counter");
  atualizarEstadosLoja(true);
}
// Com a loja fechada a aba não é redesenhada (ela continua aberta por baixo): redesenha ao abrir.
aoMudarResultado(function (r, l) { if (loja.ativa && loja.lojaAberta && loja.vista === "recs") desenharAba(r, l); });

// Chamado pelo loop rápido (50 ms). Fecha a nossa aba quando o jogador escolhe outra aba (o jogo recoloca a
// classe dela). Fechar a loja não fecha a nossa aba; ao abrir de novo, a classe que o jogo recoloca nos
// primeiros instantes é dele restaurando a última aba: sai de novo e a captura vai para o botão dela.
function vigiarAbaLoja(e) {
  var aberta = !!(e.lojaAberta || temClasse(loja.shop, "gShopOpen"));
  var abriu = aberta && !loja.lojaAberta;
  if (abriu) loja.abriuEm = Date.now();
  loja.lojaAberta = aberta;
  if (!loja.ativa) return;
  if (!ajustes.abaLoja) { ativarAba(false); return; }
  var classe = classeAbaDoJogo();
  if (classe) {
    if (!aberta || Date.now() - loja.abriuEm < GRACA_ABRIR_LOJA) {
      loja.shop.RemoveClass(classe);
      if (classe !== loja.classeAnterior) { loja.classeAnterior = classe; criarCaptura(ABAS_JOGO[classe]); }
    } else { loja.classeAnterior = ""; ativarAba(false); return; } // o jogador escolheu outra aba
  }
  if (abriu && ultimoResultado && loja.vista === "recs") desenharAba(ultimoResultado, ultimaLeitura);
  if (aberta && loja.vista === "recs") atualizarEstadosLoja(abriu);
}
