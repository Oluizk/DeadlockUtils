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

function abrirTracker() {
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
      catch (e) { tracker.erro = "resposta inválida"; tracker.dados = null; }
    }
    desenharTracker();
  });
}

function infoDoJogador(j) {
  if (!tracker.dados) return null;
  var classe = (dados.herois[j.heroi] || {}).classe;
  return tracker.dados.jogadores.filter(function (x) { return x.classe === classe && x.time === j.time; })[0] || null;
}
function pct(v, t) { return t ? Math.round(100 * v / t) + "%" : "—"; }
function heroiDaClasse(c) { return classeParaHeroi[c] || c || "?"; }

function desenharTracker() {
  if (!tracker.aberto || !valido(tracker.painel)) return;
  var jogadores = jogadoresDaPartida();
  var st = !jogadores.length ? "Abra o tracker durante uma partida." :
    tracker.carregando ? "Carregando dados do deadlock-api.com…" :
    tracker.erro ? "Não consegui carregar: " + esc(tracker.erro) :
    tracker.dados ? "Jogadores identificados por: " + esc(tracker.dados.origem) : "";
  if (!CONFIG.accountId) st += "  ·  Seu id Steam não está configurado (veja o README).";
  if (!CONFIG.urlPonte) st = "<font color='#a03020'><b>Tracker desligado:</b> o navegador do jogo só abre páginas HTTPS, e a página da ponte " +
    "(mod/pagina/ponte.html) ainda não foi publicada. Veja \"Ativar o tracker\" no README.</font>";
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
      rotulo(tx, "DUTrackerResumo", info && info.id ? esc(info.rank) + "  ·  " + pct(info.vitorias, info.partidas) + " vitórias" :
        tracker.carregando ? "…" : "sem dados");
      if (info && (info.contra || info.com)) rotulo(b, "DUTrackerHistorico", info.contra ? "JÁ ENFRENTOU" : "JÁ JOGOU JUNTO");
      aoClicar(b, function () { tracker.selecionado = chave; desenharTracker(); });
    });
  });
  desenharDetalheTracker(jogadores);
}

function desenharDetalheTracker(jogadores) {
  var d = tracker.detalhe;
  d.RemoveAndDeleteChildren();
  var j = jogadores.filter(function (x) { return x.time + "|" + x.heroi === tracker.selecionado; })[0];
  if (!j) { rotulo(d, "DUAbaVazio", "Clique num jogador para ver os detalhes."); return; }
  var info = infoDoJogador(j);
  var cab = criar("Panel", d, "", "DUTrackerDetCab");
  imagem(cab, "DUTrackerDetFoto", imagemHeroi(j.heroi));
  var tt = criar("Panel", cab, "", "DUAbaCabTextos");
  rotulo(tt, "DUAbaTitulo", esc(j.nome || "?"));
  rotulo(tt, "DUAbaSub", esc(j.heroi) + (info && info.porNome ? "  ·  identificado pelo nome (pode estar errado)" : ""));
  if (!info || !info.id) { rotulo(d, "DUAbaVazio", tracker.carregando ? "Carregando…" : "Jogador não encontrado no deadlock-api.com (perfil privado ou sem partidas registradas)."); return; }

  function bloco(titulo, linhas) {
    rotulo(d, "DUAbaSecao", titulo);
    var caixa = criar("Panel", d, "", "DUTrackerBloco");
    linhas.forEach(function (l) { rotulo(caixa, "DUTrackerLinha", l); });
  }
  bloco("Rank", ["<b>" + esc(info.rank) + "</b>", info.partidas + " partidas registradas · " + pct(info.vitorias, info.partidas) + " de vitórias"]);
  if (info.atual) bloco("Com " + esc(j.heroi), [info.atual[0] + " partidas · " + pct(info.atual[1], info.atual[0]) + " de vitórias",
    "Média de " + info.atual[2] + " abates / " + info.atual[3] + " mortes por partida"]);
  else bloco("Com " + esc(j.heroi), ["Primeira vez (ou poucas) com esse herói."]);
  rotulo(d, "DUAbaSecao", "Heróis mais jogados");
  var tops = criar("Panel", d, "", "DUTrackerTops");
  (info.top || []).forEach(function (t) {
    var h = heroiDaClasse(t[0]);
    var c = criar("Panel", tops, "", "DUTrackerTop");
    imagem(c, "DUTrackerTopFoto", imagemHeroi(h));
    rotulo(c, "DUTrackerLinha", "<b>" + esc(h) + "</b><br>" + t[1] + " partidas · " + pct(t[2], t[1]));
  });
  var hist = [];
  if (CONFIG.accountId && info.id === CONFIG.accountId) hist.push("Este é você.");
  else if (info.contra) hist.push("Contra você: " + info.contra[0] + " partida(s) — você venceu " + info.contra[1] + " e perdeu " + (info.contra[0] - info.contra[1]) + ".");
  if (info.com && !(CONFIG.accountId && info.id === CONFIG.accountId)) hist.push("Junto com você: " + info.com[0] + " partida(s) — venceram " + info.com[1] + " e perderam " + (info.com[0] - info.com[1]) + ".");
  if (!hist.length) hist.push(CONFIG.accountId ? "Vocês nunca se encontraram (nas partidas registradas)." : "Configure seu id Steam para ver o histórico com este jogador.");
  bloco("Histórico com você", hist);
}

// Botão "Tracker" no menu ESC da partida (usa as classes do próprio menu, então fica com o visual do jogo).
// Fica na linha do "Comentários" (#SubOptions > .FeedbackRow), como item "minor" do próprio menu.
var botaoEscPronto = false;
function montarBotaoEsc() {
  if (botaoEscPronto) return;
  var menu = achar(hud, "EscapeMenu");
  if (!valido(menu)) return;
  if (valido(achar(menu, "DUBotaoTracker"))) { botaoEscPronto = true; return; }
  var linha = porClasse(achar(menu, "SubOptions"), "FeedbackRow")[0] || achar(menu, "SubOptions");
  if (!valido(linha)) return;
  var b = criar("Button", linha, "DUBotaoTracker", "nav_menu_item minor");
  if (!b) return;
  rotulo(b, "menuButtonLabel", "Tracker");
  aoClicar(b, abrirTracker);
  botaoEscPronto = true;
  log("botão Tracker adicionado ao menu ESC");
}
