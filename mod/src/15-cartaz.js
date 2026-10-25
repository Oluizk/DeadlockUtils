// ===================== Componente: cartaz no estilo da loja =====================
// A loja tem cartazes como "POPULAR ITEMS, grab 'em while they're hot!" e "WEAPON, Stock up!", mas o
// texto deles faz parte da imagem. Este componente monta o mesmo visual com texto de verdade (e por
// isso traduzível): a faixa de papel rasgado do próprio jogo (catalog_shop_builds_header_bg) tingida
// na cor do tema, pinceladas da categoria por cima, título na fonte pulp do jogo (alias "block") e um
// subtítulo inclinado, como os "Stock up!" da loja. Estilos em mod/estilo.css (.DUCartaz).
//
//   var c = cartaz(pai, { titulo: "Counters", sub: "contra este time", tema: "arma", tamanho: "medio" });
//   textoCartaz(c, null, "novo subtítulo");   // troca só o texto, sem recriar
//
// tema: "vermelho" | "arma" | "espirito" | "vitalidade" | "teal" | "escuro"
// tamanho: "grande" (cabeçalho da aba) | "medio" (seções)
// icone: caminho s2r:// (opcional), fica à esquerda do título e é tingido com a cor do texto.
function cartaz(pai, o) {
  o = o || {};
  var p = criar("Panel", pai, o.id || "", "DUCartaz DUCartaz_" + (o.tema || "vermelho") + " DUCartaz_" + (o.tamanho || "medio"));
  if (!p) return null;
  criar("Panel", p, "", "DUCartazFundo");
  criar("Panel", p, "", "DUCartazPinceladas");
  var conteudo = criar("Panel", p, "", "DUCartazConteudo");
  var c = { painel: p, conteudo: conteudo, icone: null };
  if (o.icone) c.icone = imagem(conteudo, "DUCartazIcone", o.icone);
  c.titulo = rotulo(conteudo, "DUCartazTitulo", esc(o.titulo || ""));
  c.sub = rotulo(conteudo, "DUCartazSub", esc(o.sub || ""));
  mostrarPainel(c.sub, !!o.sub);
  return c;
}
function textoCartaz(c, titulo, sub) {
  if (!c) return;
  if (titulo != null) c.titulo.text = esc(titulo);
  if (sub != null) { c.sub.text = esc(sub); mostrarPainel(c.sub, !!sub); }
}
