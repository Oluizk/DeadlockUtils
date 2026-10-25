// ===================== Principal: teclas, loops, liga/desliga =====================
// Dois loops:
//   rápido (50 ms) — só checagens baratas de classe: Tab (fileira aparece na hora), ESC (fecha mapa e
//                    tracker), loja abrindo (fecha mapa), aba da loja.
//   lento (1 s)    — leitura do placar e recomendações (o trabalho pesado).

var modLigado = true;

// ---------- teclas ($.RegisterKeyBind: o jogo entrega a tecla direto ao script) ----------
// Registramos no HUD e no escopo global; o "debounce" evita que a mesma tecla dispare duas vezes.
var ultimaTecla = {};
function teclaUnica(nome, fn) {
  return function () {
    var agora = Date.now();
    if (ultimaTecla[nome] && agora - ultimaTecla[nome] < 250) return;
    ultimaTecla[nome] = agora;
    try { fn(); } catch (e) { log("tecla " + nome + ": " + e); }
  };
}
function registrarTeclas() {
  if (typeof $.RegisterKeyBind !== "function") { log("atalhos: $.RegisterKeyBind indisponível"); return; }
  var teclas = CONFIG.teclas || {};
  [["mapa", function () { if (modLigado) alternarMapa(); }],
   ["tracker", function () { if (modLigado) alternarTracker(); }],
   ["desligar", alternarMod]].forEach(function (par) {
    var t = teclas[par[0]];
    if (!t) return;
    var chave = "key_" + String(t).toLowerCase();
    var fn = teclaUnica(par[0], par[1]);
    try { $.RegisterKeyBind(hud, chave, fn); } catch (e) { log("RegisterKeyBind(hud, " + chave + "): " + e); }
    try { $.RegisterKeyBind("", chave, fn); } catch (e) { log("RegisterKeyBind('', " + chave + "): " + e); }
  });
}

// ---------- liga/desliga (F8) ----------
function esconderTudo() {
  fecharMapa();
  fecharTracker();
  if (loja.ativa) ativarAba(false);
  devolverNativos();
  esconderDica();
  limparMarcas();
  [faixa.painel, aviso.painel, loja.botao].forEach(function (p) { mostrarPainel(p, false); });
  faixa.visivel = false;
}
function alternarMod() {
  modLigado = !modLigado;
  if (!modLigado) esconderTudo();
  else { mostrarPainel(loja.botao, true); assinaturaAnterior = ""; }
  mostrarAvisoTexto(modLigado ? "Deadlock Utils <b>ligado</b>" : "Deadlock Utils <b>desligado</b>",
    "Aperte " + ((CONFIG.teclas || {}).desligar || "F8") + " para " + (modLigado ? "desligar" : "ligar") + ".", true);
  log("mod " + (modLigado ? "ligado" : "desligado"));
}

// ---------- loop rápido ----------
var rapido = { esc: false };
function estadoRapido() {
  var tb = topBar();
  if (!valido(rapido.escMenu)) rapido.escMenu = achar(hud, "EscapeMenu");
  var esc = temClasse(hud, "ShowEscapeMenu");
  if (!esc && valido(rapido.escMenu)) { try { esc = rapido.escMenu.BAscendantHasClass("ShowEscapeMenu"); } catch (e) {} }
  var e = { lojaAberta: temClasse(tb, "gShopOpen"), placarAberto: temClasse(tb, "gScoreboardOpen"), escAberto: esc, escAbriu: esc && !rapido.esc };
  rapido.esc = esc;
  return e;
}
var ultimaVarreduraLoja = 0;
function verificarRapido() {
  if (!modLigado) return;
  try {
    var e = estadoRapido();
    if (e.escAbriu) { fecharMapa(); fecharTracker(); } // anti-bug: ESC sempre fecha mapa e tracker
    vigiarMapa(e);
    atualizarVisibilidadeFaixa(e);
    vigiarAbaLoja(e);
    // Nada nosso por cima de mapa/tracker/menu ESC.
    if ((e.escAberto || mapa.aberto || tracker.aberto) && valido(aviso.painel)) mostrarPainel(aviso.painel, false);
    // Loja aberta: as abas trocam os painéis nativos; varre a cada 2s para saber o que dá para comprar/já tem.
    if (e.lojaAberta && Date.now() - ultimaVarreduraLoja > 2000) {
      ultimaVarreduraLoja = Date.now();
      varrerNativos("sempre");
    }
  } catch (err) { ultimoErro = String(err); }
}
function loopRapido() {
  verificarRapido();
  $.Schedule(0.05, loopRapido);
}
// O jogo avisa na hora quando o placar (Tab) abre/fecha: não espera o próximo ciclo do loop.
aoEvento("CitadelScoreboardToggle", function () { $.Schedule(0, verificarRapido); });

// ---------- loop lento ----------
var ultimoErro = "";
var ultimosSegundos = null;
var diagnosticoFeito = false;
var ultimoLogDesconhecidos = "";
function tick() {
  try {
    agoraSeg += 1;
    if (modLigado) {
      var l = lerPartida();
      // Partida nova (relógio voltou): esquece itens e heróis da partida anterior.
      if (l.segundos != null && ultimosSegundos != null && l.segundos + 60 < ultimosSegundos) {
        esquecerPossuidos();
        limparMarcas();
        cacheLeitura.jogadores = [];
        aviso.vistos = {};
        log("partida nova detectada");
      }
      if (l.segundos != null) ultimosSegundos = l.segundos;
      l.meusItens.forEach(marcarPossuido);
      atualizarRecomendacoes(l, false);
      if (!valido(loja.botao)) montarAbaLoja();
      montarFaixa();
      atualizarPainelMapa(l);
      tickAviso();
      montarBotaoEsc();
      if (tracker.aberto && agoraSeg % 5 === 0) desenharTracker();
      if (l.emPartida && !diagnosticoFeito) { diagnosticoFeito = true; diagnosticoLeitura(); }
      var desc = Object.keys(desconhecidos).sort().join(", ");
      if (desc && desc !== ultimoLogDesconhecidos) { ultimoLogDesconhecidos = desc; log("ícones sem item mapeado: " + desc); }
      mostrarDiagnosticoNaTela(l);
    }
  } catch (e) {
    ultimoErro = String(e);
    log("erro: " + e + (e && e.stack ? "\n" + e.stack : ""));
  }
  $.Schedule(1.0, tick);
}

// Se a partida está rolando mas a leitura falhou, a fileira do Tab mostra o motivo (para depurar por print).
function mostrarDiagnosticoNaTela(l) {
  if (!valido(faixa.motivo)) return;
  var problema = l.emPartida && (!l.eu || !l.inimigos.length) || ultimoErro;
  mostrarPainel(faixa.motivo, !!problema);
  if (!problema) return;
  faixa.motivo.text = "<font color='#e0a060'>DIAGNÓSTICO v" + DU_DATA.versao + "</font> eu=" + esc(l.eu || "?") +
    " · meu time=" + l.meuTime + " · aliados=" + l.amigos.length + " inimigos=" + l.inimigos.length +
    " · " + esc(resumoNativos()) +
    (ultimoErro ? "<br><font color='#e04848'>erro: " + esc(ultimoErro) + "</font>" : "");
}

function diagnosticoInicial() {
  log("carregado v" + DU_DATA.versao + " (jogo " + DU_DATA.versaoJogo + ") — " + dados.itens.length + " itens, " +
    dados.regras.length + " regras, builds de " + Object.keys(dados.builds).length + " heróis, conta=" + (CONFIG.accountId || "não configurada") +
    ", ponte=" + (CONFIG.urlPonte || "não configurada"));
}

diagnosticoInicial();
registrarTeclas();
if (CONFIG.urlPonte) { iniciarPonte(); aoPontePronta(carregarOverrides); }
$.Schedule(1.0, tick);
$.Schedule(1.0, loopRapido);
