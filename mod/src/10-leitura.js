// ===================== Leitura da partida (placar, mira, relógio) =====================
// Placar: #TopBar > #TeamFriendly/#TeamEnemy > #PlayersContainer > um painel por jogador.
// ATENÇÃO 1: #TeamFriendly/#TeamEnemy são NÚMEROS de time fixos (team="2"/"3"), não "meu time" e
// "time inimigo". Qual é o seu é descoberto achando VOCÊ dentro de um deles.
// ATENÇÃO 2: o painel de intenções (#hud_playerintents) também tem #TeamEnemy/#PlayersContainer;
// por isso tudo é buscado dentro do #TopBar.
// Desempenho: painéis e o herói de cada jogador ficam em cache (herói não muda na partida).

var desconhecidos = {};
var cacheLeitura = { jogadores: [] }; // [{ painel, heroi, como, texto, nome, mods }]

function coletarPorId(p, id, prof, saida) {
  if (!valido(p) || prof > 10) return;
  var lista = filhos(p);
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].id === id) saida.push(lista[i]);
    else coletarPorId(lista[i], id, prof + 1, saida);
  }
}
// Imagens: qualquer painel do tipo Image ou com os ids que o jogo usa para ícones.
var IDS_IMAGEM = { AbilityImage: 1, ModIconImage: 1, HeroImage: 1, HeroIcon: 1 };
function coletarImagens(p, prof, saida) {
  if (!valido(p) || prof > 12) return;
  var lista = filhos(p);
  for (var i = 0; i < lista.length; i++) {
    var tipo = "", id = "";
    try { tipo = lista[i].paneltype; id = lista[i].id; } catch (e) {}
    if (tipo === "Image" || IDS_IMAGEM[id]) saida.push(lista[i]);
    coletarImagens(lista[i], prof + 1, saida);
  }
}

// Placar (Tab) aberto. Não dá para olhar só o #TopBar: com o mapa grande aberto o mod tira a classe
// dele (ver 50-mapa.js). O #minimap_persp é um GlobalClassListener (aplica a classe num ancestral, não
// em si mesmo), então olha os ancestrais dele; e o #hud_minimap, que tem o próprio listener.
function placarAberto() {
  if (temClasse(topBar(), "gScoreboardOpen")) return true;
  if (!valido(cacheLeitura.persp)) cacheLeitura.persp = achar(hud, "minimap_persp");
  try { if (valido(cacheLeitura.persp) && cacheLeitura.persp.BAscendantHasClass("gScoreboardOpen")) return true; } catch (e) {}
  if (!valido(cacheLeitura.mm)) cacheLeitura.mm = achar(hud, "hud_minimap");
  return temClasse(cacheLeitura.mm, "gScoreboardOpen");
}
function topBar() {
  if (!valido(cacheLeitura.topBar)) cacheLeitura.topBar = achar(hud, "TopBar");
  return cacheLeitura.topBar;
}
function containerDoTime(id) {
  var c = cacheLeitura["cont_" + id];
  if (!valido(c)) { c = achar(achar(topBar(), id), "PlayersContainer"); cacheLeitura["cont_" + id] = c; }
  return c;
}

var CLASSES_LOCAL = ["IsLocalPlayer", "LocalPlayer", "localPlayer", "is_local_player", "isLocalPlayer", "local_player"];
function ehJogadorLocal(p) {
  for (var i = 0; i < CLASSES_LOCAL.length; i++) if (temClasse(p, CLASSES_LOCAL[i])) return true;
  return false;
}

function identificarHeroi(p) {
  // 1) nome do herói no placar (em qualquer idioma)
  var t = textoDe(porClasse(p, "HeroName")[0]);
  var h = nomeParaHeroi[normalizar(t)];
  if (h) return { heroi: h, como: "nome", texto: t };
  // 2) ícones das habilidades do jogador no placar
  h = heroiPelasHabilidades(achar(p, "PlayerAbilitiesContainer") || p);
  if (h) return { heroi: h, como: "habilidades", texto: t };
  // 3) retrato
  var imgs = [];
  coletarImagens(achar(p, "HeroImageArea") || achar(p, "HeroBadge"), 0, imgs);
  for (var i = 0; i < imgs.length; i++) {
    h = heroiDaImagem(srcImagem(imgs[i]));
    if (h) return { heroi: h, como: "retrato", texto: t };
  }
  return { heroi: "", como: "", texto: t };
}

// Info de um painel de jogador, com cache: o herói só é procurado de novo enquanto não for achado.
function infoJogador(p) {
  for (var i = 0; i < cacheLeitura.jogadores.length; i++) {
    var c = cacheLeitura.jogadores[i];
    if (c.painel === p) {
      if (!c.heroi) { var id2 = identificarHeroi(p); c.heroi = id2.heroi; c.como = id2.como; c.texto = id2.texto; }
      if (!c.nome) c.nome = textoDe(porClasse(p, "PlayerName")[0]);
      return c;
    }
  }
  var id = identificarHeroi(p);
  var novo = { painel: p, heroi: id.heroi, como: id.como, texto: id.texto,
    nome: textoDe(porClasse(p, "PlayerName")[0]), mods: achar(p, "PlayerModsContainer") };
  cacheLeitura.jogadores.push(novo);
  if (cacheLeitura.jogadores.length > 40) cacheLeitura.jogadores.shift();
  return novo;
}

function lerJogador(p) {
  var c = infoJogador(p);
  if (!valido(c.mods)) c.mods = achar(p, "PlayerModsContainer");
  var itens = [], incertos = [], imgs = [];
  coletarPorId(c.mods || p, "ModIconImage", 0, imgs);
  for (var i = 0; i < imgs.length; i++) {
    var chave = chaveIcone(srcImagem(imgs[i]));
    if (!chave) continue;
    var ids = iconeParaItens[chave];
    if (!ids) { desconhecidos[chave] = true; continue; }
    if (ids.length === 1) { if (itens.indexOf(ids[0]) < 0) itens.push(ids[0]); }
    else incertos.push(ids.join("|"));
  }
  if (!c.heroi && !c.texto && !c.nome && imgs.length === 0) return null;
  return { heroi: c.heroi, como: c.como, textoHeroi: c.texto, nomeJogador: c.nome, itens: itens,
    incertos: incertos, nImagens: imgs.length, local: ehJogadorLocal(p), painel: p };
}

function lerTime(id) {
  var out = [];
  filhos(containerDoTime(id)).forEach(function (p) { var j = lerJogador(p); if (j) out.push(j); });
  return out;
}

// Seu herói sem depender do placar: classe na mira, barra de habilidades, retrato da loja.
function meuHeroiPeloHud() {
  if (!valido(cacheLeitura.vivo)) cacheLeitura.vivo = achar(hud, "gameplay_hud_alive");
  var prog = achar(achar(cacheLeitura.vivo, "crosshair"), "progress");
  var achados = [];
  for (var c in classeParaHeroi) {
    if (temClasse(prog, c) || temClasse(prog, c.replace(/^hero_/, ""))) achados.push(classeParaHeroi[c]);
  }
  if (achados.length === 1) return achados[0];
  if (!valido(cacheLeitura.assinatura)) cacheLeitura.assinatura = achar(hud, "hud_signature");
  var h = heroiPelasHabilidades(cacheLeitura.assinatura);
  if (h) return h;
  h = heroiDaImagem(srcImagem(achar(achar(achar(hud, "CitadelHudHeroShop"), "HeroPanel"), "HeroImage")));
  return h || achados[0] || "";
}

// Almas não gastas: "612", "1,1 mil", "1.1k" -> número aproximado.
function lerAlmas(texto) {
  var t = normalizar(texto).replace(/\s/g, "");
  var m = /^([\d.,]+)(mil|k)?$/.exec(t);
  if (!m) return null;
  var n = m[2] ? parseFloat(m[1].replace(",", ".")) * 1000 : parseInt(m[1].replace(/[.,]/g, ""), 10);
  return isNaN(n) ? null : n;
}

function lerPartida() {
  var timeA = lerTime("TeamFriendly"), timeB = lerTime("TeamEnemy");
  var heroiHud = meuHeroiPeloHud();
  // Qual time é o seu: (1) quem tem o cartão marcado como local; (2) quem tem o seu herói.
  var temLocal = function (t) { return t.some(function (j) { return j.local; }); };
  var temHeroi = function (t) { return heroiHud && t.some(function (j) { return j.heroi === heroiHud; }); };
  var meuTimeEhB = false;
  if (temLocal(timeB) && !temLocal(timeA)) meuTimeEhB = true;
  else if (!temLocal(timeA) && temHeroi(timeB) && !temHeroi(timeA)) meuTimeEhB = true;
  var amigos = meuTimeEhB ? timeB : timeA;
  var inimigos = meuTimeEhB ? timeA : timeB;

  var eu = amigos.filter(function (j) { return j.local && j.heroi; })[0];
  var euHeroi = eu ? eu.heroi : heroiHud || cacheLeitura.ultimoHeroi || "";
  if (euHeroi) cacheLeitura.ultimoHeroi = euHeroi;
  var meuCartao = eu || amigos.filter(function (j) { return j.heroi === euHeroi; })[0];
  var aliados = [], meusItens = [];
  amigos.forEach(function (j) {
    if (j === meuCartao) meusItens = j.itens;
    else if (j.heroi) aliados.push(j.heroi);
  });
  var tb = topBar();
  return {
    eu: euHeroi,
    meuTime: meuTimeEhB ? "TeamEnemy" : "TeamFriendly",
    amigos: amigos,
    aliados: aliados,
    inimigos: inimigos,
    meusItens: meusItens,
    almas: meuCartao ? lerAlmas(textoDe(achar(meuCartao.painel, "SoulsValue"))) : null,
    segundos: segundosDoRelogio(textoDe(achar(tb, "GameTime"))),
    textoMidboss: textoDe(achar(tb, "MidbossTimerLabel")),
    emPartida: timeA.length + timeB.length > 0,
    lojaAberta: temClasse(tb, "gShopOpen"),
    placarAberto: placarAberto(),
  };
}

// ---------- diagnóstico (console) ----------
function despejarArvore(p, prof, max, linhas) {
  if (!valido(p) || prof > max || linhas.length > 120) return;
  var tipo = "", txt = "", src = "";
  try { tipo = p.paneltype; } catch (e) {}
  if (tipo === "Label") txt = " text='" + textoDe(p).slice(0, 40) + "'";
  if (tipo === "Image") src = " src='" + srcImagem(p).slice(-60) + "'";
  linhas.push(new Array(prof + 1).join("  ") + tipo + (p.id ? "#" + p.id : "") + txt + src);
  filhos(p).forEach(function (f) { despejarArvore(f, prof + 1, max, linhas); });
}

function diagnosticoLeitura() {
  var l = lerPartida();
  log("=== leitura v" + DU_DATA.versao + " (jogo " + DU_DATA.versaoJogo + "): eu=" + (l.eu || "?") + " meuTime=" + l.meuTime +
    " almas=" + l.almas + " aliados=" + l.aliados.join(",") + " inimigos=" + l.inimigos.map(function (j) { return j.heroi || "?"; }).join(","));
}
