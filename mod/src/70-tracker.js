// ===================== Tracker (tecla configurável / botão no menu ESC) =====================
// Mostra, para cada jogador da partida: rank, heróis mais jogados, desempenho com o herói atual e
// se você já jogou com/contra ele (e o resultado). Dados: api.deadlock-api.com via ponte.
// Identificação dos jogadores: partida ao vivo pelo SEU id (CONFIG.accountId); quem não aparecer
// lá é procurado pelo nome do Steam (marcado como "por nome", pode errar).

var tracker = { aberto: false, painel: null, falhou: false, dados: null, carregando: false, selecionado: "", carregadoEm: -999 };

function montarTracker() {
  if (tracker.falhou || valido(tracker.painel)) return !tracker.falhou;
  tracker.painel = painelComLayout(hud, "DU_Tracker", "tracker");
  if (!tracker.painel) { tracker.falhou = true; log("tracker: layout não carregou"); return false; }
  tracker.painel.SetHasClass("DUTemaQol", ADDON_QOL); // no addon, as cores da janela do QOL Lock
  tracker.status = achar(tracker.painel, "DUTrackerStatus");
  tracker.amigos = achar(tracker.painel, "DUTrackerAmigos");
  tracker.inimigos = achar(tracker.painel, "DUTrackerInimigos");
  tracker.detalhe = achar(tracker.painel, "DUTrackerDetalhe");
  aoClicar(achar(tracker.painel, "DUTrackerFechar"), fecharTracker);
  aoClicar(achar(tracker.painel, "DUTrackerAtualizar"), function () { carregarTracker(true); });
  mostrarPainel(tracker.painel, false);
  return true;
}

// No hideout não há partida para mostrar (e o jogo esconde o HUD): não abre.
function abrirTracker() {
  if (!modLigado || estadoHud().hideout) return;
  if (!montarTracker()) return;
  cadaModulo("fechar"); // mapa
  try { $.DispatchEvent("CitadelResumePlaying"); } catch (e) {} // fecha o menu ESC, se aberto
  tracker.aberto = true;
  mostrarPainel(tracker.painel, true);
  comando("hud_free_cursor 1");
  som("UI.Shop.Mod.Starred.Click");
  desenharTracker();
  if (CONFIG.urlPonte && agoraSeg - tracker.carregadoEm > 60) carregarTracker(false);
}
function fecharTracker() {
  if (!tracker.aberto) return;
  tracker.aberto = false;
  mostrarPainel(tracker.painel, false);
  comando("hud_free_cursor -1");
}
function alternarTracker() { if (tracker.aberto) fecharTracker(); else abrirTracker(); }

function jogadoresDaPartida() {
  var l = ultimaLeitura || lerPartida();
  var lista = [];
  l.amigos.forEach(function (j) { lista.push({ nome: j.nomeJogador, heroi: j.heroi, time: "amigo" }); });
  l.inimigos.forEach(function (j) { lista.push({ nome: j.nomeJogador, heroi: j.heroi, time: "inimigo" }); });
  return lista;
}

function carregarTracker(forcar) {
  if (tracker.carregando && !forcar) return;
  var jogadores = jogadoresDaPartida();
  if (!jogadores.length) { tracker.dados = null; desenharTracker(); return; }
  tracker.carregando = true;
  tracker.carregadoEm = agoraSeg;
  desenharTracker();
  var args = jogadores.map(function (j) {
    return { nome: j.nome, classe: (dados.herois[j.heroi] || {}).classe || "", time: j.time };
  });
  ponteChamar("tracker", [CONFIG.accountId || 0, args], function (ok, texto) {
    tracker.carregando = false;
    if (!ok) { tracker.erro = texto; tracker.dados = null; log("tracker: " + texto); }
    else {
      try { tracker.dados = JSON.parse(texto); tracker.erro = ""; }
      catch (e) { tracker.erro = T("tr.respostaInvalida"); tracker.dados = null; }
    }
    desenharTracker();
  });
}

function infoDoJogador(j) {
  if (!tracker.dados) return null;
  var classe = (dados.herois[j.heroi] || {}).classe;
  return tracker.dados.jogadores.filter(function (x) { return x.classe === classe && x.time === j.time; })[0] || null;
}
function pct(v, t) { return t ? Math.round(100 * v / t) + "%" : "-"; }
function heroiDaClasse(c) { return classeParaHeroi[c] || c || "?"; }

// ---------- peças do desenho ----------
// Insígnia do rank, do próprio jogo: panorama/images/ranked/badges/rank<tier>/badge_<lg|sm>_subrank<1..6>.
// A ponte manda o nome em inglês ("Ritualist 3", nomes de /v1/assets/ranks); tier/sub numéricos, se vierem, valem mais.
var NOMES_RANK = ["Obscurus", "Initiate", "Seeker", "Acolyte", "Sentinel", "Mystic", "Ritualist", "Emissary", "Oracle", "Phantom", "Ascendant", "Eternus"];
function rankDe(info) {
  var tier = info && info.tier, sub = info && info.sub;
  if (tier == null) {
    var m = /^([A-Za-z]+)\s+(\d)$/.exec(String(info && info.rank || ""));
    if (m) { tier = NOMES_RANK.indexOf(m[1]); sub = Number(m[2]); }
  }
  return tier >= 0 ? { tier: tier, sub: sub || 0, nome: NOMES_RANK[tier] + (tier > 0 && sub ? " " + sub : "") } : null;
}
function insigniaRank(r, tamanho) {
  if (!r) return "";
  return "s2r://panorama/images/ranked/badges/rank" + r.tier + "/badge_" + tamanho + (r.tier > 0 && r.sub ? "_subrank" + r.sub : "") + "_psd.vtex";
}
// Barra de vitórias: verde acima de 55%, vermelha abaixo de 45%.
function barraVitorias(pai, v, t) {
  var b = criar("Panel", pai, "", "DUTrBarra");
  var f = t ? v / t : 0;
  var cheia = criar("Panel", b, "", "DUTrBarraCheia" + (!t ? "" : f >= 0.55 ? " DUTrBom" : f <= 0.45 ? " DUTrRuim" : " DUTrMedio"));
  try { cheia.style.width = Math.round(100 * f) + "%"; } catch (e) {}
  return b;
}
function cartaoTracker(pai, titulo, classes) {
  var c = criar("Panel", pai, "", "DUTrCartao " + (classes || ""));
  if (titulo) rotulo(c, "DUTrCartaoTitulo", esc(titulo));
  return c;
}

function desenharTracker() {
  if (!tracker.aberto || !valido(tracker.painel)) return;
  var jogadores = jogadoresDaPartida();
  var st = !jogadores.length ? T("tr.foraDePartida") :
    tracker.carregando ? T("tr.carregandoApi") :
    tracker.erro ? T("tr.erro", esc(tracker.erro)) :
    tracker.dados ? T("tr.origem", esc(origemTracker(tracker.dados.origem))) : "";
  if (!CONFIG.accountId) st += "  ·  " + T("tracker.semConta");
  if (!CONFIG.urlPonte) st = "<font color='#a03020'>" + T("tr.semPonte") + "</font>";
  tracker.status.text = st;

  [["amigo", tracker.amigos], ["inimigo", tracker.inimigos]].forEach(function (par) {
    var alvo = par[1];
    alvo.RemoveAndDeleteChildren();
    jogadores.filter(function (j) { return j.time === par[0]; }).forEach(function (j) {
      var info = infoDoJogador(j);
      var chave = j.time + "|" + j.heroi;
      var b = criar("Panel", alvo, "", "DUTrackerJogador" + (tracker.selecionado === chave ? " DUSelecionado" : "") + (par[0] === "inimigo" ? " DUInimigo" : ""));
      imagem(b, "DUTrackerFoto", imagemHeroi(j.heroi));
      var tx = criar("Panel", b, "", "DUTrackerTextos");
      rotulo(tx, "DUTrackerNome", esc(j.nome || j.heroi || "?"));
      var linha = criar("Panel", tx, "", "DUTrackerRankLinha");
      var r = info && info.id ? rankDe(info) : null;
      if (r) imagem(linha, "DUTrackerRankMini", insigniaRank(r, "sm"));
      rotulo(linha, "DUTrackerResumo", info && info.id ? esc(r ? r.nome : T("tr.semRank")) : tracker.carregando ? "…" : T("tr.semDados"));
      if (info && (info.contra || info.com)) rotulo(b, "DUTrackerHistorico" + (info.contra ? " DUTrContra" : " DUTrJunto"), T(info.contra ? "tr.jaEnfrentou" : "tr.jaJogouJunto"));
      if (info && info.id && info.partidas) {
        var vit = criar("Panel", b, "", "DUTrackerVitorias");
        rotulo(vit, "DUTrackerPct", pct(info.vitorias, info.partidas));
        barraVitorias(vit, info.vitorias, info.partidas);
      }
      aoClicar(b, function () { tracker.selecionado = chave; desenharTracker(); });
    });
  });
  desenharDetalheTracker(jogadores);
}

function desenharDetalheTracker(jogadores) {
  var d = tracker.detalhe;
  d.RemoveAndDeleteChildren();
  var j = jogadores.filter(function (x) { return x.time + "|" + x.heroi === tracker.selecionado; })[0];
  if (!j) { rotulo(d, "DUAbaVazio", T("tr.cliqueJogador")); return; }
  var info = infoDoJogador(j);
  var r = info && info.id ? rankDe(info) : null;
  // cabeçalho: retrato com a cor do time, nome, herói e a insígnia grande do rank
  var cab = criar("Panel", d, "", "DUTrackerDetCab" + (j.time === "inimigo" ? " DUInimigo" : ""));
  imagem(cab, "DUTrackerDetFoto", imagemHeroi(j.heroi));
  var tt = criar("Panel", cab, "", "DUTrackerDetTextos");
  rotulo(tt, "DUTrackerDetNome", esc(j.nome || "?"));
  rotulo(tt, "DUTrackerDetSub", esc(j.heroi) + (info && info.porNome ? "  ·  " + T("tr.porNome") : ""));
  if (r) {
    var rk = criar("Panel", cab, "", "DUTrackerDetRank");
    imagem(rk, "DUTrackerRankGrande", insigniaRank(r, "lg"));
    rotulo(rk, "DUTrackerRankNome", esc(r.nome));
  }
  if (!info || !info.id) { rotulo(d, "DUAbaVazio DUTrVazio", tracker.carregando ? T("tr.carregando") : T("tr.naoEncontrado")); return; }

  // números: partidas e vitórias no geral, e com o herói desta partida
  var nums = criar("Panel", d, "", "DUTrLinhaCartoes");
  var c1 = cartaoTracker(nums, T("tr.partidas"));
  rotulo(c1, "DUTrNumero", String(info.partidas || 0));
  rotulo(c1, "DUTrLegenda", esc(r ? r.nome : T("tr.semRank")));
  var c2 = cartaoTracker(nums, T("tr.vitoriasRotulo"));
  rotulo(c2, "DUTrNumero", pct(info.vitorias, info.partidas));
  barraVitorias(c2, info.vitorias, info.partidas);
  var c3 = cartaoTracker(nums, T("tr.com", j.heroi), "DUTrCartaoLargo");
  if (info.atual) {
    rotulo(c3, "DUTrNumero", pct(info.atual[1], info.atual[0]));
    barraVitorias(c3, info.atual[1], info.atual[0]);
    rotulo(c3, "DUTrLegenda", esc(T("tr.partidasN", info.atual[0])) + "  ·  " + esc(T("tr.media", info.atual[2], info.atual[3])));
  } else rotulo(c3, "DUTrLegenda", esc(T("tr.primeiraVez")));

  // heróis mais jogados
  if ((info.top || []).length) {
    rotulo(d, "DUTrSecao", esc(T("tr.maisJogados")));
    var tops = criar("Panel", d, "", "DUTrLinhaCartoes");
    info.top.forEach(function (t) {
      var h = heroiDaClasse(t[0]);
      var c = cartaoTracker(tops, "", "DUTrCartaoHeroi");
      imagem(c, "DUTrackerTopFoto", imagemHeroi(h));
      var tx = criar("Panel", c, "", "DUTrackerTopTextos");
      rotulo(tx, "DUTrackerTopNome", esc(h));
      rotulo(tx, "DUTrLegenda", esc(T("tr.partidasN", t[1])) + "  ·  " + pct(t[2], t[1]));
      barraVitorias(tx, t[2], t[1]);
    });
  }

  // histórico com você: contra e junto, com o placar de cada um
  rotulo(d, "DUTrSecao", esc(T("tr.historico")));
  var hist = criar("Panel", d, "", "DUTrLinhaCartoes");
  var euMesmo = CONFIG.accountId && info.id === CONFIG.accountId;
  if (euMesmo || !CONFIG.accountId || (!info.contra && !info.com)) {
    rotulo(cartaoTracker(hist, "", "DUTrCartaoLargo"), "DUTrLegenda", esc(euMesmo ? T("tr.ehVoce") : CONFIG.accountId ? T("tr.nunca") : T("tracker.semConta")));
    return;
  }
  [["contra", info.contra, "tr.contraVoceTit", "tr.contraVoce"], ["com", info.com, "tr.juntoTit", "tr.junto"]].forEach(function (x) {
    if (!x[1]) return;
    var c = cartaoTracker(hist, T(x[2]), "DUTrCartaoLargo DUTrHist_" + x[0]);
    rotulo(c, "DUTrNumero", esc(T("tr.placar", x[1][1], x[1][0] - x[1][1])));
    barraVitorias(c, x[1][1], x[1][0]);
    rotulo(c, "DUTrLegenda", esc(T(x[3], x[1][0], x[1][1], x[1][0] - x[1][1])));
  });
}

// Botões "Deadlock Utils" (central de configurações) e "Tracker" no menu ESC da partida, numa linha própria
// logo abaixo do "Comentários" (#SubOptions > .FeedbackRow). O menu é outro layout (hud_escape_menu.xml), e
// o CSS dele não vale para painéis criados por este script; por isso a linha vem de um layout do mod
// (menuesc.xml) que inclui esse CSS: os botões usam as classes do jogo e ficam iguais aos do menu (fonte,
// cores, hover e sons vêm do jogo).
var botaoEscPronto = false;
function montarBotaoEsc() {
  if (botaoEscPronto || !querBotaoEsc()) return; // com o QOL Lock, o addon fica numa aba da janela dele (02-compat.js)
  var menu = menuEsc();
  if (!menu) return;
  var sub = achar(menu, "SubOptions");
  if (!valido(sub)) return;
  var linha = painelComLayout(sub, "DULinhaMenuEsc", "menuesc");
  if (!linha) return;
  var comentarios = porClasse(sub, "FeedbackRow")[0];
  if (valido(comentarios)) { try { sub.MoveChildAfter(linha, comentarios); } catch (e) {} }
  [["DUBotaoCentral", abrirCentral], ["DUBotaoTracker", abrirTracker]].forEach(function (x) {
    var b = achar(linha, x[0]);
    if (!valido(b)) return;
    evento(b, "onactivate", function () {
      try { $.DispatchEvent("CitadelResumePlaying"); } catch (e) {} // fecha o menu ESC
      x[1]();
    });
  });
  botaoEscPronto = true;
  log("botões Deadlock Utils e Tracker adicionados ao menu ESC");
}

// A página da ponte (mod/pagina/ponte.html, publicada) responde a origem em português.
function origemTracker(o) {
  return o === "partida ao vivo" ? T("tr.origem.aoVivo") : o === "nenhuma" ? T("tr.origem.nenhuma") : o;
}
