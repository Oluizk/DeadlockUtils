// ===================== Principal: teclas, loops, liga/desliga =====================
// Dois loops:
//   rápido (50 ms), só checagens baratas de classe: estado do jogo, Tab (fileira aparece na hora), ESC e
//                    loja (fecham mapa, tracker e central), mira, barra de vida, placar do topo, minimapa.
//   lento (1 s), leitura do placar, recomendações e timers dos objetivos (o trabalho pesado).

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
// As teclas podem mudar na tela de configurações. O jogo não deixa desregistrar uma tecla, então cada
// tecla registrada pergunta, na hora, qual ação está com ela agora (ajustes.teclas).
// Com a central aberta, as teclas de mapa e tracker não fazem nada (podem ser letras digitadas na pesquisa).
// As teclas dos módulos opcionais (o mapa, M) vêm do registro deles (00-base.js).
var ACOES_TECLA = {
  tracker: function () { if (modLigado && !central.aberto) alternarTracker(); },
  central: function () { if (modLigado) alternarCentral(); },
  desligar: function () { alternarMod(); },
};
function acaoDaTecla(a) {
  if (ACOES_TECLA[a]) return ACOES_TECLA[a];
  var f = doModulo("teclas", a);
  return f ? function () { if (modLigado && !central.aberto) f(); } : null;
}
var teclasRegistradas = {};
function registrarTecla(t) {
  if (!t || typeof $.RegisterKeyBind !== "function") return;
  var tecla = String(t).toLowerCase(), chave = "key_" + tecla;
  if (teclasRegistradas[chave]) return;
  teclasRegistradas[chave] = true;
  var fn = function () {
    Object.keys(ajustes.teclas).forEach(function (a) {
      if (String(ajustes.teclas[a] || "").toLowerCase() !== tecla) return;
      var acao = acaoDaTecla(a);
      if (acao) teclaUnica(a, acao)();
    });
  };
  try { $.RegisterKeyBind(contexto, chave, fn); } catch (e) { log("RegisterKeyBind(contexto, " + chave + "): " + e); }
  try { $.RegisterKeyBind("", chave, fn); } catch (e) { log("RegisterKeyBind('', " + chave + "): " + e); }
}
function registrarTeclas() {
  if (typeof $.RegisterKeyBind !== "function") { log("atalhos: $.RegisterKeyBind indisponível"); return; }
  Object.keys(ajustes.teclas).forEach(function (a) { registrarTecla(ajustes.teclas[a]); });
}

// ---------- liga/desliga (F8) ----------
// Desligado = o HUD do jogo exatamente como sem o mod (fora os arquivos substituídos, que sem as classes
// DU_* na raiz se comportam como o original).
function esconderTudo() {
  cadaModulo("esconder"); // mapa (e as classes dele na raiz), mira, vida, timers, placar do topo
  fecharTracker();
  fecharCentral();
  if (loja.ativa) ativarAba(false);
  esconderDica();
  [faixa.painel, aviso.painel, loja.botao, achar(hud, "DUBotaoCentral"), achar(hud, "DUBotaoTracker")].forEach(function (p) { mostrarPainel(p, false); });
  faixa.visivel = false;
}
function alternarMod() {
  modLigado = !modLigado;
  if (!modLigado) esconderTudo();
  else {
    [achar(hud, "DUBotaoCentral"), achar(hud, "DUBotaoTracker")].forEach(function (p) { mostrarPainel(p, true); });
    assinaturaAnterior = "";
    aplicarAjustes();
  }
  mostrarAvisoTexto("Deadlock Utils <b>" + T(modLigado ? "mod.ligado" : "mod.desligado") + "</b>",
    T(modLigado ? "mod.apertePraDesligar" : "mod.apertePraLigar", nomeTecla(ajustes.teclas.desligar || "F8")), true);
  log("mod " + (modLigado ? "ligado" : "desligado"));
}

// ---------- loop rápido ----------
// ativa: partida rolando (o placar tem jogadores e o jogo não está em hideout, pré-jogo ou fim de partida).
// Quando o estado do jogo muda (entrar na partida, contagem inicial, fim, voltar ao hideout), o mod fecha
// o que estiver aberto: nada nosso atravessa uma transição.
var rapido = { esc: false, chaveEstado: "" };
function estadoRapido() {
  var tb = topBar();
  var menu = menuEsc();
  var esc = temClasse(hud, "ShowEscapeMenu");
  if (!esc && menu) { try { esc = menu.BAscendantHasClass("ShowEscapeMenu"); } catch (e) {} }
  var estado = estadoHud();
  var e = { lojaAberta: temClasse(tb, "gShopOpen"), placarAberto: placarAberto(), escAberto: esc, escAbriu: esc && !rapido.esc,
    estado: estado, ativa: partidaAtiva(ultimaLeitura && ultimaLeitura.emPartida, estado) };
  var chave = [estado.hideout, estado.preJogo, estado.fimDeJogo, e.ativa].join("|");
  e.mudouEstado = rapido.chaveEstado !== "" && chave !== rapido.chaveEstado;
  rapido.chaveEstado = chave;
  rapido.esc = esc;
  return e;
}
var ultimaVarreduraLoja = 0;
function verificarRapido() {
  if (!modLigado) return;
  try {
    var e = estadoRapido();
    if (e.escAbriu || e.mudouEstado) { cadaModulo("fechar"); fecharTracker(); fecharCentral(); esconderDica(); }
    if (e.mudouEstado) log("estado do jogo: hideout=" + e.estado.hideout + " preJogo=" + e.estado.preJogo + " fim=" + e.estado.fimDeJogo + " ativa=" + e.ativa);
    cadaModulo("rapido", e); // timers, mapa, mira, vida, placar do topo
    atualizarVisibilidadeFaixa(e);
    vigiarAbaLoja(e);
    vigiarCentral(e);
    // Nada nosso por cima de mapa/tracker/central/menu ESC.
    if ((e.escAberto || algumModuloAberto() || tracker.aberto || central.aberto) && valido(aviso.painel)) mostrarPainel(aviso.painel, false);
    // Loja aberta: as abas trocam os painéis nativos; varre a cada 2s para saber o que dá para comprar/já tem.
    if (e.lojaAberta && Date.now() - ultimaVarreduraLoja > 2000) {
      ultimaVarreduraLoja = Date.now();
      atualizarNativos();
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
// O trabalho de cada segundo é dividido em três etapas, cada uma num frame (a ~20 ms uma da outra): tudo num
// frame só dava um tranco de vários ms a cada segundo. Cada etapa mede o próprio tempo; se alguma passar de
// 4 ms, o console mostra o pior tempo de cada uma (no máximo uma linha por minuto), para achar o que pesa.
var ultimoErro = "";
var ultimosSegundos = null;
var diagnosticoFeito = false;
var ultimoLogDesconhecidos = "";
var tempos = { max: {}, logEm: 0 };
function etapa(nome, fn) {
  var t0 = Date.now();
  try { fn(); } catch (e) {
    ultimoErro = String(e);
    log("erro (" + nome + "): " + e + (e && e.stack ? "\n" + e.stack : ""));
  }
  var ms = Date.now() - t0;
  if (!(tempos.max[nome] >= ms)) tempos.max[nome] = ms;
}
function logTempos() {
  if (agoraSeg - tempos.logEm < 60) return;
  var nomes = Object.keys(tempos.max);
  if (!nomes.some(function (n) { return tempos.max[n] > 4; })) return;
  tempos.logEm = agoraSeg;
  log("desempenho (pior em 60 s): " + nomes.map(function (n) { return n + " " + tempos.max[n] + " ms"; }).join(", "));
  tempos.max = {};
}
function tick() {
  $.Schedule(1.0, tick);
  agoraSeg += 1;
  if (!modLigado) {
    if (valido(aviso.painel) && agoraSeg >= aviso.ate) mostrarPainel(aviso.painel, false); // o aviso de "mod desligado" some sozinho
    return;
  }
  var l = null;
  etapa("leitura", function () {
    l = lerPartida();
    // Partida nova (relógio voltou): esquece itens e heróis da partida anterior.
    if (l.segundos != null && ultimosSegundos != null && l.segundos + 60 < ultimosSegundos) {
      esquecerPossuidos();
      cacheLeitura.jogadores = [];
      aviso.vistos = {};
      aviso.fila = [];
      cadaModulo("novaPartida"); // marcas do mapa, urna, placar do topo
      log("partida nova detectada");
    }
    if (l.segundos != null) ultimosSegundos = l.segundos;
    l.meusItens.forEach(marcarPossuido);
    atualizarRecomendacoes(l, false);
  });
  if (!l) return;
  $.Schedule(0.02, function () {
    if (!modLigado) return;
    etapa("hud", function () {
      cadaModulo("lento", l); // pontos no minimapa
      if (faixa.visivel) atualizarFaixa(false); // almas e distância da loja mudam sem a recomendação mudar
      if (!valido(loja.botao)) montarAbaLoja();
      montarFaixa();
      tickAviso(l);
    });
    $.Schedule(0.02, function () {
      if (!modLigado) return;
      etapa("resto", function () {
        cadaModulo("lentoFim", l); // timers dos objetivos e painel do mapa M
        vigiarCompat(l); // QOL Lock (02-compat.js)
        montarBotaoEsc();
        if (tracker.aberto && agoraSeg % 5 === 0) desenharTracker();
        if (l.emPartida && !diagnosticoFeito) { diagnosticoFeito = true; diagnosticoLeitura(); }
        var desc = Object.keys(desconhecidos).sort().join(", ");
        if (desc && desc !== ultimoLogDesconhecidos) { ultimoLogDesconhecidos = desc; log("ícones sem item mapeado: " + desc); }
        mostrarDiagnosticoNaTela(l);
      });
      logTempos();
    });
  });
}

// Se a partida está rolando há um tempo e a leitura falhou, a fileira do Tab mostra o motivo (para depurar
// por print). Logo no começo da partida o placar ainda está se montando: espera 20 s.
var ativaDesde = null;
function mostrarDiagnosticoNaTela(l) {
  if (!l.ativa) ativaDesde = null; else if (ativaDesde == null) ativaDesde = agoraSeg;
  if (!valido(faixa.motivo)) return;
  var problema = l.ativa && agoraSeg - ativaDesde > 20 && (!l.eu || !l.inimigos.length) || ultimoErro;
  mostrarPainel(faixa.motivo, !!problema);
  if (!problema) return;
  faixa.motivo.text = "<font color='#e0a060'>DIAGNÓSTICO v" + DU_DATA.versao + "</font> eu=" + esc(l.eu || "?") +
    " · meu time=" + l.meuTime + " · aliados=" + l.amigos.length + " inimigos=" + l.inimigos.length +
    " · " + esc(resumoNativos()) +
    (ultimoErro ? "<br><font color='#e04848'>erro: " + esc(ultimoErro) + "</font>" : "");
}

function diagnosticoInicial() {
  log("carregado v" + DU_DATA.versao + (ADDON_QOL ? " (addon do QOL Lock)" : "") + " (jogo " + DU_DATA.versaoJogo + "): " + dados.itens.length + " itens, " +
    dados.regras.length + " regras, builds de " + Object.keys(dados.builds).length + " heróis, conta=" + (CONFIG.accountId || "não configurada") +
    ", ponte=" + (CONFIG.urlPonte || "não configurada") + ", módulos=" + MODULOS.map(function (m) { return m.id; }).join(","));
}

function iniciar() {
  if (!instanciaUnica()) return; // as duas versões instaladas: só uma roda (02-compat.js)
  diagnosticoInicial();
  carregarAjustes(); // tamanhos do mapa, teclas etc. (75-ajustes.js)
  registrarTeclas();
  if (CONFIG.urlPonte) { iniciarPonte(); aoPontePronta(carregarOverrides); }
  $.Schedule(1.0, tick);
  $.Schedule(1.0, loopRapido);
}
// O addon espera 1 s: dá tempo de a versão normal (no hud.xml), se também estiver instalada, se anunciar.
if (ADDON_QOL) $.Schedule(1.0, iniciar); else iniciar();
