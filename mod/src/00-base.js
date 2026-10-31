// ===================== Base: dados, helpers de painel, utilidades =====================
// O Deadlock não tem API de jogo em JS. Tudo vem de LER a UI do próprio jogo (placar, mira,
// relógio) e de comandos de console (CitadelConCommand). Tudo aqui é protegido com try/catch:
// a UI do jogo muda entre patches e um erro não pode derrubar o HUD.

var PREFIXO = "[DeadlockUtils] ";
// Duas versões do mesmo código (tools/build-mod.ps1 -Alvo): a normal roda no hud.xml do jogo; o addon do
// QOL Lock roda no hud_playerintents.xml (o QOL substitui o hud.xml), um filho do HUD, e sobe até a raiz.
var ADDON_QOL = typeof DU_ALVO !== "undefined" && DU_ALVO === "qol";
var contexto = $.GetContextPanel();
var hud = ADDON_QOL ? raizDoHud(contexto) : contexto;
function raizDoHud(p) {
  var topo = p;
  try {
    for (var q = p; q; q = q.GetParent()) {
      if (q.paneltype === "CitadelHud" || q.id === "Hud" || q.BHasClass("WindowRoot")) return q;
      topo = q;
    }
  } catch (e) {}
  return topo;
}
var CONFIG = DU_DATA.config || {};
// Regras com os textos em todos os idiomas: a troca de idioma no jogo (Configurações) traduz de novo a partir daqui.
var REGRAS_BRUTAS = JSON.stringify({ regrasArquivos: DU_DATA.regrasArquivos, ameacas: DU_DATA.ameacas, countersHerois: DU_DATA.countersHerois });
var dados = dadosNoIdioma(idiomaDoMod());
function dadosNoIdioma(idioma) {
  var r = DeadlockEngine.localizar(JSON.parse(REGRAS_BRUTAS), idioma);
  DU_DATA.regrasArquivos = r.regrasArquivos;
  DU_DATA.ameacas = r.ameacas;
  DU_DATA.countersHerois = r.countersHerois;
  return DeadlockEngine.prepararDados(DU_DATA);
}

function log(msg) { try { $.Msg(PREFIXO + msg); } catch (e) {} }
function valido(p) {
  // Alguns painéis do jogo podem não expor IsValid(); nesse caso, existir já basta.
  try { if (!p) return false; return typeof p.IsValid === "function" ? !!p.IsValid() : true; } catch (e) { return false; }
}
function achar(p, id) { try { return valido(p) ? p.FindChildTraverse(id) : null; } catch (e) { return null; } }
function comoArray(x) { try { return x && x.length !== undefined ? Array.prototype.slice.call(x) : []; } catch (e) { return []; } }
function filhos(p) {
  if (!valido(p)) return [];
  try { var c = p.Children(); if (c && c.length !== undefined) return comoArray(c); } catch (e) {}
  try { var out = [], n = p.GetChildCount(); for (var i = 0; i < n; i++) out.push(p.GetChild(i)); return out; } catch (e) { return []; }
}
function temClasse(p, c) { try { return valido(p) && p.BHasClass(c); } catch (e) { return false; } }
function porClasse(p, c) { try { return valido(p) ? comoArray(p.FindChildrenWithClassTraverse(c)) : []; } catch (e) { return []; } }
function textoDe(p) { try { return valido(p) ? String(p.text || "") : ""; } catch (e) { return ""; } }
function esc(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function normalizar(t) { return String(t || "").toLowerCase().replace(/<[^>]*>/g, "").trim(); }
function som(nome) { try { PlayUISoundEvent(nome); } catch (e) {} }

function srcImagem(img) {
  var s = "";
  try { s = img.src || ""; } catch (e) {}
  if (!s) { try { s = img.GetAttributeString("src", "") || ""; } catch (e) {} }
  if (!s) { try { s = img.style.backgroundImage || ""; } catch (e) {} }
  return String(s || "");
}

// "s2r://panorama/images/items/weapon/toxic_bullets_psd.vtex" -> "items/weapon/toxic_bullets"
function chaveIcone(src) {
  var s = String(src || "").toLowerCase().replace(/\\/g, "/");
  var i = s.indexOf("images}/");
  if (i >= 0) s = s.slice(i + 8);
  else {
    i = s.indexOf("images/");
    if (i < 0) return "";
    s = s.slice(i + 7);
  }
  s = s.replace(/["')\s].*$/, "");
  s = s.replace(/\.(vtex_c|vtex|vsvg_c|vsvg|psd|png|svg)$/, "");
  s = s.replace(/_(psd|png|svg)$/, "");
  return s;
}

// ---------- criação de painéis ----------
// $.CreatePanel(tipo, pai, id, propriedades): o jogo marca $.CreatePanelWithProperties como obsoleto (e
// escreve um aviso no console a cada painel). Se esta versão não aceitar propriedades, cai na antiga.
function criar(tipo, pai, id, classes, props) {
  var p = null;
  try {
    p = props ? $.CreatePanel(tipo, pai, id || "", props) : $.CreatePanel(tipo, pai, id || "");
  } catch (e) {
    try { p = props && $.CreatePanelWithProperties ? $.CreatePanelWithProperties(tipo, pai, id || "", props) : $.CreatePanel(tipo, pai, id || ""); }
    catch (e2) { log("CreatePanel(" + tipo + ") falhou: " + e2); return null; }
  }
  if (p && classes) classes.split(" ").forEach(function (c) { if (c) p.AddClass(c); });
  return p;
}
function rotulo(pai, classes, texto) {
  var l = criar("Label", pai, "", classes, { html: "true" });
  if (l) {
    try { l.html = true; } catch (e) {} // garante <b>/<font> mesmo se as propriedades não tiverem pegado
    try { l.text = texto; } catch (e) {}
  }
  return l;
}
function imagem(pai, classes, src) {
  var img = criar("Image", pai, "", classes);
  if (img && src) { try { img.SetImage(src); } catch (e) { try { img.src = src; } catch (e2) {} } }
  return img;
}
function evento(p, nome, fn) { try { p.SetPanelEvent(nome, fn); } catch (e) {} }
function aoClicar(p, fn) { evento(p, "onactivate", function () { som("UI.Button.Press"); fn(); }); }
function dica(p, textoOuFn) {
  evento(p, "onmouseover", function () {
    var t = typeof textoOuFn === "function" ? textoOuFn() : textoOuFn;
    try { $.DispatchEvent("UIShowTextTooltip", p, t); } catch (e) {}
  });
  evento(p, "onmouseout", function () { try { $.DispatchEvent("UIHideTextTooltip", p); } catch (e) {} });
}
function botao(pai, classes, texto, fn) {
  var b = criar("Button", pai, "", "DUBotao " + (classes || ""));
  rotulo(b, "DUBotaoTexto", texto);
  if (fn) aoClicar(b, fn);
  return b;
}

// No Panorama um painel só recebe os estilos do ARQUIVO DE LAYOUT a que pertence. Painéis criados
// dentro da UI do jogo herdariam o layout do jogo; por isso cada parte nossa carrega um layout
// próprio (mod/layout/*.xml) que inclui o nosso CSS.
function carregarLayout(painel, nome) {
  var arq = "file://{resources}/layout/deadlock_utils_" + nome + ".xml";
  var ok;
  try { ok = painel.BLoadLayout(arq, false, false) !== false; } catch (e) { log("BLoadLayout falhou (" + nome + "): " + e); return false; }
  if (ok) traduzirPainel(painel);
  return ok;
}
// Cria um painel já com o nosso layout. Se o layout não carregar, apaga e devolve null.
function painelComLayout(pai, id, nome) {
  var velho = achar(pai, id);
  if (valido(velho)) velho.DeleteAsync(0);
  var p = criar("Panel", pai, id);
  if (!p) return null;
  if (!carregarLayout(p, nome)) { p.DeleteAsync(0); return null; }
  return p;
}
function mostrarPainel(p, on) {
  if (!valido(p)) return;
  p.SetHasClass("DUEscondido", !on);
  try { p.visible = on; } catch (e) {}
}

// ---------- módulos opcionais ----------
// Mapa, mira, vida, timers e placar do topo só entram na versão normal: o addon do QOL Lock é compilado
// sem eles (o QOL cuida dessas partes). O resto do mod só fala com eles por estes ganchos:
//   rapido(e)       loop de 50 ms              lento(l), lentoFim(l)  loop de 1 s (antes / depois do Tab)
//   fechar()        fecha a janela do módulo   aberto()               a janela dele está aberta?
//   esconder()      F8 desligou o mod          novaPartida()          aplicar() (configurações mudaram)
//   idioma()        o idioma mudou             exportar(o), importar(o)  campos extras do código DUC1
//   teclas { ação: fn }   controles { tipo: fn(ctl, def, l) }   previas { tipo: { montar(p), desenhar() } }
// Os ganchos rodam na ordem de "ordem" (padrão 50) e, no empate, na ordem dos arquivos.
var MODULOS = [];
function registrarModulo(id, m) {
  m.id = id;
  m.ordem = m.ordem || 50;
  var i = 0;
  while (i < MODULOS.length && MODULOS[i].ordem <= m.ordem) i++;
  MODULOS.splice(i, 0, m);
}
function temModulo(id) { return MODULOS.some(function (m) { return m.id === id; }); }
function cadaModulo(gancho, a) {
  MODULOS.forEach(function (m) { if (typeof m[gancho] === "function") m[gancho](a); });
}
function algumModuloAberto() { return MODULOS.some(function (m) { return typeof m.aberto === "function" && !!m.aberto(); }); }
// Primeiro módulo que oferece teclas[nome] / controles[nome] / previas[nome].
function doModulo(campo, nome) {
  for (var i = 0; i < MODULOS.length; i++) { var c = MODULOS[i][campo]; if (c && c[nome]) return c[nome]; }
  return null;
}

// ---------- console / eventos ----------
function comando(cmd) {
  try { $.DispatchEvent("CitadelConCommand", cmd); return true; } catch (e) { log("comando falhou (" + cmd + "): " + e); return false; }
}
function aoEvento(nome, fn) {
  try { $.RegisterForUnhandledEvent(nome, fn); return true; } catch (e) { log("RegisterForUnhandledEvent(" + nome + ") falhou: " + e); return false; }
}
function copiarTexto(t) {
  try { $.DispatchEvent("CopyStringToClipboard", t); return true; } catch (e) { log("copiar falhou: " + e); return false; }
}

// ---------- itens e heróis ----------
// Nome do item como o jogo mostra no idioma do mod (tirado da localização do jogo no build).
function nomeItem(it) {
  if (!it) return "?";
  return ((DU_DATA.nomesItensIdioma || {})[IDIOMA] || {})[it.id] || (IDIOMA === "pt" && it.nome_pt) || it.nome || "?";
}
function iconeItem(it) {
  var lista = (it && it.icones) || [];
  var k = lista.filter(function (i) { return i.indexOf("items/") === 0; })[0] || lista[0];
  return k ? "s2r://panorama/images/" + k + "_psd.vtex" : "";
}
function fundoCartao(it) {
  return "url(\"s2r://panorama/images/shop/catalog/cards/card_backer_" + it.categoria + "_t" + it.tier + "_psd.vtex\")";
}
function imagemHeroi(nome) {
  var h = dados.herois[nome];
  return h && h.imagem ? "s2r://panorama/images/" + h.imagem + ".vtex" : ""; // imagem já tem _psd/_png
}
// Cartão de item no formato do CitadelShopMod (76x114) com fundo/ícone da própria loja.
function cartaoItem(pai, it, opcoes) {
  opcoes = opcoes || {};
  var c = criar("Panel", pai, "", "DUCartao DUCartao_" + it.categoria + (opcoes.classe ? " " + opcoes.classe : ""));
  try { c.style.backgroundImage = fundoCartao(it); c.style.backgroundSize = "cover"; } catch (e) {}
  imagem(c, "DUCartaoIcone", iconeItem(it));
  rotulo(c, "DUCartaoNome", esc(nomeItem(it)));
  if (it.ativo) rotulo(c, "DUCartaoAtivo", T("cartao.ativo"));
  if (opcoes.selo) rotulo(c, "DUCartaoSelo DUSelo_" + opcoes.selo, T(opcoes.selo === "build" ? "cartao.build" : "cartao.counter"));
  if (opcoes.preco) rotulo(criar("Panel", c, "", "DUCartaoPreco"), "DUCartaoCusto", String(it.custo));
  if (opcoes.aoPassar) evento(c, "onmouseover", opcoes.aoPassar);
  if (opcoes.aoClicar) aoClicar(c, opcoes.aoClicar);
  return c;
}

var iconeParaItens = {};
dados.itens.forEach(function (it) {
  (it.icones || []).forEach(function (k) {
    if (!iconeParaItens[k]) iconeParaItens[k] = [];
    if (iconeParaItens[k].indexOf(it.id) < 0) iconeParaItens[k].push(it.id);
  });
});
var classeParaHeroi = {};
var imagemParaHeroi = {};
Object.keys(dados.herois).forEach(function (nome) {
  var h = dados.herois[nome];
  if (h.classe) classeParaHeroi[h.classe] = nome;
  if (h.imagem) imagemParaHeroi[h.imagem.replace(/^heroes\//, "").replace(/_(psd|png)$/, "").replace(/_sm$/, "")] = nome;
});
var nomeParaHeroi = DU_DATA.nomesHerois; // nome localizado (minúsculo) -> herói
var habilidadeParaHeroi = {};             // "hud/abilities/bull_drain" -> "Abrams"
Object.keys(dados.herois).forEach(function (nome) {
  (dados.herois[nome].habilidades || []).forEach(function (k) { habilidadeParaHeroi[k] = nome; });
});
// Herói pela maioria dos ícones de habilidade encontrados dentro de um painel.
function heroiPelasHabilidades(painel) {
  var imgs = [], votos = {}, melhor = "";
  coletarImagens(painel, 0, imgs);
  imgs.forEach(function (img) {
    var h = habilidadeParaHeroi[chaveIcone(srcImagem(img))];
    if (!h) return;
    votos[h] = (votos[h] || 0) + 1;
    if (!melhor || votos[h] > votos[melhor]) melhor = h;
  });
  return melhor;
}

// Herói a partir de um caminho de imagem qualquer (retrato, badge, mini-mapa…).
function heroiDaImagem(src) {
  var m = /heroes\/([a-z0-9_]+?)(?:_sm|_mm|_card|_vertical|_card_critical|_card_gloat)?(?:_psd|_png)?\./.exec(String(src || "").toLowerCase());
  return m ? (imagemParaHeroi[m[1]] || "") : "";
}

function segundosDoRelogio(t) {
  var m = /(-?)(\d+):(\d\d)/.exec(String(t || ""));
  if (!m) return null;
  var s = parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
  return m[1] ? -s : s;
}
function relogio(seg) {
  if (seg == null || isNaN(seg)) return "--:--";
  seg = Math.max(0, Math.round(seg));
  var m = Math.floor(seg / 60), s = seg % 60;
  return m + ":" + (s < 10 ? "0" : "") + s;
}

// base64 de texto UTF-8 (o Panorama não tem btoa/atob).
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function utf8Bytes(t) {
  var out = [];
  for (var i = 0; i < t.length; i++) {
    var c = t.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}
function paraBase64(t) {
  var b = utf8Bytes(t), s = "";
  for (var i = 0; i < b.length; i += 3) {
    var n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    s += i + 1 < b.length ? B64[(n >> 6) & 63] : "";
    s += i + 2 < b.length ? B64[n & 63] : "";
  }
  return s;
}
function deBase64(s) {
  var bytes = [], buf = 0, bits = 0;
  for (var i = 0; i < s.length; i++) {
    var v = B64.indexOf(s[i]);
    if (v < 0) continue;
    buf = (buf << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 255); }
  }
  var t = "";
  for (var j = 0; j < bytes.length; j++) {
    var c = bytes[j];
    if (c < 0x80) t += String.fromCharCode(c);
    else if (c < 0xe0) { t += String.fromCharCode(((c & 31) << 6) | (bytes[j + 1] & 63)); j += 1; }
    else { t += String.fromCharCode(((c & 15) << 12) | ((bytes[j + 1] & 63) << 6) | (bytes[j + 2] & 63)); j += 2; }
  }
  return t;
}
