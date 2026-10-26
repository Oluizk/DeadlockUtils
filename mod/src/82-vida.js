// ===================== Barra de vida: cores, vida instantânea e vida perto da mira =====================
// A barra do jogo fica em #health_and_abilities_container (hud_health_container.xml + hud_health.xml):
//   #health_bar (ProgressBarWithMiddle vertical): .ProgressBarLeft = vida atual (textura + cor),
//     .ProgressBarMiddle = o pedaço "atrasado" que o jogo anima ao tomar dano/curar;
//   #pending_incoming_damage / #pending_incoming_heal: dano/cura que ainda vão entrar;
//   .currentHealthLabel / .totalHealthLabel: os números ("1234" e "/ 2000"), que mudam na hora.
// O build altera o hud_health.xml do jogo (mod/jogo/hud_health.xml): ele ganha o CSS do mod
// (mod/jogo/vida.css) e um preenchimento próprio dentro do #health_bar (#DUVidaPropria).
//   Vida instantânea: classe DU_vidaInstantanea na raiz do HUD esconde o preenchimento do jogo (que anima;
//     não há convar para isso) e mostra o nosso, com a altura vinda direto do número de vida.
//   Pulso com vida crítica: classe DU_vidaPulso (animação no CSS).
//   Cores escolhidas pelo jogador: wash-color inline (CSS não tem variáveis), só quando a cor muda.

var vida = { cont: null, barra: null, esquerda: null, numero: null, total: null, propria: null,
  cor: null, corNumero: null, aplicado: false, chavePropria: "", chaveMira: "", avisouLayout: false };

function paineisVida() {
  if (valido(vida.cont) && valido(vida.barra) && valido(vida.numero)) return true;
  vida.cont = achar(hud, "health_and_abilities_container");
  if (!valido(vida.cont)) return false;
  vida.barra = achar(vida.cont, "health_bar");
  vida.esquerda = porClasse(vida.barra, "ProgressBarLeft")[0] || null;
  vida.numero = porClasse(vida.cont, "currentHealthLabel")[0] || null;
  vida.total = porClasse(vida.cont, "totalHealthLabel")[0] || null;
  vida.propria = achar(vida.barra, "DUVidaPropriaCheia");
  // painéis novos (renascer, troca de herói): o que o mod tinha posto se perdeu com os velhos
  vida.cor = null; vida.corNumero = null; vida.chavePropria = "";
  if (!vida.propria && !vida.avisouLayout) {
    vida.avisouLayout = true;
    log("barra de vida sem o preenchimento do mod: outro mod substitui hud_health? (vida instantânea desligada)");
  }
  return valido(vida.barra);
}
function numeroDe(t) {
  var d = String(t || "").replace(/<[^>]*>/g, "").replace(/[^\d]/g, "");
  return d ? parseInt(d, 10) : NaN;
}
// { atual, max, pct } ou null. O número do HUD é a fonte (muda na hora); a barra é o plano B.
function lerVida() {
  if (!paineisVida()) return null;
  var atual = numeroDe(textoDe(vida.numero)), max = numeroDe(textoDe(vida.total));
  if (!(max > 0) || isNaN(atual)) {
    try {
      var v = Number(vida.barra.value), m = Number(vida.barra.max);
      if (m > 0 && !isNaN(v)) return { atual: v, max: m, pct: Math.max(0, Math.min(100, 100 * v / m)) };
    } catch (e) {}
    return null;
  }
  return { atual: atual, max: max, pct: Math.max(0, Math.min(100, 100 * atual / max)) };
}

// ---------- cores ----------
function hexParaRgb(h) {
  var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(String(h || ""));
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
}
function misturarCor(a, b, t) {
  var x = hexParaRgb(a), y = hexParaRgb(b);
  return "#" + [0, 1, 2].map(function (i) {
    var v = Math.round(x[i] + (y[i] - x[i]) * t);
    return (v < 16 ? "0" : "") + v.toString(16);
  }).join("").toUpperCase();
}
function corVidaFaixas(pct) {
  return pct >= 75 ? ajustes.vidaCorAlta : pct >= 50 ? ajustes.vidaCorMedia : pct >= 25 ? ajustes.vidaCorBaixa : ajustes.vidaCorCritica;
}
// "" = cor do jogo.
function corVida(pct) {
  var m = ajustes.vidaModo;
  if (m === "fixa") return ajustes.vidaCorFixa;
  if (m === "faixas") return corVidaFaixas(pct);
  if (m === "gradiente") {
    var paradas = [[0, ajustes.vidaCorCritica], [25, ajustes.vidaCorBaixa], [50, ajustes.vidaCorMedia], [75, ajustes.vidaCorAlta], [100, ajustes.vidaCorAlta]];
    for (var i = 1; i < paradas.length; i++) {
      if (pct <= paradas[i][0]) {
        var a = paradas[i - 1], b = paradas[i];
        // passos de 2% para não trocar o estilo a cada ponto de vida
        return misturarCor(a[1], b[1], Math.round((pct - a[0]) / (b[0] - a[0]) * 50) / 50);
      }
    }
    return ajustes.vidaCorAlta;
  }
  return "";
}

// Estilo inline só quando muda (chave = campo de vida que guarda o último valor posto).
function estiloVida(p, prop, valor, chave) {
  if (!valido(p) || vida[chave] === valor) return;
  vida[chave] = valor;
  try { p.style[prop] = valor || null; } catch (e) {}
}

// ---------- loop rápido (50 ms) ----------
function atualizarVida(e) {
  var cores = modLigado && ajustes.vidaModo !== "jogo";
  var instantanea = modLigado && ajustes.vidaInstantanea;
  var naMira = modLigado && ajustes.vidaMira;
  if (!naMira && valido(mira.vida)) mostrarPainel(mira.vida, false); // a mira pode continuar ligada sem ela
  if (!cores && !instantanea && !naMira && !vida.aplicado) return;
  var v = lerVida();
  if (!v) return;
  var cor = cores ? corVida(v.pct) : "";
  var temPropria = instantanea && valido(vida.propria);
  classeRaiz("DU_vidaInstantanea", temPropria);
  classeRaiz("DU_vidaPulso", cores && ajustes.vidaPulsar && v.pct < 25 && v.atual > 0 && e.ativa);
  if (temPropria) {
    var chave = Math.round(v.pct * 10) + "|" + cor;
    if (chave !== vida.chavePropria) {
      vida.chavePropria = chave;
      try {
        vida.propria.style.height = (Math.round(v.pct * 10) / 10) + "%";
        vida.propria.style.washColor = cor || null;
      } catch (err) {}
    }
  }
  // a cor vai na barra do jogo também (ela volta a aparecer se a vida instantânea for desligada)
  estiloVida(vida.esquerda, "washColor", cor, "cor");
  estiloVida(vida.numero, "color", cores && ajustes.vidaNumero ? cor : "", "corNumero");
  vida.aplicado = cores || instantanea;
  if (naMira) atualizarVidaMira(v);
}

// Desfaz tudo (mod desligado).
function restaurarVida() {
  classeRaiz("DU_vidaInstantanea", false);
  classeRaiz("DU_vidaPulso", false);
  vida.cor = "x"; vida.corNumero = "x";
  estiloVida(vida.esquerda, "washColor", "", "cor");
  estiloVida(vida.numero, "color", "", "corNumero");
  vida.aplicado = false;
}

// ---------- vida perto da mira (dentro do painel da mira, 80-mira.js) ----------
function atualizarVidaMira(v) {
  if (!valido(mira.vida)) return;
  var mostrar = !!v && v.atual > 0 && (ajustes.vidaMiraAte >= 100 || v.pct < ajustes.vidaMiraAte);
  mostrarPainel(mira.vida, mostrar);
  if (!mostrar) return;
  var cor = corVida(v.pct) || corVidaFaixas(v.pct);
  var texto = ajustes.vidaMiraTexto === "pct" ? Math.round(v.pct) + "%" : ajustes.vidaMiraTexto === "numero" ? String(v.atual) : "";
  var chave = [Math.round(v.pct * 2), cor, texto, ajustes.vidaMiraPos, ajustes.vidaMiraLarg].join("|");
  if (chave === vida.chaveMira) return;
  vida.chaveMira = chave;
  var w = ajustes.vidaMiraLarg;
  try {
    mira.vida.style.width = w + "px";
    // a partir do centro da mira: embaixo, ou dos lados (fora do alcance da mira)
    mira.vida.style.transform = ajustes.vidaMiraPos === "esquerda" ? "translateX(" + (-(w / 2 + 46)) + "px)" :
      ajustes.vidaMiraPos === "direita" ? "translateX(" + (w / 2 + 46) + "px)" : "translateY(62px)";
    mira.vidaCheia.style.width = (Math.round(v.pct * 2) / 2) + "%";
    mira.vidaCheia.style.backgroundColor = cor;
  } catch (e) {}
  mostrarPainel(mira.vidaTexto, !!texto);
  mira.vidaTexto.text = texto;
  try { mira.vidaTexto.style.color = cor; } catch (e) {}
}
