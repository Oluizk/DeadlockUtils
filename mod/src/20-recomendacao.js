// ===================== Recomendação: leitura + motor + counters editados =====================

var overrides = { herois: {} };   // counters editados no jogo (aba Counters > Editar)
var ultimaLeitura = null;
var ultimoResultado = null;        // para o Tab: sem os itens que você já tem
var ultimoResultadoPagina = null;  // para a aba da loja: COM os itens que você já tem (eles continuam lá)
var ouvintesResultado = [];       // módulos de UI que redesenham quando o resultado muda

function aoMudarResultado(fn) { ouvintesResultado.push(fn); }

function estadoDaLeitura(leitura) {
  return {
    meuHeroi: leitura.eu,
    aliados: leitura.aliados,
    inimigos: leitura.inimigos.map(function (j) { return { heroi: j.heroi, itens: j.itens }; }),
    meusItens: leitura.meusItens.concat(itensQueTenho()),
    tiers: [1, 2, 3, 4],
    nomeItem: nomeItem,
    t: T,
    fase: DeadlockEngine.faseDoTempo(leitura.segundos),
    overrides: overrides,
  };
}
// O que muda a recomendação durante a partida. Counters editados e idioma ficam de fora: quem muda um deles
// (editor, importação, configurações, ponte) já recalcula com forcar.
function assinaturaDoEstado(e) {
  return [e.meuHeroi, e.aliados.join(","), e.inimigos.map(function (j) { return j.heroi + ":" + j.itens.join("."); }).join(","),
    e.meusItens.join(","), e.fase].join("|");
}

// O motor (duas passadas: o Tab e a página da loja) só roda quando a assinatura muda; antes ele rodava a
// cada segundo para só depois descobrir que nada tinha mudado.
var assinaturaAnterior = "";
function atualizarRecomendacoes(leitura, forcar) {
  ultimaLeitura = leitura;
  var estado = estadoDaLeitura(leitura);
  var assinatura = assinaturaDoEstado(estado);
  if (!forcar && assinatura === assinaturaAnterior) return false;
  assinaturaAnterior = assinatura;
  var estadoPagina = {};
  for (var k in estado) estadoPagina[k] = estado[k];
  estadoPagina.meusItens = [];
  var r = DeadlockEngine.recomendar(dados, estado);
  ultimoResultado = r;
  ultimoResultadoPagina = DeadlockEngine.recomendar(dados, estadoPagina);
  ouvintesResultado.forEach(function (fn) { try { fn(r, leitura); } catch (e) { log("erro ao desenhar: " + e + (e.stack ? "\n" + e.stack : "")); } });
  return true;
}

// Counters efetivos de um herói (editados > padrão da comunidade).
function countersDoHeroi(h) {
  if (overrides.herois[h]) return overrides.herois[h];
  return dados.countersHerois[h] || [];
}

// ---------- compartilhamento: código curto "DU1:<base64>" ----------
// Formato: {"v":1,"h":{"Haze":[["metal-skin",2,"motivo"],...]}}
function codigoDeCounters(herois) {
  var h = {};
  herois.forEach(function (nome) {
    h[nome] = countersDoHeroi(nome).map(function (c) { return [c.item, c.peso, c.motivo || ""]; });
  });
  return "DU1:" + paraBase64(JSON.stringify({ v: 1, h: h }));
}
function lerCodigo(codigo) {
  var t = String(codigo || "").trim();
  var i = t.indexOf("DU1:");
  if (i < 0) throw new Error(T("ed.erro.prefixo"));
  var obj = JSON.parse(deBase64(t.slice(i + 4).split(/\s/)[0]));
  var saida = {};
  Object.keys(obj.h || {}).forEach(function (nome) {
    if (!dados.herois[nome]) return;
    saida[nome] = (obj.h[nome] || []).filter(function (c) { return dados.itensPorId[c[0]]; }).map(function (c) {
      return { item: c[0], peso: Math.max(1, Math.min(4, parseInt(c[1], 10) || 1)), motivo: String(c[2] || "").slice(0, 200) };
    });
  });
  return saida;
}

// Importa um código DU1 (editor da loja e aba do QOL): grava, salva e recalcula. Devolve os heróis importados.
function importarCodigoCounters(codigo) {
  var novos = lerCodigo(codigo);
  var nomes = Object.keys(novos);
  if (!nomes.length) throw new Error(T("ed.erro.vazio"));
  nomes.forEach(function (n) { overrides.herois[n] = novos[n]; });
  salvarOverrides();
  atualizarRecomendacoes(ultimaLeitura || lerPartida(), true);
  return nomes;
}

function salvarOverrides() {
  ponteSalvar("du_counters_v1", JSON.stringify(overrides), function (ok) {
    if (!ok) log("não consegui salvar os counters editados (sem armazenamento): use Compartilhar para guardar o código.");
  });
}
function carregarOverrides() {
  ponteLer("du_counters_v1", function (ok, valor) {
    if (!ok || !valor) return;
    try {
      var o = JSON.parse(valor);
      if (o && o.herois) { overrides = o; log("counters editados carregados: " + Object.keys(o.herois).length + " heróis"); }
      if (ultimaLeitura) atualizarRecomendacoes(ultimaLeitura, true);
    } catch (e) { log("counters salvos inválidos: " + e); }
  });
}
