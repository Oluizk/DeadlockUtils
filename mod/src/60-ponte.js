// ===================== Ponte com a internet (navegador embutido do jogo) =====================
// O Panorama não tem fetch nem armazenamento. O jogo tem um Chromium embutido (CitadelHTMLPanel).
// No build de out/2026 ele só abre páginas HTTPS, então a página da ponte (mod/pagina/ponte.html)
// precisa estar hospedada (ex.: GitHub Pages) e a URL em data/config.json -> "urlPonte".
//   mod -> página:  SetURL(urlPonte + "#" + {"s":sessão,"id":n,"fn":"tracker","args":[...]})
//   página -> mod:  document.title = "DU|r|id|ok|parte|total|dados|#seq"  (evento HTMLTitle)
// Um pedido por vez: o próximo só sai quando o anterior responde (ou estoura o tempo).

var ponte = { painel: null, pronto: false, falhou: false, motivo: "", seq: 0, cbs: {}, partes: {}, vistos: [],
  fila: [], ocupado: null, info: null, aoPronto: [], sessao: String(Date.now()) };
var URL_PONTE = CONFIG.urlPonte || (typeof DU_URL_PONTE_TESTE !== "undefined" ? DU_URL_PONTE_TESTE : ""); // o 2º só existe no simulador

function iniciarPonte() {
  if (ponte.painel || ponte.falhou) return;
  if (!URL_PONTE) { falharPonte(T("ponte.semUrl")); return; }
  var p = criar("CitadelHTMLPanel", hud, "DU_Ponte");
  if (!p) { falharPonte(T("ponte.semPainel")); return; }
  ponte.painel = p;
  try {
    p.style.width = "2px"; p.style.height = "2px"; p.style.opacity = "0.01";
    p.SetAttributeString("hittest", "false");
    p.SetAttributeString("hittestchildren", "false");
  } catch (e) {}
  try {
    $.RegisterEventHandler("HTMLTitle", p, function (a, b) { receberTitulo(typeof b === "string" ? b : a); });
  } catch (e) { falharPonte("RegisterEventHandler: " + e); return; }
  // Primeiro pedido: "info" (também testa armazenamento). Quando responder, a ponte está pronta.
  ponte.cbs["0"] = function (ok, texto) {
    if (!ok) { falharPonte(T("ponte.erro", texto)); return; }
    ponte.pronto = true;
    try { ponte.info = JSON.parse(texto); } catch (e) { ponte.info = { bruto: texto }; }
    log("ponte de internet pronta: " + texto);
    ponte.aoPronto.forEach(function (fn) { try { fn(); } catch (e) {} });
    proximoPedido();
  };
  enviarPedido({ id: "0", fn: "info", args: [] });
  $.Schedule(20, function () { if (!ponte.pronto) falharPonte(T("ponte.semResposta", URL_PONTE)); });
}

function falharPonte(motivo) {
  if (ponte.falhou) return;
  ponte.falhou = true;
  ponte.motivo = motivo;
  log("ponte de internet indisponível: " + motivo);
  Object.keys(ponte.cbs).forEach(function (id) { var cb = ponte.cbs[id]; delete ponte.cbs[id]; cb(false, motivo); });
  ponte.fila = [];
}

function enviarPedido(pedido) {
  ponte.ocupado = pedido.id;
  var msg = { s: ponte.sessao, id: parseInt(pedido.id, 10), fn: pedido.fn, args: pedido.args };
  try { ponte.painel.SetURL(URL_PONTE + "#" + encodeURIComponent(JSON.stringify(msg))); }
  catch (e) { falharPonte("SetURL: " + e); return; }
  var id = pedido.id;
  $.Schedule(30, function () {
    if (ponte.ocupado === id && ponte.cbs[id]) {
      var cb = ponte.cbs[id]; delete ponte.cbs[id];
      delete ponte.partes[id]; // pedaços de uma resposta que não chegou inteira
      ponte.ocupado = null;
      cb(false, T("ponte.tempo"));
      proximoPedido();
    }
  });
}

function proximoPedido() {
  if (!ponte.pronto || ponte.ocupado !== null) return;
  var p = ponte.fila.shift();
  if (p) enviarPedido(p);
}

function receberTitulo(titulo) {
  var t = String(titulo || "");
  if (t.indexOf("DU|") !== 0) return;
  if (ponte.vistos.indexOf(t) >= 0) return; // o jogo dispara HTMLTitle 2x por mudança
  ponte.vistos.push(t);
  if (ponte.vistos.length > 80) ponte.vistos.shift();
  t = t.replace(/\|#\d+$/, "");
  // DU|r|id|ok|parte|total|dados
  var p = t.split("|");
  if (p[1] !== "r") return;
  var id = p[2], ok = p[3] === "1", parte = parseInt(p[4], 10), total = parseInt(p[5], 10);
  var buf = ponte.partes[id] || (ponte.partes[id] = []);
  buf[parte] = p.slice(6).join("|");
  for (var i = 0; i < total; i++) if (buf[i] === undefined) return;
  delete ponte.partes[id];
  var cb = ponte.cbs[id];
  delete ponte.cbs[id];
  if (ponte.ocupado === id) ponte.ocupado = null;
  if (cb) cb(ok, buf.join(""));
  proximoPedido();
}

// Chama uma função da página. cb(ok, textoOuJson)
function ponteChamar(nome, args, cb) {
  iniciarPonte();
  if (ponte.falhou) { if (cb) cb(false, ponte.motivo || T("ponte.indisponivel")); return; }
  var id = String(++ponte.seq);
  if (cb) ponte.cbs[id] = cb;
  ponte.fila.push({ id: id, fn: nome, args: args || [] });
  proximoPedido();
}
function ponteSalvar(chave, valor, cb) { ponteChamar("salvar", [chave, valor], function (ok) { if (cb) cb(ok); }); }
function ponteLer(chave, cb) { ponteChamar("ler", [chave], cb); }
function aoPontePronta(fn) { if (ponte.pronto) fn(); else ponte.aoPronto.push(fn); }
