// ===================== Compatibilidade: QOL Lock e as duas versões do mod =====================
// O "gerenciador por baixo": descobre o que mais está rodando no HUD e ajusta o mod.
//   QOL Lock (civo, GameBanana 650634): substitui hud.xml, placar, vida, loja e menu ESC. A versão normal
//     briga com ele (só um hud.xml vale); o addon (DU_ALVO "qol", carregado pelo hud_playerintents.xml,
//     que o QOL não substitui) roda junto. O QOL é reconhecido pelo botão e pela janela dele no menu ESC,
//     ou pelo atributo com a configuração dele na raiz do HUD.
//   Instância única: com as duas versões instaladas, os dois scripts rodariam; o addon cede para a normal.

var compat = { checado: false, qol: false, qolVersao: "", qolIdioma: "", proximaChecagem: 0, semQolDesde: null, avisado: false, cedeu: false };
var ATR_INSTANCIA = "DeadlockUtils_Instancia"; // na raiz do HUD: "normal" ou "qol"
var ATR_CONFIG_QOL = "Deadlock_Mod_Settings_v1"; // {"schema":"4.0.5","data":{...}} (ql_shared_presets.js do QOL)
var ATR_REV_QOL = "QOL_USER_EDIT_REV";
// data.LANGUAGE do QOL (0..14) -> idioma do mod; os outros (uk, pl, bg, ja, zh, fr, by, ko, it, tr) não seguimos.
var IDIOMAS_QOL = { 0: "en", 1: "ru", 8: "pt", 9: "pt", 10: "es" };

function atributo(p, nome) { try { return valido(p) ? String(p.GetAttributeString(nome, "") || "") : ""; } catch (e) { return ""; } }

// A normal se anuncia na hora; o addon olha 1 s depois (90-principal.js) e, se a normal estiver lá, não liga.
function instanciaUnica() {
  if (ADDON_QOL && atributo(hud, ATR_INSTANCIA) === "normal") {
    compat.cedeu = true;
    modLigado = false;
    log("a versão normal do Deadlock Utils também está instalada: o addon do QOL Lock fica desligado");
    return false;
  }
  try { hud.SetAttributeString(ATR_INSTANCIA, ADDON_QOL ? "qol" : "normal"); } catch (e) {}
  return true;
}

// A configuração do QOL fica na raiz do HUD e no menu ESC; vale a de revisão maior (como o próprio QOL faz).
function lerConfigQol(menu) {
  var melhor = null, rev = -1;
  [hud, menu].forEach(function (p) {
    var t = atributo(p, ATR_CONFIG_QOL);
    if (!t) return;
    var r = parseInt(atributo(p, ATR_REV_QOL), 10) || 0;
    if (r < rev) return;
    try { melhor = JSON.parse(t); rev = r; } catch (e) {}
  });
  return melhor;
}

function detectarQol() {
  var menu = menuEsc();
  if (!menu || !valido(achar(menu, "SubOptions"))) return; // menu ESC ainda não montado
  var cfg = lerConfigQol(menu);
  var achou = valido(achar(menu, "ModSettingsBtn")) || valido(achar(menu, "SettingsWindow")) || !!cfg;
  if (achou && !compat.qol) log("QOL Lock detectado" + (cfg && cfg.schema ? " (v" + cfg.schema + ")" : ""));
  compat.checado = true;
  compat.qol = achou;
  if (cfg) {
    compat.qolVersao = String(cfg.schema || "");
    compat.qolIdioma = ADDON_QOL ? IDIOMAS_QOL[(cfg.data || {}).LANGUAGE] || "" : "";
  }
}

// Loop lento. Procura o QOL a cada 2 s até achar; depois relê a configuração dele a cada 5 s (idioma).
// Sem o QOL depois de 30 s com o menu ESC montado, procura só a cada 15 s (os ids dele não existem no jogo
// puro: a busca percorre o menu ESC inteiro).
function vigiarCompat(l) {
  if (agoraSeg >= compat.proximaChecagem) {
    if (compat.checado && !compat.qol && compat.semQolCheckDesde == null) compat.semQolCheckDesde = agoraSeg;
    var espera = compat.qol ? 5 : compat.semQolCheckDesde != null && agoraSeg - compat.semQolCheckDesde > 30 ? 15 : 2;
    compat.proximaChecagem = agoraSeg + espera;
    detectarQol();
    // Addon sem idioma escolhido no mod: segue o do QOL (05-textos.js, idiomaDoMod).
    if (ADDON_QOL && !ajustes.idioma && idiomaDoMod() !== IDIOMA) trocarIdioma("");
  }
  if (compat.avisado || !l.ativa || !compat.checado) return;
  if (!ADDON_QOL && compat.qol) {
    // A normal ganhou a prioridade do hud.xml: o HUD do QOL fica quebrado.
    compat.avisado = true;
    log("QOL Lock instalado junto com a versão normal: use o Deadlock Utils - QOL Addon");
    mostrarAvisoTexto(T("compat.qolNormal.titulo"), T("compat.qolNormal.texto"), true, 12);
  } else if (ADDON_QOL && !compat.qol) {
    if (compat.semQolDesde == null) compat.semQolDesde = agoraSeg;
    if (agoraSeg - compat.semQolDesde < 20) return;
    compat.avisado = true;
    log("addon do QOL Lock rodando sem o QOL Lock");
    mostrarAvisoTexto(T("compat.semQol.titulo"), T("compat.semQol.texto"), true, 12);
  }
}

// Botões "Deadlock Utils" e "Tracker" no menu ESC (70-tracker.js): no addon com o QOL, as configurações
// ficam na janela do QOL; sem ele (ou na versão normal), os botões entram no menu ESC do jogo.
function querBotaoEsc() { return !ADDON_QOL || (compat.checado && !compat.qol); }
// A janela de configurações do mod (76-central.js): no addon com o QOL ela não existe; tudo fica na aba
// "Deadlock Utils" da janela do QOL (78-qolaba.js). Sem o QOL, ela continua sendo o lugar das configurações.
function centralDisponivel() { return !(ADDON_QOL && compat.qol); }
