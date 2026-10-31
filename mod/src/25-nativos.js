// ===================== Itens NATIVOS da loja =====================
// A loja do jogo já cria um CitadelShopMod para cada item (com tooltip, clique para comprar e as
// classes canAffordMod / owned atualizadas pelo C++). Não dá para criar um desses pelo JS e dizer
// qual item ele mostra, mas dá para:
//   1) achar o painel nativo de cada item e LER se dá para comprar / se você já tem;
//   2) pedir a compra por ele (várias formas; a que funcionar fica guardada).
// Os painéis do jogo NUNCA saem do lugar. O C++ da loja procura cada item dentro da entrada do guia de build
// (BuildModEntry, primeiro filho) e da lista dele sem conferir se achou: um item levado para a nossa aba
// fechava o jogo na próxima vez que a loja atualizava o guia (abrir a loja, comprar, trocar de herói).

var nativos = { porItem: {}, contagem: 0, mapeados: 0, varridoEm: -99, metodoCompra: "", amostra: "", tipos: "", logados: {} };
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
  var shop = lojaDoJogo();
  if (!shop) return;
  var mapa = {}, n = 0, mapeados = 0, primeiro = null, tipos = {};
  (function rec(p, prof) {
    if (prof > 18) return;
    filhos(p).forEach(function (f) {
      if (f.id === "DUAbaLoja") return; // a nossa aba não tem itens do jogo
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
// O jogo compra pelo evento CitadelPurchaseModItem, a partir do painel do próprio item (CitadelShopMod).
// Desde o patch de 30/10/2026 o evento leva o item (nome da classe, que o jogo vira token), dois sinais e a
// origem da compra (client.dll: CUIEvent<CUtlStringToken, bool, bool, EItemPurchaseSource>); antes levava
// só o painel. Como o formato pode mudar de novo, há várias formas de pedir: a que funcionar fica guardada
// (também nas configurações salvas) e é descoberta de novo quando para de funcionar.
// Com o método conhecido, a compra não espera o jogo: o item sai da fileira do Tab na hora, como na loja,
// e a confirmação roda por trás. Se em 2 s nada indicar a compra, ele volta.
var METODOS_COMPRA = [
  { id: "item", fn: function (p, cl) { $.DispatchEvent("CitadelPurchaseModItem", p, cl, false, false, 0); } },
  { id: "itemOrigem1", fn: function (p, cl) { $.DispatchEvent("CitadelPurchaseModItem", p, cl, false, false, 1); } },
  { id: "itemSemPainel", fn: function (p, cl) { $.DispatchEvent("CitadelPurchaseModItem", cl, false, false, 0); } },
  { id: "painel", fn: function (p) { $.DispatchEvent("CitadelPurchaseModItem", p); } },
  { id: "clique", fn: function (p) { $.DispatchEvent("Activated", p, "mouse"); } },
];
function metodoCompraPorId(id) { return METODOS_COMPRA.filter(function (m) { return m.id === id; })[0] || null; }
function classeDoItem(itemId) { var it = dados.itensPorId[itemId]; return it && it.classes ? it.classes[0] || "" : ""; }
// O mesmo erro a cada clique só enche o console: cada mensagem sai uma vez.
function logUmaVez(msg) { if (nativos.logados[msg]) return; nativos.logados[msg] = true; log(msg); }
function esquecerMetodoCompra() { nativos.metodoCompra = ""; ajustes.metodoCompra = ""; nativos.falhasSeguidas = 0; salvarAjustes(); }
var comprasPendentes = {}; // id do item -> quando foi pedido
function compraPendente(id) { return !!comprasPendentes[id] && Date.now() - comprasPendentes[id] < 2500; }
function almasAgora() {
  var l = ultimaLeitura;
  return l && l.meuCartao ? lerAlmas(textoDe(almasDoCartao(l.meuCartao.painel))) : null;
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
  var classe = classeDoItem(itemId);
  var metodo = metodoCompraPorId(nativos.metodoCompra || ajustes.metodoCompra);
  if (metodo) {
    // o jogo recusou o formato na hora (patch): descobre de novo já nesta compra
    try { metodo.fn(p, classe); } catch (e) { logUmaVez("compra: " + metodo.id + " parou de funcionar: " + e); esquecerMetodoCompra(); metodo = null; }
  }
  if (metodo) {
    comprasPendentes[itemId] = Date.now();
    fim(true, T("compra.ok"));
    $.Schedule(2.0, function () {
      var ok = compraConfirmada(itemId, almasAntes);
      delete comprasPendentes[itemId];
      if (ok) { nativos.falhasSeguidas = 0; confirmou(true, T("compra.ok")); atualizarRecomendacoes(lerPartida(), true); return; }
      nativos.falhasSeguidas = (nativos.falhasSeguidas || 0) + 1;
      log("compra de " + itemId + " não confirmada (" + nativos.falhasSeguidas + " seguida)");
      if (nativos.falhasSeguidas >= 2) {
        log("compra: " + metodo.id + " parou de funcionar, vai descobrir de novo");
        esquecerMetodoCompra();
      }
      confirmou(false, T("compra.recusou"));
      if (faixa.visivel) atualizarFaixa(true);
    });
    return;
  }
  // Primeira compra: descobre o método (um de cada vez, conferindo por 1 s). Um formato que o jogo
  // recusa na hora (erro ao montar o evento) passa direto para o próximo.
  (function tentar(k) {
    if (k >= METODOS_COMPRA.length) { logUmaVez("compra: nenhum método funcionou (" + itemId + ")"); fim(false, T("compra.recusou")); confirmou(false, T("compra.recusou")); return; }
    var m = METODOS_COMPRA[k];
    try { m.fn(p, classe); } catch (e) { logUmaVez("compra: " + m.id + " recusado: " + e); tentar(k + 1); return; }
    var checagens = 0;
    (function conferir() {
      if (compraConfirmada(itemId, almasAntes)) {
        log("compra: " + m.id + " funciona");
        nativos.metodoCompra = m.id;
        nativos.falhasSeguidas = 0;
        ajustes.metodoCompra = m.id;
        salvarAjustes();
        fim(true, T("compra.ok"));
        confirmou(true, T("compra.ok"));
        atualizarRecomendacoes(lerPartida(), true);
      } else if (++checagens < 10) $.Schedule(0.1, conferir);
      else tentar(k + 1);
    })();
  })(0);
}

// ---------- guia: a build que o jogador escolheu na aba Builds da loja ----------
// A loja monta a build escolhida em #ShopModsSelectedBuild > #CategoryContainer > uma categoria por etapa
// (CitadelShopModsBuildCategory, nome em #BuildCategoryName) > #ModsContainer > uma BuildModEntry por item
// com o CitadelShopMod dentro, na ordem do guia. Só leitura: nada ali pode sair do lugar (ver o topo).
var guia = { itens: [], lidoEm: -99 };
function lerGuia() {
  if (agoraSeg - guia.lidoEm < 3) return guia.itens;
  guia.lidoEm = agoraSeg;
  var cats = achar(achar(lojaDoJogo(), "ShopModsSelectedBuild"), "CategoryContainer");
  var lista = [], vistos = {};
  filhos(cats).forEach(function (cat) {
    var etapa = textoDe(achar(cat, "BuildCategoryName"));
    (function rec(p, prof) {
      if (prof > 6) return;
      filhos(p).forEach(function (f) {
        if (tipoDe(f) !== "CitadelShopMod") { rec(f, prof + 1); return; }
        var id = itemDoNativo(f);
        if (!id || vistos[id]) return;
        vistos[id] = true;
        lista.push({ id: id, etapa: etapa });
        if (temClasse(f, "owned")) possuidos[id] = true;
      });
    })(achar(cat, "ModsContainer"), 0);
  });
  guia.itens = lista;
  return lista;
}

// Itens que o jogo marca como seus (classe owned no painel nativo). A conferência de todos os painéis roda a
// cada 5 s (com a loja aberta, atualizarNativos já confere a cada 2 s); os itens do seu cartão no placar
// chegam pela leitura de cada segundo.
function itensQueTenho() {
  if (agoraSeg - (nativos.possuidosEm || -99) >= 5) {
    nativos.possuidosEm = agoraSeg;
    Object.keys(nativos.porItem).forEach(function (id) { jaTem(id); });
  }
  return Object.keys(possuidos);
}
