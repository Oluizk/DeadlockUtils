// ===================== Aba "Deadlock Utils" na loja (B) =====================
// Botão a mais na barra lateral de abas (#ShopNavigation) + painel por cima da lista de itens
// (#ShopModListsContainer). A loja marca a aba ativa com uma classe na raiz (showingWeapon…).
// Ao abrir a nossa, tiramos essa classe. Se o jogador clicar numa OUTRA aba, o jogo recoloca a
// classe e fechamos a nossa. Se clicar na MESMA aba de antes, o jogo não muda nada, por isso
// pomos uma "captura" invisível sobre ela, que fecha a nossa e devolve a classe.

var ABAS_JOGO = {
  showingFavorites: "FavoritesNav", showingRecommendations: "RecommendedNav", showingAllItems: "FilteredNav",
  showingWeapon: "WeaponNav", showingTech: "TechNav", showingArmor: "ArmorNav", showingFilters: "",
};
var loja = { ativa: false, classeAnterior: "", falhou: false, vista: "recs" };

function montarAbaLoja() {
  if (loja.falhou) return false;
  if (valido(loja.botao) && valido(loja.conteudo)) return true;
  var shop = achar(hud, "CitadelHudHeroShop");
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
  evento(b, "onmouseactivate", function () { ativarAba(!loja.ativa); });
  dica(b, T("dica.botaoNav"));

  loja.botao = b;
  loja.conteudo = c;
  loja.status = achar(c, "DUStatusLoja");
  loja.heroi = achar(c, "DUAbaHeroi");
  loja.ameacas = achar(c, "DUAmeacas");
  loja.build = achar(c, "DUBuild");
  loja.counters = achar(c, "DUCounters");
  loja.detalhe = achar(c, "DUDetalhe");
  loja.vistaRecs = achar(c, "DUVistaRecs");
  loja.vistaEditor = achar(c, "DUVistaEditor");
  // Cartazes (componente em 15-cartaz.js): o cabeçalho e um por seção, com texto traduzível.
  var topo = achar(c, "DUAbaTopo");
  loja.cTopo = cartaz(topo, { titulo: "Deadlock Utils", sub: T("cartaz.topo.sub"), tema: "vermelho", tamanho: "grande" });
  if (loja.cTopo) { loja.cTopo.painel.AddClass("DUCartazComHeroi"); try { topo.MoveChildBefore(loja.cTopo.painel, filhos(topo)[0]); } catch (e) {} }
  loja.cPerigo = cartaz(achar(c, "DUCabPerigo"), { titulo: T("cartaz.perigo"), sub: T("cartaz.perigo.sub"), tema: "escuro",
    icone: "s2r://panorama/images/icons/icon_eye.vsvg" });
  loja.cBuild = cartaz(achar(c, "DUCabBuild"), { titulo: T("cartaz.build"), sub: T("cartaz.build.semHeroi"), tema: "teal",
    icone: "s2r://panorama/images/shop/catalog/catalog_shop_tab_icon_builds_psd.vtex" });
  loja.cCounters = cartaz(achar(c, "DUCabCounters"), { titulo: T("cartaz.counters"), sub: T("cartaz.counters.sub"), tema: "arma",
    icone: "s2r://panorama/images/shop/catalog/catalog_shop_tab_icon_weapon_psd.vtex" });
  achar(c, "DUBotaoRecsTexto").text = T("botao.recomendados");
  achar(c, "DUBotaoEditarTexto").text = T("botao.editar");
  loja.detalhe.text = T("detalhe.inicial");
  aoClicar(achar(c, "DUBotaoRecs"), function () { trocarVista("recs"); });
  aoClicar(achar(c, "DUBotaoEditar"), function () { trocarVista("editor"); });
  log("aba da loja criada (layout ok: " + [loja.status, loja.ameacas, loja.build, loja.counters, loja.detalhe].every(valido) + ")");
  if (ultimoResultado) desenharAba(ultimoResultado, ultimaLeitura);
  return true;
}

function trocarVista(v) {
  loja.vista = v;
  mostrarPainel(loja.vistaRecs, v === "recs");
  mostrarPainel(loja.vistaEditor, v === "editor");
  achar(loja.conteudo, "DUBotaoRecs").SetHasClass("DUAbaModoAtivo", v === "recs");
  achar(loja.conteudo, "DUBotaoEditar").SetHasClass("DUAbaModoAtivo", v === "editor");
  if (v === "editor") { devolverNativos(); abrirEditor(loja.vistaEditor, loja.detalhe); }
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
    devolverNativos();
    if (loja.classeAnterior && !classeAbaDoJogo()) loja.shop.AddClass(loja.classeAnterior);
  }
  loja.ativa = on;
  loja.botao.SetHasClass("DUNavAtiva", on);
  mostrarPainel(loja.conteudo, on);
  // Ao abrir, redesenha já com os itens nativos emprestados; ao fechar eles já voltaram.
  if (on && ultimoResultado && loja.vista === "recs") desenharAba(ultimoResultado, ultimaLeitura);
}

function criarCaptura(idBotao) {
  removerCaptura();
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

// Um item na aba: de preferência o painel NATIVO da loja (tooltip/compra do jogo); senão, nosso cartão.
// Itens que você já tem continuam na página (o painel nativo mostra "comprado" do jeito do jogo).
function slotItem(pai, rec, tipo) {
  var slot = criar("Panel", pai, "", "DUSlot");
  var nativo = loja.ativa && CONFIG.itensNativos !== false ? emprestarNativo(rec.item.id, slot) : null;
  if (!nativo) {
    cartaoItem(slot, rec.item, { aoClicar: function () { comprarComAviso(rec.item); } });
    slot.AddClass("DUSlotProprio");
  }
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
    loja.detalhe.text = "<b>" + esc(nomeItem(rec.item)) + "</b><br>" + motivoTexto(rec);
    if (!nativo) abrirTooltipNativo(slot, rec.item); // o painel nativo já tem o tooltip do jogo
  });
  if (!nativo) evento(slot, "onmouseout", fecharTooltipNativo);
  return slot;
}

function comprarComAviso(it) {
  loja.detalhe.text = esc(T("comprando", nomeItem(it)));
  comprarItem(it.id, function (ok, msg) { loja.detalhe.text = "<b>" + esc(nomeItem(it)) + "</b>: " + esc(msg); });
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
function listasDaPagina(r) {
  var naBuild = {}, porTier = {};
  r.build.forEach(function (x) {
    porTier[x.item.tier] = (porTier[x.item.tier] || 0) + 1;
    if (porTier[x.item.tier] <= 6) naBuild[x.item.id] = true;
  });
  return { build: r.build, counters: r.counters.filter(function (x) { return !naBuild[x.item.id]; }) };
}

function desenharAba(r, leitura) {
  if (!valido(loja.conteudo) || !valido(loja.ameacas) || !valido(loja.build)) return;
  var rp = ultimoResultadoPagina || r; // a página usa o resultado que mantém os itens comprados
  var fase = T("fase." + rp.fase);
  var lidos = leitura.inimigos.filter(function (j) { return j.heroi; }).length;
  loja.status.text = !leitura.emPartida ? esc(T("status.foraDePartida")) :
    esc(leitura.eu || T("status.semHeroi")) + "  ·  " + esc(fase) +
    (leitura.segundos != null ? " (" + relogio(leitura.segundos) + ")" : "") + "  ·  " + esc(T("status.inimigosLidos", lidos));
  if (nativos.contagem && !nativos.mapeados) loja.status.text += "  ·  " + esc(resumoNativos()); // só quando há problema

  var img = leitura.eu ? imagemHeroi(leitura.eu) : "";
  mostrarPainel(loja.heroi, !!img);
  if (img && loja.heroiAtual !== img) { loja.heroiAtual = img; try { loja.heroi.SetImage(img); } catch (e) {} }
  textoCartaz(loja.cBuild, null, leitura.eu ? T("cartaz.build.sub", leitura.eu, fase) : T("cartaz.build.semHeroi"));

  // Só refaz as listas quando o conteúdo muda. Refazer devolve e pega de novo os painéis nativos da loja,
  // o que pesa e faz a rolagem voltar ao topo. Comprar um item não muda a página.
  var l = listasDaPagina(rp);
  var ids = function (lista) { return lista.map(function (x) { return x.item ? x.item.id : x.itemId + "@" + x.heroi; }).join(","); };
  var assinatura = [ids(rp.alertas), ids(l.build), ids(l.counters), leitura.eu || ""].join("|");
  if (assinatura === loja.assinatura && nativos.emprestados.length) return;
  loja.assinatura = assinatura;

  loja.ameacas.RemoveAndDeleteChildren();
  if (rp.alertas.length === 0) rotulo(loja.ameacas, "DUAbaVazio", esc(T("vazio.perigo")));
  rp.alertas.slice(0, 8).forEach(function (a) {
    var it = dados.itensPorId[a.itemId];
    var bloco = criar("Panel", loja.ameacas, "", "DUAmeaca DUPerigo" + a.perigo);
    if (it) imagem(bloco, "DUAmeacaIcone", iconeItem(it));
    var txt = criar("Panel", bloco, "", "DUAmeacaTextos");
    rotulo(txt, "DUAmeacaNome", "<b>" + esc(a.nomeItem) + "</b>");
    rotulo(txt, "DUAmeacaHeroi", esc(a.heroi) + "  ·  " + esc(T("perigo." + a.perigo)));
    evento(bloco, "onmouseover", function () {
      loja.detalhe.text = "<b>" + esc(a.nomeItem) + " (" + esc(a.heroi) + ")</b>: " + esc(a.alerta) + "<br>" + esc(T("detalhe.dica", a.dica));
    });
  });

  devolverNativos(); // antes de limpar: os painéis nativos emprestados não podem ser apagados
  varrerNativos(true);
  desenharTiers(loja.build, l.build, 6, leitura.eu ? T("vazio.build") : T("vazio.buildSemHeroi"), "build");
  desenharTiers(loja.counters, l.counters, 6, T("vazio.counters"), "counter");
}
aoMudarResultado(function (r, l) { if (loja.ativa && loja.vista === "recs") desenharAba(r, l); });

// Checagem rápida (0,1s): fecha a nossa aba quando o jogador escolhe outra aba ou fecha a loja.
// Chamado pelo loop rápido (50 ms).
function vigiarAbaLoja(e) {
  if (!loja.ativa) return;
  if (classeAbaDoJogo()) { loja.classeAnterior = ""; ativarAba(false); }
  else if (!e.lojaAberta && !temClasse(loja.shop, "gShopOpen")) ativarAba(false);
}
