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
var METODOS_COMPRA = [
  function (p) { $.DispatchEvent("CitadelPurchaseModItem", p); },
  function (p) { $.DispatchEvent("Activated", p, "mouse"); },
];
// Dispara a compra na hora e confere a cada 0,1s (até 0,6s) se o item virou "owned".
function comprarItem(itemId, aoTerminar) {
  var p = nativoDe(itemId);
  if (!p) { varrerNativos(true); p = nativoDe(itemId); }
  if (!p) { log("compra: item " + itemId + " sem painel nativo na loja"); if (aoTerminar) aoTerminar(false, T("compra.abraLoja")); return; }
  if (temClasse(p, "owned")) { if (aoTerminar) aoTerminar(true, T("compra.jaTem")); return; }
  var ordem = nativos.metodoCompra >= 0 ? [nativos.metodoCompra] : METODOS_COMPRA.map(function (_, i) { return i; });
  (function tentar(k) {
    if (k >= ordem.length) { log("compra: nenhum método funcionou para " + itemId); if (aoTerminar) aoTerminar(false, T("compra.recusou")); return; }
    try { METODOS_COMPRA[ordem[k]](p); } catch (e) { log("compra: método " + ordem[k] + " erro: " + e); }
    var checagens = 0;
    (function conferir() {
      if (temClasse(p, "owned")) {
        if (nativos.metodoCompra !== ordem[k]) log("compra: método " + ordem[k] + " funciona");
        nativos.metodoCompra = ordem[k];
        if (aoTerminar) aoTerminar(true, T("compra.ok"));
        atualizarRecomendacoes(lerPartida(), true);
      } else if (++checagens < 6) $.Schedule(0.1, conferir);
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
