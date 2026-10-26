// ===================== Itens NATIVOS da loja =====================
// A loja do jogo já cria um CitadelShopMod para cada item (com tooltip, clique para comprar e as
// classes canAffordMod / owned atualizadas pelo C++). Não dá para criar um desses pelo JS e dizer
// qual item ele mostra, mas dá para:
//   1) achar o painel nativo de cada item e LER se dá para comprar / se você já tem;
//   2) pedir a compra a ele (várias formas; a que funcionar fica guardada);
//   3) EMPRESTAR o painel para a nossa aba (SetParent) e devolver quando ela fecha.

var nativos = { porItem: {}, contagem: 0, mapeados: 0, varridoEm: -99, emprestados: [], metodoCompra: -1, amostra: "", tipos: "" };
var nomeLocalParaItem = DU_DATA.nomesItens || {}; // nome do item em qualquer idioma (minúsculo) -> id

function tipoDe(p) { try { return p.paneltype || ""; } catch (e) { return ""; } }

// Qual item um CitadelShopMod nativo mostra: pelo ícone (src) ou pelo nome no cartão (texto).
function itemDoNativo(p) {
  var ids = iconeParaItens[chaveIcone(srcImagem(achar(p, "ModIconImage")))];
  if (ids && ids.length === 1) return ids[0];
  var rotulos = porClasse(p, "modName").concat(porClasse(p, "ItemName"));
  for (var i = 0; i < rotulos.length; i++) {
    var id = nomeLocalParaItem[normalizar(textoDe(rotulos[i]))];
    if (id) return id;
  }
  return "";
}

// Varre a loja só quando precisa: mapa vazio, algum painel mapeado sumiu, ou a cada 30s.
// (forcar=true ignora o intervalo mas ainda pula se o mapa estiver completo e válido.)
function mapaNativoOk() {
  var ids = Object.keys(nativos.porItem);
  if (ids.length < 20) return false;
  for (var i = 0; i < ids.length; i += 15) if (!valido(nativos.porItem[ids[i]])) return false;
  return true;
}
// forcar === "sempre": varre de qualquer jeito (usado com a loja aberta, a cada 2s: as abas mudam).
function varrerNativos(forcar) {
  if (forcar !== "sempre") {
    var recente = agoraSeg - nativos.varridoEm < 30;
    if (mapaNativoOk() && (recente || !forcar)) return;
    if (!forcar && recente) return;
  }
  nativos.varridoEm = agoraSeg;
  var shop = achar(hud, "CitadelHudHeroShop");
  if (!valido(shop)) return;
  var mapa = {}, n = 0, mapeados = 0, primeiro = null, tipos = {};
  (function rec(p, prof) {
    if (prof > 18) return;
    filhos(p).forEach(function (f) {
      if (f.id === "DUAbaLoja") return; // os que estão emprestados já estão no mapa
      var tipo = tipoDe(f);
      if (/Mod|Item|Shop/.test(tipo)) tipos[tipo] = (tipos[tipo] || 0) + 1;
      if (tipo === "CitadelShopMod") {
        n++;
        if (!primeiro) primeiro = f;
        var id = itemDoNativo(f);
        if (id) {
          mapeados++;
          if (!mapa[id]) mapa[id] = f;
          if (temClasse(f, "owned")) possuidos[id] = true;
        }
        return;
      }
      rec(f, prof + 1);
    });
  })(shop, 0);
  // mantém os emprestados (eles saíram da árvore da loja)
  nativos.emprestados.forEach(function (e) { if (valido(e.painel)) mapa[e.item] = e.painel; });
  nativos.porItem = mapa;
  nativos.contagem = n;
  nativos.mapeados = Object.keys(mapa).length;
  nativos.tipos = Object.keys(tipos).map(function (k) { return k + "=" + tipos[k]; }).join(" ");
  if (primeiro) {
    var rot = porClasse(primeiro, "modName")[0];
    nativos.amostra = "src='" + srcImagem(achar(primeiro, "ModIconImage")).slice(-40) + "' nome='" + textoDe(rot).slice(0, 30) + "'";
  }
}

// Loja aberta (a cada 2s): barato. Só confere "owned" nos painéis já identificados; a varredura completa
// (que lê o nome de ~300 painéis) só roda quando o mapa ficou velho (o jogo recriou os painéis da aba).
function atualizarNativos() {
  if (!mapaNativoOk()) { varrerNativos("sempre"); return; }
  for (var id in nativos.porItem) {
    var p = nativos.porItem[id];
    if (valido(p) && temClasse(p, "owned")) possuidos[id] = true;
  }
}
function resumoNativos() {
  return "itens da loja: " + nativos.mapeados + " reconhecidos de " + nativos.contagem +
    (nativos.mapeados ? "" : " · " + nativos.amostra + " · tipos: " + nativos.tipos);
}

function nativoDe(itemId) { var p = nativos.porItem[itemId]; return valido(p) ? p : null; }
// true/false quando o jogo sabe; null quando não achamos o painel nativo do item
function podeComprar(itemId) { var p = nativoDe(itemId); return p ? temClasse(p, "canAffordMod") : null; }

// Itens que você já tem: lembrados até o fim da partida (a loja só mostra os painéis da aba atual,
// então um item comprado em outra aba continua "lembrado" mesmo quando o painel dele some).
var possuidos = {};
function marcarPossuido(id) { if (id) possuidos[id] = true; }
function esquecerPossuidos() { possuidos = {}; }
function jaTem(itemId) {
  if (possuidos[itemId]) return true;
  var p = nativoDe(itemId);
  if (p && temClasse(p, "owned")) { possuidos[itemId] = true; return true; }
  return false;
}

// ---------- compra ----------
// O jogo compra pelo painel do próprio item (CitadelShopMod). Há dois jeitos de pedir; o que funcionar
// fica guardado (também nas configurações salvas: a descoberta acontece uma vez só).
// Com o método conhecido, a compra não espera o jogo: o item sai da fileira do Tab na hora, como na loja,
// e a confirmação roda por trás. Se em 2 s nada indicar a compra, ele volta.
var METODOS_COMPRA = [
  function (p) { $.DispatchEvent("CitadelPurchaseModItem", p); },
  function (p) { $.DispatchEvent("Activated", p, "mouse"); },
];
var comprasPendentes = {}; // id do item -> quando foi pedido
function compraPendente(id) { return !!comprasPendentes[id] && Date.now() - comprasPendentes[id] < 2500; }
function almasAgora() {
  var l = ultimaLeitura;
  return l && l.meuCartao ? lerAlmas(textoDe(achar(l.meuCartao.painel, "SoulsValue"))) : null;
}
// Com a loja fechada o jogo pode demorar a marcar o painel como "owned": vale também o item aparecer no
// seu cartão do placar ou as almas caírem pelo preço do item.
function compraConfirmada(itemId, almasAntes) {
  if (jaTem(itemId)) return true;
  var l = ultimaLeitura;
  if (!l || !l.meuCartao) return false;
  var j = lerJogador(l.meuCartao.painel);
  if (j && j.itens.indexOf(itemId) >= 0) { marcarPossuido(itemId); return true; }
  var it = dados.itensPorId[itemId], almas = almasAgora();
  return !!it && almasAntes != null && almas != null && almasAntes - almas >= it.custo * 0.8;
}
// aoTerminar(ok, mensagem) sai na hora; aoConfirmar(ok, mensagem), opcional, quando a confirmação chega.
// Duas compras seguidas sem confirmação: o método salvo deixou de valer (patch do jogo) e é descoberto de novo.
function comprarItem(itemId, aoTerminar, aoConfirmar) {
  var fim = aoTerminar || function () {};
  var confirmou = aoConfirmar || function () {};
  var p = nativoDe(itemId);
  if (!p) { varrerNativos(true); p = nativoDe(itemId); }
  if (!p) { log("compra: item " + itemId + " sem painel nativo na loja"); fim(false, T("compra.abraLoja")); confirmou(false, T("compra.abraLoja")); return; }
  if (temClasse(p, "owned")) { fim(true, T("compra.jaTem")); confirmou(true, T("compra.jaTem")); return; }
  var almasAntes = almasAgora();
  var metodo = nativos.metodoCompra >= 0 ? nativos.metodoCompra : ajustes.metodoCompra;
  if (metodo >= 0 && METODOS_COMPRA[metodo]) {
    try { METODOS_COMPRA[metodo](p); } catch (e) { log("compra: método " + metodo + " erro: " + e); }
    comprasPendentes[itemId] = Date.now();
    fim(true, T("compra.ok"));
    $.Schedule(2.0, function () {
      var ok = compraConfirmada(itemId, almasAntes);
      delete comprasPendentes[itemId];
      if (ok) { nativos.falhasSeguidas = 0; confirmou(true, T("compra.ok")); atualizarRecomendacoes(lerPartida(), true); return; }
      nativos.falhasSeguidas = (nativos.falhasSeguidas || 0) + 1;
      log("compra de " + itemId + " não confirmada (" + nativos.falhasSeguidas + " seguida)");
      if (nativos.falhasSeguidas >= 2) {
        log("compra: método " + metodo + " parou de funcionar, vai descobrir de novo");
        nativos.metodoCompra = -1;
        ajustes.metodoCompra = -1;
        nativos.falhasSeguidas = 0;
        salvarAjustes();
      }
      confirmou(false, T("compra.recusou"));
      if (faixa.visivel) atualizarFaixa(true);
    });
    return;
  }
  // Primeira compra: descobre o método (um de cada vez, conferindo por 1 s).
  (function tentar(k) {
    if (k >= METODOS_COMPRA.length) { log("compra: nenhum método funcionou para " + itemId); fim(false, T("compra.recusou")); confirmou(false, T("compra.recusou")); return; }
    try { METODOS_COMPRA[k](p); } catch (e) { log("compra: método " + k + " erro: " + e); }
    var checagens = 0;
    (function conferir() {
      if (compraConfirmada(itemId, almasAntes)) {
        log("compra: método " + k + " funciona");
        nativos.metodoCompra = k;
        nativos.falhasSeguidas = 0;
        ajustes.metodoCompra = k;
        salvarAjustes();
        fim(true, T("compra.ok"));
        confirmou(true, T("compra.ok"));
        atualizarRecomendacoes(lerPartida(), true);
      } else if (++checagens < 10) $.Schedule(0.1, conferir);
      else tentar(k + 1);
    })();
  })(0);
}

// ---------- empréstimo para a nossa aba ----------
function emprestarNativo(itemId, novoPai) {
  var p = nativoDe(itemId);
  if (!p) return null;
  var ja = nativos.emprestados.filter(function (e) { return e.painel === p; })[0];
  if (!ja) {
    var pai = null;
    try { pai = p.GetParent(); } catch (e) {}
    if (!valido(pai)) return null;
    // Índice ORIGINAL: o atual + quantos já emprestados do mesmo pai estavam antes dele.
    var idx = filhos(pai).indexOf(p);
    nativos.emprestados.filter(function (e) { return e.pai === pai; })
      .sort(function (a, b) { return a.indice - b.indice; })
      .forEach(function (e) { if (e.indice <= idx) idx++; });
    nativos.emprestados.push({ item: itemId, painel: p, pai: pai, indice: idx });
  }
  try { p.SetParent(novoPai); } catch (e) { log("SetParent falhou: " + e); return null; }
  return p;
}

// Devolve todos os painéis emprestados para o lugar original na loja.
// Em ordem crescente do índice original: cada um volta exatamente para a posição de antes.
function devolverNativos() {
  nativos.emprestados.slice().sort(function (a, b) { return a.indice - b.indice; }).forEach(function (e) {
    if (!valido(e.painel) || !valido(e.pai)) return;
    try {
      e.painel.SetParent(e.pai);
      var irmaos = filhos(e.pai);
      if (e.indice >= 0 && e.indice < irmaos.length - 1) e.pai.MoveChildBefore(e.painel, irmaos[e.indice]);
    } catch (err) { log("devolver nativo falhou: " + err); }
  });
  nativos.emprestados = [];
}

// Itens que o jogo marca como seus (classe owned no painel nativo).
function itensQueTenho() {
  Object.keys(nativos.porItem).forEach(function (id) { jaTem(id); }); // atualiza a memória
  return Object.keys(possuidos);
}
