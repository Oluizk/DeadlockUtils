// ===================== Mira personalizada (+ a barrinha de vida perto da mira, 82-vida.js) =====================
// A mira do jogo é o Citadel_AbilityHUDElement_Gun dentro de #crosshair (ability_hud_elements/element_gun.xml):
// 500x500 no centro da tela, some sozinha quando o jogo esconde a mira (morto, câmera de outro jogador).
// A nossa fica DENTRO desse elemento (painel com o nosso layout, mod/layout/mira.xml), então aparece e some
// junto com a do jogo. Para esconder o retículo do jogo, só #GunGrosshair e o ponto (#Dot, #DotOutline)
// ganham opacidade 0: hitmarker, munição e recarga continuam do jogo.
// Se o elemento do jogo não for achado, a mira fica no HUD e é escondida com loja/menus/mapa abertos.

var mira = { painel: null, pai: null, desenho: null, chave: "", arma: null, checadoEm: 0, escondida: null };
var PECAS_MIRA_JOGO = [["GunGrosshair", "1"], ["Dot", "1"], ["DotOutline", "0.85"]]; // id, opacidade original (CSS do jogo)
var LADO_MIRA = 500; // tamanho do .ability_element_gun (e do .DUMira)

// O que cada estilo desenha: ângulos das linhas (0 = para cima), anel e ponto.
function estiloMira(e) {
  return {
    cruz: { linhas: [0, 90, 180, 270] },
    cruzPonto: { linhas: [0, 90, 180, 270], ponto: true },
    ponto: { ponto: true },
    circulo: { anel: true },
    circuloPonto: { anel: true, ponto: true },
    t: { linhas: [90, 180, 270] },
    x: { linhas: [45, 135, 225, 315] },
    seta: { linhas: [150, 210], ponto: false, seta: true },
  }[e] || { linhas: [0, 90, 180, 270] };
}
var PRESETS_MIRA = {
  classica: { miraEstilo: "cruz", miraCor: "#FFFFFF", miraTam: 7, miraEsp: 2, miraGap: 4, miraContorno: true, miraContornoEsp: 1, miraOpac: 100 },
  competitiva: { miraEstilo: "cruzPonto", miraCor: "#00FF7F", miraTam: 5, miraEsp: 2, miraGap: 3, miraPonto: 2, miraContorno: true, miraContornoEsp: 1, miraOpac: 100 },
  ponto: { miraEstilo: "ponto", miraCor: "#00E5FF", miraPonto: 5, miraContorno: true, miraContornoEsp: 1, miraOpac: 100 },
  circulo: { miraEstilo: "circuloPonto", miraCor: "#FF4FD8", miraRaio: 12, miraEsp: 2, miraPonto: 2, miraContorno: true, miraContornoEsp: 1, miraOpac: 90 },
  seta: { miraEstilo: "seta", miraCor: "#F5D33D", miraTam: 10, miraEsp: 2, miraContorno: true, miraContornoEsp: 1, miraOpac: 100 },
};
function aplicarPresetMira(nome) {
  var p = PRESETS_MIRA[nome];
  if (!p) return;
  Object.keys(p).forEach(function (k) { ajustes[k] = p[k]; });
  ajustes.mira = true;
  salvarAjustes();
}

function cfgMira() {
  return { estilo: ajustes.miraEstilo, cor: ajustes.miraCor, tam: ajustes.miraTam, esp: ajustes.miraEsp, gap: ajustes.miraGap,
    ponto: ajustes.miraPonto, raio: ajustes.miraRaio, opac: ajustes.miraOpac, contorno: ajustes.miraContorno,
    contornoEsp: ajustes.miraContornoEsp, contornoCor: ajustes.miraContornoCor };
}

// Desenha a mira dentro de 'alvo' (quadrado de 'lado' px; o centro dele é o centro da mira). Também usado
// pela prévia da central. O Panorama não desenha linhas: cada traço é um painel com fundo colorido.
function desenharMira(alvo, c, lado) {
  if (!valido(alvo)) return;
  alvo.RemoveAndDeleteChildren();
  var e = estiloMira(c.estilo), meio = lado / 2, partes = [];
  (e.linhas || []).forEach(function (a) {
    partes.push({ tipo: "linha", ang: a, dist: (e.seta ? 0 : c.gap) + c.tam / 2, w: c.esp, h: c.tam });
  });
  if (e.anel) partes.push({ tipo: "anel", r: c.raio, esp: c.esp });
  if (e.ponto) partes.push({ tipo: "ponto", d: c.ponto });
  // contorno atrás de tudo, depois a cor
  if (c.contorno) partes.forEach(function (p) { pecaMira(alvo, p, meio, c.contornoCor, c.contornoEsp); });
  partes.forEach(function (p) { pecaMira(alvo, p, meio, c.cor, 0); });
  try { alvo.style.opacity = String(Math.max(0.1, Math.min(1, c.opac / 100))); } catch (err) {}
}
function pecaMira(alvo, p, meio, cor, o) {
  var q = criar("Panel", alvo, "", "DUMiraPeca");
  if (!q) return;
  try {
    if (p.tipo === "linha") {
      var w = p.w + 2 * o, h = p.h + 2 * o, rad = p.ang * Math.PI / 180;
      var cx = meio + Math.sin(rad) * p.dist, cy = meio - Math.cos(rad) * p.dist;
      // horizontal/vertical sem rotação (fica nítido); diagonais giram em volta do próprio centro
      if (p.ang % 180 === 90) { var t = w; w = h; h = t; }
      q.style.width = w + "px";
      q.style.height = h + "px";
      q.style.position = Math.round(cx - w / 2) + "px " + Math.round(cy - h / 2) + "px 0px";
      if (p.ang % 90 !== 0) q.style.transform = "rotateZ(" + p.ang + "deg)";
      q.style.backgroundColor = cor;
    } else if (p.tipo === "anel") {
      var d = 2 * (p.r + o);
      q.style.width = d + "px";
      q.style.height = d + "px";
      q.style.position = Math.round(meio - d / 2) + "px " + Math.round(meio - d / 2) + "px 0px";
      q.style.border = (p.esp + 2 * o) + "px solid " + cor;
      q.style.borderRadius = "50%";
    } else {
      var dp = p.d + 2 * o;
      q.style.width = dp + "px";
      q.style.height = dp + "px";
      q.style.position = Math.round(meio - dp / 2) + "px " + Math.round(meio - dp / 2) + "px 0px";
      q.style.borderRadius = "50%";
      q.style.backgroundColor = cor;
    }
  } catch (e) {}
}

// ---------- no jogo ----------
function elementoArma() {
  if (valido(mira.arma) && valido(mira.cont)) return mira.arma;
  if (!valido(mira.cont)) mira.cont = achar(hud, "crosshair");
  mira.arma = porClasse(mira.cont, "ability_element_gun")[0] || null;
  return mira.arma;
}

// Opacidade 0 só no retículo do jogo (e volta ao normal quando a nossa é desligada).
function esconderMiraJogo(arma, esconder) {
  var alvo = esconder ? arma : null;
  if (mira.escondida === alvo) return;
  if (valido(mira.escondida)) PECAS_MIRA_JOGO.forEach(function (x) { limparEstilo(achar(mira.escondida, x[0]), "opacity", x[1]); });
  mira.escondida = alvo;
  if (valido(alvo)) PECAS_MIRA_JOGO.forEach(function (x) { var p = achar(alvo, x[0]); if (p) { try { p.style.opacity = "0"; } catch (e) {} } });
}
// Tira um estilo posto pelo mod. Se o Panorama não aceitar null, volta ao valor do CSS do jogo.
function limparEstilo(p, prop, original) {
  if (!valido(p)) return;
  try { p.style[prop] = null; } catch (e) {}
  try { if (original != null && p.style[prop] && String(p.style[prop]) !== String(original)) p.style[prop] = original; } catch (e) {}
}

function desmontarMira() {
  esconderMiraJogo(null, false);
  if (valido(mira.painel)) mira.painel.DeleteAsync(0);
  mira.painel = null;
  mira.pai = null;
  mira.chave = "";
}

// Loop rápido. Cria/recria o painel quando o elemento da arma muda (troca de herói, renascer) e redesenha
// só quando a configuração muda.
function vigiarMira(estado) {
  var querMira = modLigado && ajustes.mira, querVida = modLigado && ajustes.vidaMira;
  if (!querMira && !querVida) { if (mira.painel || mira.escondida) desmontarMira(); return; }
  var agora = Date.now();
  if (agora - mira.checadoEm >= 250 || !valido(mira.painel)) {
    mira.checadoEm = agora;
    var arma = elementoArma();
    var pai = arma || hud;
    if (!valido(mira.painel) || mira.pai !== pai) {
      if (valido(mira.painel)) mira.painel.DeleteAsync(0);
      mira.painel = painelComLayout(pai, "DU_Mira", "mira");
      mira.pai = pai;
      mira.chave = "";
      if (!mira.painel) return;
      mira.desenho = achar(mira.painel, "DUMiraDesenho");
      mira.vida = achar(mira.painel, "DUVidaMira");
      mira.vidaCheia = achar(mira.painel, "DUVidaMiraCheia");
      mira.vidaTexto = achar(mira.painel, "DUVidaMiraTexto");
      vida.chaveMira = "";
    }
    esconderMiraJogo(arma, querMira && ajustes.miraEsconderJogo);
  }
  if (!valido(mira.painel)) return;
  var chave = querMira ? JSON.stringify(cfgMira()) : "-";
  if (chave !== mira.chave) {
    mira.chave = chave;
    if (querMira) desenharMira(mira.desenho, cfgMira(), LADO_MIRA);
    mostrarPainel(mira.desenho, querMira);
  }
  // Dentro do elemento do jogo ela some junto com a mira do jogo. Sem ele (fallback no HUD), o mod esconde
  // fora da partida e com loja, menus, mapa e telas do mod abertos.
  if (mira.pai === hud && estado) {
    mostrarPainel(mira.painel, estado.ativa && !(estado.lojaAberta || estado.escAberto || mapa.aberto || central.aberto || tracker.aberto));
  }
}
