// ===================== Placar do topo do jogo: nível sempre visível e inimigos fora de visão =====================
// Tudo é CSS dentro do próprio layout do cartão de cada herói (mod/jogo/topo.css, incluído no build em
// citadel_hud_top_bar_player.xml). Aqui só se ligam classes:
//   na raiz do HUD: DU_topoNiveis, DU_topoNivelCor, DU_topoVisao (só durante a partida);
//   em cada cartão: DU_nv_m2 / DU_nv_m1 / DU_nv_p1 / DU_nv_p2 = nível 2+ abaixo, 1 abaixo, 1 acima, 2+ acima do seu.
// Fora de visão: o jogo põe HealthVisible no herói cuja vida o seu time vê. DU_topoVisao só liga depois de
// ver, nesta partida, essa classe num inimigo em volta do retrato (se um patch mudar o nome, nada é apagado).

var topo = { em: 0, confirmado: false, cartoes: [] };
var CLASSES_NIVEL = ["DU_nv_m2", "DU_nv_m1", "DU_nv_p1", "DU_nv_p2"];

function nivelDoCartao(p) {
  var c = infoJogador(p);
  if (!valido(c.nivel)) c.nivel = porClasse(p, "HeroLevelLabel")[0] || null;
  return numeroDe(textoDe(c.nivel));
}
function classeNivel(p, cls) {
  CLASSES_NIVEL.forEach(function (c) { p.SetHasClass(c, c === cls); });
  if (topo.cartoes.indexOf(p) >= 0) return;
  topo.cartoes = topo.cartoes.filter(valido); // cartões de partidas anteriores já foram apagados pelo jogo
  topo.cartoes.push(p);
}

// Loop rápido, no máximo 4x por segundo.
function vigiarTopo(e) {
  var agora = Date.now();
  if (agora - topo.em < 250) return;
  topo.em = agora;
  var l = ultimaLeitura;
  var ativa = modLigado && e.ativa && !!l;
  classeRaiz("DU_topoNiveis", ativa && ajustes.topoNivel);
  classeRaiz("DU_topoNivelCor", ativa && ajustes.topoNivel && ajustes.topoNivelCor);
  if (!ativa) { classeRaiz("DU_topoVisao", false); return; }
  if (!topo.confirmado) {
    topo.confirmado = l.inimigos.some(function (j) {
      var hv = temClasse(j.painel, "HealthVisible") ? j.painel : porClasse(j.painel, "HealthVisible")[0];
      return !!hv && valido(achar(hv, "HeroImageArea"));
    });
    if (topo.confirmado) log("placar: inimigos fora de visão confirmados (HealthVisible)");
  }
  classeRaiz("DU_topoVisao", ajustes.topoVisao && topo.confirmado);
  if (!(ajustes.topoNivel && ajustes.topoNivelCor)) return;
  var meuNivel = l.meuCartao ? nivelDoCartao(l.meuCartao.painel) : NaN;
  l.amigos.concat(l.inimigos).forEach(function (j) {
    if (!valido(j.painel)) return;
    var n = nivelDoCartao(j.painel), cls = "";
    if (!isNaN(n) && !isNaN(meuNivel) && j !== l.meuCartao) {
      var d = n - meuNivel;
      cls = d <= -2 ? "DU_nv_m2" : d === -1 ? "DU_nv_m1" : d === 1 ? "DU_nv_p1" : d >= 2 ? "DU_nv_p2" : "";
    }
    classeNivel(j.painel, cls);
  });
}

// Mod desligado: tira tudo.
function restaurarTopo() {
  ["DU_topoNiveis", "DU_topoNivelCor", "DU_topoVisao"].forEach(function (c) { classeRaiz(c, false); });
  topo.cartoes.forEach(function (p) { if (valido(p)) CLASSES_NIVEL.forEach(function (c) { p.RemoveClass(c); }); });
  topo.cartoes = [];
}

// Ganchos (00-base.js).
registrarModulo("topo", {
  rapido: vigiarTopo,
  esconder: restaurarTopo,
  novaPartida: function () { topo.confirmado = false; },
  aplicar: function () { topo.em = 0; },
});
