// ===================== Timers dos objetivos: no placar do topo, no minimapa e no mapa M =====================
// Lê o estado dos objetivos na própria UI do jogo (nada de adivinhar quando dá para ver):
//   Buffs da ponte: no minimapa, cada local de buff é um .map_button.powerup_spawn que ganha a classe do
//     buff quando ele está lá (powerup_gun, powerup_casting, powerup_survival, powerup_movement, powerup_souls).
//     Sem buff na ponte, a contagem segue a tabela (ponteInicio / ponteIntervalo, ajustáveis).
//   Rejuvenator (chefe do meio): #TopBar #RejuvenatorTimer com midboss_cooldown / midboss_available /
//     has_rejuv e o texto do #MidbossTimerLabel (o próprio timer do jogo); no minimapa .mid_boss.midboss_spawned.
//   Urna: .map_button.idol_spawn no minimapa = disponível; jogador com .PlayerIsHoldingIdol = alguém está
//     carregando (friend/enemy diz de qual time). Depois de entregue, conta urnaIntervalo (estimativa "~").
//   Fenda (koth): .map_button.capture_point (com koth_warning = vai abrir em 20 s) e #KothCashInMeter.
//   Almas: #TeamScoreFriendly / #TeamScoreEnemy .ScoreLabel (total de almas de cada time).
// Onde aparece:
//   Placar do topo: colunas #DUUrna e #DUPonte do lado do timer do Rejuvenator e #DUVantagemEsq/Dir ao lado
//     do número de almas. Esses painéis são do layout do jogo alterado no build (mod/jogo/citadel_hud_top_bar.xml)
//     e desenhados pelo CSS do jogo + mod/jogo/topo.css; aqui só se trocam classes e textos.
//   Minimapa: o tempo do buff em cima de cada ponte, só na visão detalhada (Tab ou mapa M), como o timer do
//     chefe do meio do próprio jogo.
//   Mapa M: lista no painel lateral (50-mapa.js); clicar manda o tempo no chat do time (say_team).

var timers = { estados: null, urnaEmJogo: false, urnaFimEm: null, fendaAvisoDesde: null, alertou: {}, ultimoChat: 0, logEm: -999,
  topo: {}, raiz: {}, mini: { painel: null, itens: [], tam: 0, chave: "" } };
var TIMERS_ORDEM = ["relogio", "ponte", "rejuv", "urna", "fenda", "almas"];
var ICONE_TIMER = {
  relogio: "icons/icon_watch.vsvg", ponte: "hud/icons/powerup_gun.vsvg", rejuv: "hud/icons/rejuvenator.vsvg",
  urna: "minimap/soul_jar_marker_psd.vtex", fenda: "minimap/minimap_icon_koth.vsvg", almas: "hud/icons/icon_souls.vsvg",
};
var BUFFS_PONTE = {
  powerup_gun: { icone: "hud/icons/powerup_gun.vsvg" },
  powerup_casting: { icone: "hud/icons/powerup_spirit.vsvg" },
  powerup_survival: { icone: "hud/icons/powerup_survival.vsvg" },
  powerup_movement: { icone: "hud/icons/powerup_movement.vsvg" },
  powerup_souls: { icone: "minimap/powerup_souls_png.vtex" },
};
var COR_NOS = "#7DDB5A", COR_ELES = "#FF5656";

// ---------- leitura ----------
function contagemRejuv(p) {
  for (var n = 4; n >= 1; n--) if (temClasse(p, "RejuvCount_" + n)) return n;
  return 0;
}
// Número do time (1 ou 2) marcado com team1/team2 no próprio painel; 0 = sem marca. Ancestrais não contam:
// uma marca na raiz do placar seria a do jogador local e casaria com as duas caixas.
function timeDoPainel(p) {
  for (var t = 1; t <= 2; t++) if (temClasse(p, "team" + t)) return t;
  return 0;
}
// O seu time é o da caixa de almas da esquerda (#TeamScoreFriendly) ou da direita? O CSS do jogo põe
// team1/team2 no contêiner do time (CitadelHudTopBarTeam) e nas caixas de almas: compara os dois. Sem
// essas marcas, a caixa da esquerda é a do contêiner #TeamFriendly (10-leitura.js descobre em qual você está).
function meuLadoEsquerdo(l) {
  var tb = topBar();
  var meu = timeDoPainel(achar(tb, l.meuTime)) || (l.meuCartao ? timeDoPainel(l.meuCartao.painel) : 0);
  var caixa = timeDoPainel(achar(tb, "TeamScoreFriendly"));
  if (meu && caixa) return meu === caixa;
  return l.meuTime !== "TeamEnemy";
}
function lerObjetivos(l) {
  var tb = topBar(), mm = minimapa(), s = l.segundos, o = { seg: s };
  var esquerda = meuLadoEsquerdo(l);
  // buffs da ponte
  var buffs = [];
  porClasse(mm, "powerup_spawn").forEach(function (p) {
    Object.keys(BUFFS_PONTE).forEach(function (k) { if (temClasse(p, k)) buffs.push(k); });
  });
  o.ponte = { buffs: buffs };
  // rejuvenator
  var rt = achar(tb, "RejuvenatorTimer"), mb = porClasse(mm, "mid_boss")[0];
  var nos = contagemRejuv(achar(tb, "RejuvenatorFriendly")), eles = contagemRejuv(achar(tb, "RejuvenatorEnemy"));
  if (!esquerda) { var t = nos; nos = eles; eles = t; }
  o.rejuv = {
    vivo: temClasse(rt, "midboss_available") || temClasse(mb, "midboss_spawned"),
    recarga: temClasse(rt, "midboss_cooldown"),
    buff: temClasse(rt, "has_rejuv"),
    texto: normalizar(textoDe(achar(tb, "MidbossTimerLabel"))) || normalizar(textoDe(porClasse(mb, "midboss_timer")[0])),
    nos: nos, eles: eles,
  };
  // urna
  var portador = botoesMapa("PlayerIsHoldingIdol")[0]; // os heróis podem estar na camada do mod (50-mapa.js)
  o.urna = { disponivel: porClasse(mm, "idol_spawn").length > 0, com: portador ? (temClasse(portador, "enemy") ? "eles" : "nos") : "" };
  var emJogo = o.urna.disponivel || !!portador;
  if (timers.urnaEmJogo && !emJogo && s != null) timers.urnaFimEm = s; // entregue (ou sumiu): conta o intervalo
  timers.urnaEmJogo = emJogo;
  // fenda
  var cp = porClasse(mm, "capture_point")[0], koth = achar(tb, "KothCashInMeter");
  var aviso = temClasse(cp, "koth_warning");
  if (aviso && timers.fendaAvisoDesde == null) timers.fendaAvisoDesde = s;
  if (!aviso) timers.fendaAvisoDesde = null;
  var progresso = [achar(koth, "KothCashInTeamLabel1"), achar(koth, "KothCashInTeamLabel2")].map(function (x) { return numeroDe(textoDe(x)); })
    .filter(function (n) { return !isNaN(n); });
  // koth_enabled fica ligado a partida inteira e o ponto existe no minimapa desde o começo: "ativa" só com
  // o medidor do jogo em disputa (as mesmas classes que fazem ele aparecer, citadel_hud_koth.css).
  var disputa = ["capturing", "contested", "captured"].some(function (c) { return temClasse(koth, c); });
  o.fenda = { aviso: aviso, ativa: !aviso && disputa, progresso: progresso.length ? Math.max.apply(null, progresso) : null };
  // almas dos times
  var a = lerAlmas(textoDe(porClasse(achar(tb, "TeamScoreFriendly"), "ScoreLabel")[0]));
  var b = lerAlmas(textoDe(porClasse(achar(tb, "TeamScoreEnemy"), "ScoreLabel")[0]));
  o.almas = esquerda ? { nos: a, eles: b, esquerda: true } : { nos: b, eles: a, esquerda: false };
  return o;
}

function proximaUrna(s) {
  if (s == null) return null;
  var ini = ajustes.urnaInicio, iv = ajustes.urnaIntervalo;
  if (timers.urnaFimEm != null) { var r = timers.urnaFimEm + iv - s; if (r > 0) return r; }
  if (s < ini) return ini - s;
  return iv - ((s - ini) % iv);
}
function fmtAlmas(n) {
  if (n < 1000) return String(Math.round(n));
  var k = (Math.round(n / 100) / 10).toFixed(1);
  return (IDIOMA === "en" ? k : k.replace(".", ",")) + "k";
}

// Texto, cor e contagem de cada timer (para o painel do mapa e o chat). restante = segundos até acontecer.
function estadosTimers(o) {
  var s = o.seg, e = {};
  e.relogio = { valor: relogio(s) };
  if (o.ponte.buffs.length) {
    e.ponte = { valor: T("tm.naPonte"), cor: "#5FE69E", icone: BUFFS_PONTE[o.ponte.buffs[0]].icone, disponivel: true,
      detalhe: o.ponte.buffs.length > 1 ? "x" + o.ponte.buffs.length : "", chat: T("tm.chat.ponteAgora") };
  } else {
    var rp = proximoBuffPonte(s);
    e.ponte = { valor: rp == null ? "-" : relogio(rp), restante: rp, chat: rp == null ? "" : T("tm.chat.ponte", relogio(rp)) };
  }
  var rj = o.rejuv;
  var lado = rj.nos > rj.eles ? "nos" : rj.eles > rj.nos ? "eles" : "";
  var detalheRejuv = rj.nos || rj.eles ? rj.nos + ":" + rj.eles : "";
  if (rj.vivo) e.rejuv = { valor: T("tm.vivo"), cor: "#5FE69E", detalhe: detalheRejuv, chat: T("tm.chat.rejuvVivo") };
  else if (rj.buff) e.rejuv = { valor: rj.texto || T("tm.ativo"), nome: T("tm.rejuvBuff"), detalhe: detalheRejuv,
    cor: lado === "nos" ? COR_NOS : lado === "eles" ? COR_ELES : "", chat: T(lado === "eles" ? "tm.chat.rejuvDeles" : "tm.chat.rejuvNosso", rj.texto || "") };
  else if (rj.texto && rj.texto !== "0:00") e.rejuv = { valor: rj.texto, restante: segundosDoRelogio(rj.texto), detalhe: detalheRejuv, chat: T("tm.chat.rejuv", rj.texto) };
  else e.rejuv = { valor: "-", detalhe: detalheRejuv };
  var u = o.urna;
  if (u.com) e.urna = { valor: T(u.com === "nos" ? "tm.urnaNos" : "tm.urnaEles"), cor: u.com === "nos" ? COR_NOS : COR_ELES, com: u.com,
    chat: T(u.com === "nos" ? "tm.chat.urnaNos" : "tm.chat.urnaEles") };
  else if (u.disponivel) e.urna = { valor: T("tm.disponivel"), cor: "#5FE69E", disponivel: true, chat: T("tm.chat.urnaAgora") };
  else {
    var ru = proximaUrna(s);
    // estimativa (o jogo não mostra quando a próxima urna sai): marcada ao lado, não com "~", que na fonte
    // do jogo parece um sinal de menos
    e.urna = { valor: ru == null ? "-" : relogio(ru), curto: ru == null ? "" : relogio(ru), detalhe: ru == null ? "" : T("tm.estimativa"),
      restante: ru, chat: ru == null ? "" : T("tm.chat.urna", relogio(ru)) };
  }
  var f = o.fenda;
  if (f.aviso) {
    var rf = Math.max(0, 20 - (s - (timers.fendaAvisoDesde == null ? s : timers.fendaAvisoDesde)));
    e.fenda = { valor: relogio(rf), restante: rf, cor: "#CE90FF", chat: T("tm.chat.fenda", relogio(rf)) };
  } else if (f.ativa) e.fenda = { valor: f.progresso != null ? f.progresso + "%" : T("tm.ativa"), cor: "#CE90FF", chat: T("tm.chat.fendaAtiva") };
  else e.fenda = { oculto: true };
  var a = o.almas;
  if (a.nos != null && a.eles != null && (a.nos > 0 || a.eles > 0)) {
    var d = a.nos - a.eles, pc = Math.round(100 * Math.abs(d) / Math.max(1, Math.min(a.nos, a.eles)));
    e.almas = { valor: (d >= 0 ? "+" : "-") + fmtAlmas(Math.abs(d)), detalhe: pc + "%", pct: pc, diferenca: d, esquerda: a.esquerda,
      cor: Math.abs(d) < 1000 ? "" : d > 0 ? COR_NOS : COR_ELES,
      chat: T(d >= 0 ? "tm.chat.almasFrente" : "tm.chat.almasAtras", fmtAlmas(Math.abs(d)), pc + "%") };
  } else e.almas = { oculto: true };
  return e;
}

// Alerta: perto de acontecer (o placar acende o tempo; som uma vez por ciclo, se ligado).
function alertasTimers(est) {
  var lim = ajustes.timersAlerta;
  ["ponte", "rejuv", "urna", "fenda"].forEach(function (id) {
    var e = est[id];
    var em = !!(lim && e && e.restante != null && e.restante > 0 && e.restante <= lim);
    if (e) e.alerta = em;
    if (em && !timers.alertou[id]) {
      timers.alertou[id] = true;
      if (ajustes.timersSom) som("UI.Quickbuy.DragDrop");
    }
    if (!em) timers.alertou[id] = false;
  });
}

function anunciarTimer(id) {
  if (!ajustes.timersChat) return;
  var e = timers.estados && timers.estados[id];
  if (!e || !e.chat || Date.now() - timers.ultimoChat < 2500) return;
  timers.ultimoChat = Date.now();
  comando("say_team " + String(e.chat).replace(/[;"]/g, ""));
  som("UI.Button.Press");
}

// ---------- placar do topo ----------
function painelTopo(id) {
  var p = timers.topo[id];
  if (!valido(p)) { p = achar(topBar(), id); timers.topo[id] = p; }
  return valido(p) ? p : null;
}
// Classe na raiz do HUD, só quando muda.
function classeRaiz(c, on) {
  on = !!on;
  if (timers.raiz[c] === on) return;
  timers.raiz[c] = on;
  hud.SetHasClass(c, on);
}
function classesObjetivo(p, quais) {
  ["DUObjContando", "DUObjDisponivel", "DUObjAlerta", "DUUrnaNos", "DUUrnaEles"].forEach(function (c) { p.SetHasClass(c, quais.indexOf(c) >= 0); });
}
function desenharTopo(est, ativa) {
  classeRaiz("DU_tUrna", ativa && ajustes.tUrna && !!est);
  classeRaiz("DU_tPonte", ativa && ajustes.tPonte && !!est);
  classeRaiz("DU_tAlmas", ativa && ajustes.tAlmas && !!est);
  if (!ativa || !est) return;
  var urna = painelTopo("DUUrna"), ponte = painelTopo("DUPonte");
  if (!urna && !ponte && !timers.avisouLayout) {
    timers.avisouLayout = true;
    log("placar do topo sem os painéis do mod: outro mod substitui citadel_hud_top_bar? (timers do placar desligados)");
  }
  if (urna) {
    var u = est.urna;
    classesObjetivo(urna, u.com ? [u.com === "nos" ? "DUUrnaNos" : "DUUrnaEles"] : u.disponivel ? ["DUObjDisponivel"] :
      u.restante != null ? ["DUObjContando"].concat(u.alerta ? ["DUObjAlerta"] : []) : []);
    textoTopo(urna, u.curto || "");
  }
  if (ponte) {
    var p = est.ponte, tipo = timers.ultimoBuff || "powerup_gun";
    if (p.disponivel && timers.estadosObj) tipo = timers.estadosObj.ponte.buffs[0];
    timers.ultimoBuff = tipo;
    Object.keys(BUFFS_PONTE).forEach(function (k) { ponte.SetHasClass("DUBuff_" + k, k === tipo); });
    classesObjetivo(ponte, p.disponivel ? ["DUObjDisponivel"] : p.restante != null ? ["DUObjContando"].concat(p.alerta ? ["DUObjAlerta"] : []) : []);
    textoTopo(ponte, p.disponivel ? "" : p.valor);
  }
  // vantagem de almas: do lado do time que está na frente (a partir de 3%)
  var a = est.almas, esq = painelTopo("DUVantagemEsq"), dir = painelTopo("DUVantagemDir");
  [esq, dir].forEach(function (lb, i) {
    if (!lb) return;
    var ladoEsq = i === 0;
    var frente = a && !a.oculto && a.pct >= 3 && ((a.diferenca > 0) === (a.esquerda === ladoEsq));
    lb.SetHasClass("DUVisivel", !!frente);
    if (!frente) return;
    var nos = a.diferenca > 0;
    lb.SetHasClass("DUVantagemNos", nos);
    lb.SetHasClass("DUVantagemEles", !nos);
    var txt = "+" + a.pct + "%";
    if (lb.text !== txt) lb.text = txt;
  });
}
function textoTopo(p, t) {
  var lb = porClasse(p, "DUObjTempo")[0];
  if (lb && lb.text !== (t || " ")) lb.text = t || " ";
}

// ---------- minimapa: tempo do buff em cima de cada ponte ----------
var PONTOS_PONTE = ((DADOS_MAPA.camadas.filter(function (c) { return c.id === "ponte"; })[0] || {}).pontos) || [];
function desenharMiniTimers(est, e) {
  var mm = minimapa();
  var detalhe = mapa.aberto || (e && e.placarAberto);
  var mostrar = !!(ajustes.tMinimapa && est && detalhe && !est.ponte.disponivel && est.ponte.restante != null && PONTOS_PONTE.length && valido(mm));
  if (!mostrar) { if (valido(timers.mini.painel)) mostrarPainel(timers.mini.painel, false); return; }
  var m = timers.mini;
  var pai = null;
  try { pai = valido(m.painel) ? m.painel.GetParent() : null; } catch (err) {}
  if (!valido(m.painel) || pai !== mm) {
    m.painel = painelComLayout(mm, "DU_MiniTimers", "minitimers");
    m.itens = [];
    m.tam = 0;
    if (!m.painel) return;
    PONTOS_PONTE.forEach(function () { m.itens.push(rotulo(m.painel, "DUMiniTimer", "")); });
  }
  mostrarPainel(m.painel, true);
  m.painel.SetHasClass("DUInvertido", temClasse(mm, "invert_map"));
  m.painel.SetHasClass("DUMiniTimerAlerta", !!est.ponte.alerta);
  var tam = tamanhoMinimapa(mm);
  var texto = est.ponte.valor;
  m.itens.forEach(function (lb, i) {
    if (lb.text !== texto) lb.text = texto;
    if (tam === m.tam) return;
    try { lb.style.position = Math.round(PONTOS_PONTE[i][0] * tam - 40) + "px " + Math.round(PONTOS_PONTE[i][1] * tam + 12) + "px 0px"; } catch (err) {}
  });
  m.tam = tam;
}

// ---------- ciclos ----------
// Loop lento (1 s): lê e calcula; o placar e o mapa são redesenhados com o resultado.
function atualizarTimers(l) {
  if (!modLigado || !l.ativa || l.segundos == null) { timers.estados = null; timers.estadosObj = null; desenharTopo(null, false); return; }
  var o = lerObjetivos(l);
  timers.estadosObj = o;
  timers.estados = estadosTimers(o);
  alertasTimers(timers.estados);
  logObjetivos(o);
  desenharTopo(timers.estados, true);
}
// Loop rápido: o minimapa muda de tamanho com Tab e com o mapa M.
function vigiarTimers(e) {
  desenharMiniTimers(modLigado && e.ativa ? timers.estados : null, e);
}
function esconderTimers() {
  timers.estados = null;
  timers.estadosObj = null;
  desenharTopo(null, false);
  if (valido(timers.mini.painel)) mostrarPainel(timers.mini.painel, false);
}

// Uma linha por minuto no console (F7) com o que foi lido, para conferir no jogo.
function logObjetivos(o) {
  if (agoraSeg - timers.logEm < 60) return;
  timers.logEm = agoraSeg;
  log("objetivos: ponte=[" + o.ponte.buffs.join(",") + "] rejuv=" + (o.rejuv.vivo ? "vivo" : o.rejuv.recarga ? "recarga" : o.rejuv.buff ? "buff" : "-") +
    " '" + o.rejuv.texto + "' " + o.rejuv.nos + ":" + o.rejuv.eles + " urna=" + (o.urna.com || (o.urna.disponivel ? "disponivel" : "-")) +
    " fenda=" + (o.fenda.aviso ? "aviso" : o.fenda.ativa ? "ativa" : "-") + " almas=" + o.almas.nos + "/" + o.almas.eles +
    " meuLado=" + (o.almas.esquerda ? "esq" : "dir") + " placarMod=" + !!painelTopo("DUPonte"));
}
