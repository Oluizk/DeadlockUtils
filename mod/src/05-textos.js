// ===================== Textos da interface (tradução) =====================
// data/textos.json tem um bloco por idioma. O idioma vem do jogo ($.Language(), ex.: "brazilian",
// "english", "spanish") ou de data/config.json "idioma" ("pt", "en", "es"). Chave que falta num
// idioma usa a do português; chave que falta em todos aparece crua (fácil de achar e traduzir).

var TEXTOS = DU_DATA.textos || {};
var IDIOMA = (function () {
  var cfg = String((DU_DATA.config || {}).idioma || "").toLowerCase();
  if (TEXTOS[cfg]) return cfg;
  var jogo = "";
  try { jogo = String($.Language() || "").toLowerCase(); } catch (e) {}
  if (/portug|brazil/.test(jogo)) return "pt";
  if (/spanish|latam/.test(jogo)) return "es";
  if (jogo) return TEXTOS.en ? "en" : "pt";
  return "pt";
})();

// T("almas", 800) -> "800 almas". Os valores entram no lugar de {1}, {2}...
function T(chave) {
  var s = (TEXTOS[IDIOMA] || {})[chave];
  if (s == null) s = (TEXTOS.pt || {})[chave];
  if (s == null) return chave;
  for (var i = 1; i < arguments.length; i++) s = s.split("{" + i + "}").join(String(arguments[i]));
  return s;
}
