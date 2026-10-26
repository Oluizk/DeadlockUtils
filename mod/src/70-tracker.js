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
  if (mapa.aberto) fecharMapa();
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
      rotulo(tx, "DUTrackerResumo", info && info.id ? esc(info.rank) + "  ·  " + T("tr.vitorias", pct(info.vitorias, info.partidas)) :
        tracker.carregando ? "…" : T("tr.semDados"));
      if (info && (info.contra || info.com)) rotulo(b, "DUTrackerHistorico", T(info.contra ? "tr.jaEnfrentou" : "tr.jaJogouJunto"));
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
  var cab = criar("Panel", d, "", "DUTrackerDetCab");
  imagem(cab, "DUTrackerDetFoto", imagemHeroi(j.heroi));
  var tt = criar("Panel", cab, "", "DUAbaCabTextos");
  rotulo(tt, "DUAbaTitulo", esc(j.nome || "?"));
  rotulo(tt, "DUAbaSub", esc(j.heroi) + (info && info.porNome ? "  ·  " + T("tr.porNome") : ""));
  if (!info || !info.id) { rotulo(d, "DUAbaVazio", tracker.carregando ? T("tr.carregando") : T("tr.naoEncontrado")); return; }

  function bloco(titulo, linhas) {
    rotulo(d, "DUAbaSecao", titulo);
    var caixa = criar("Panel", d, "", "DUTrackerBloco");
    linhas.forEach(function (l) { rotulo(caixa, "DUTrackerLinha", l); });
  }
  bloco(T("tr.rank"), ["<b>" + esc(info.rank) + "</b>", T("tr.partidasRegistradas", info.partidas, pct(info.vitorias, info.partidas))]);
  if (info.atual) bloco(esc(T("tr.com", j.heroi)), [T("tr.partidasVitorias", info.atual[0], pct(info.atual[1], info.atual[0])),
    T("tr.media", info.atual[2], info.atual[3])]);
  else bloco(esc(T("tr.com", j.heroi)), [T("tr.primeiraVez")]);
  rotulo(d, "DUAbaSecao", T("tr.maisJogados"));
  var tops = criar("Panel", d, "", "DUTrackerTops");
  (info.top || []).forEach(function (t) {
    var h = heroiDaClasse(t[0]);
    var c = criar("Panel", tops, "", "DUTrackerTop");
    imagem(c, "DUTrackerTopFoto", imagemHeroi(h));
    rotulo(c, "DUTrackerLinha", "<b>" + esc(h) + "</b><br>" + T("tr.partidasPct", t[1], pct(t[2], t[1])));
  });
  var hist = [];
  if (CONFIG.accountId && info.id === CONFIG.accountId) hist.push(T("tr.ehVoce"));
  else if (info.contra) hist.push(T("tr.contraVoce", info.contra[0], info.contra[1], info.contra[0] - info.contra[1]));
  if (info.com && !(CONFIG.accountId && info.id === CONFIG.accountId)) hist.push(T("tr.junto", info.com[0], info.com[1], info.com[0] - info.com[1]));
  if (!hist.length) hist.push(CONFIG.accountId ? T("tr.nunca") : T("tracker.semConta"));
  bloco(T("tr.historico"), hist);
}

// Botões "Deadlock Utils" (central de configurações) e "Tracker" no menu ESC da partida, numa linha própria
// logo abaixo do "Comentários" (#SubOptions > .FeedbackRow). O menu é outro layout (hud_escape_menu.xml), e
// o CSS dele não vale para painéis criados por este script; por isso a linha vem de um layout do mod
// (menuesc.xml) que inclui esse CSS: os botões usam as classes do jogo e ficam iguais aos do menu (fonte,
// cores, hover e sons vêm do jogo).
var botaoEscPronto = false;
function montarBotaoEsc() {
  if (botaoEscPronto) return;
  var menu = achar(hud, "EscapeMenu");
  if (!valido(menu)) return;
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
