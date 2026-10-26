// ===================== Textos da interface (tradução) =====================
// data/textos.json tem um bloco por idioma (en, pt, es, ru). O idioma é escolhido no instalador, que
// grava o código no script já compilado (DU_IDIOMA, ver tools/build-mod.ps1 e tools/pacote/instalar.ps1).
// Sem escolha, inglês. Chave que falta num idioma usa a do inglês; que falta em todos aparece crua.
// Nos layouts (mod/layout/*.xml), um Label com text="@chave" é traduzido ao carregar (traduzirPainel).

var TEXTOS = DU_DATA.textos || {};
var IDIOMA = idiomaDoMod();

// function (não var): 00-base.js precisa do idioma antes deste arquivo rodar, por isso nada de variáveis aqui.
function idiomaDoMod() {
  var i = String(typeof DU_IDIOMA !== "undefined" ? DU_IDIOMA : "").toLowerCase();
  return ["en", "pt", "es", "ru"].indexOf(i) >= 0 ? i : "en";
}

// T("almas", 800) -> "800 souls". Os valores entram no lugar de {1}, {2}...
function T(chave) {
  var s = (TEXTOS[IDIOMA] || {})[chave];
  if (s == null) s = (TEXTOS.en || {})[chave];
  if (s == null) return chave;
  for (var i = 1; i < arguments.length; i++) s = s.split("{" + i + "}").join(String(arguments[i]));
  return s;
}
function temTexto(chave) { return (TEXTOS[IDIOMA] || {})[chave] != null || (TEXTOS.en || {})[chave] != null; }

// Labels de layout com text="@chave".
function traduzirPainel(p) {
  if (!valido(p)) return;
  try {
    var t = String(p.text || "");
    if (t.charAt(0) === "@") p.text = T(t.slice(1));
  } catch (e) {}
  filhos(p).forEach(traduzirPainel);
}
