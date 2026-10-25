// Interface: carrega os JSON de data/, guarda o estado da partida e desenha tudo.
(function () {
  "use strict";

  const ARQUIVOS_REGRAS = ["data/rules/contra-tags.json", "data/rules/composicao-time.json"];
  const N_ALIADOS = 5;
  const N_INIMIGOS = 6;
  const CHAVE_SALVO = "dsa-estado-v1";
  const NOMES_CATEGORIA = { weapon: "Arma", vitality: "Vitalidade", spirit: "Spirit" };
  const NOMES_PERIGO = { 1: "Atenção", 2: "Perigoso", 3: "Muito perigoso" };

  let dados;
  let estado;

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v);
    }
    for (const f of filhos.flat()) if (f !== null && f !== undefined) e.append(f);
    return e;
  };

  function estadoVazio() {
    return {
      meuHeroi: "",
      aliados: Array(N_ALIADOS).fill(""),
      inimigos: Array.from({ length: N_INIMIGOS }, () => ({ heroi: "", itens: [] })),
      meusItens: [],
      tiers: [1, 2, 3, 4],
      souls: null,
    };
  }

  function carregarSalvo() {
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE_SALVO));
      if (s && Array.isArray(s.inimigos)) return { ...estadoVazio(), ...s };
    } catch (_) { /* sem storage: segue com estado vazio */ }
    return estadoVazio();
  }

  function salvar() {
    try { localStorage.setItem(CHAVE_SALVO, JSON.stringify(estado)); } catch (_) {}
  }

  async function buscarJson(caminho) {
    const r = await fetch(caminho, { cache: "no-cache" });
    if (!r.ok) throw new Error(`${caminho}: HTTP ${r.status}`);
    return r.json();
  }

  async function iniciar() {
    try {
      const [items, heroes, ameacas, builds, countersHerois, ...regrasArquivos] = await Promise.all([
        buscarJson("data/items.json"),
        buscarJson("data/heroes.json"),
        buscarJson("data/rules/itens-inimigos.json"),
        buscarJson("data/builds.json"),
        buscarJson("data/rules/counters-herois.json"),
        ...ARQUIVOS_REGRAS.map(buscarJson),
      ]);
      dados = DeadlockEngine.prepararDados({ items, heroes, regrasArquivos, ameacas, builds, countersHerois });
    } catch (err) {
      document.body.prepend(el("div", { class: "erro-carga" },
        "Não consegui carregar os dados (", String(err.message), "). ",
        "Abra pelo iniciar.bat (precisa de um servidor local) ou pela página do GitHub Pages."));
      return;
    }
    estado = carregarSalvo();
    montarFixos();
    desenhar();
  }

  // ---------- partes que não mudam ----------
  function opcoesHerois(selecionado) {
    const nomes = Object.keys(dados.herois).sort((a, b) => a.localeCompare(b));
    return [el("option", { value: "" }, "— vazio —"),
      ...nomes.map((n) => el("option", { value: n, selected: n === selecionado }, n))];
  }

  function itemPorNome(texto) {
    const t = texto.trim().toLowerCase();
    if (!t) return null;
    return dados.itens.find((i) => i.nome.toLowerCase() === t)
      || dados.itens.find((i) => i.nome.toLowerCase().startsWith(t)) || null;
  }

  function ligarInputItem(input, aoAdicionar) {
    const tentar = () => {
      const item = itemPorNome(input.value);
      if (item) { aoAdicionar(item.id); input.value = ""; }
    };
    input.addEventListener("change", tentar);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") tentar(); });
  }

  function montarFixos() {
    const dl = $("#lista-itens");
    dl.replaceChildren(...dados.itens.map((i) =>
      el("option", { value: i.nome }, `${NOMES_CATEGORIA[i.categoria]} T${i.tier}`)));

    $("#meu-heroi").addEventListener("change", (e) => { estado.meuHeroi = e.target.value; atualizar(); });
    ligarInputItem($("#meus-itens-input"), (id) => {
      if (!estado.meusItens.includes(id)) estado.meusItens.push(id);
      atualizar();
    });
    $("#souls").addEventListener("input", (e) => {
      estado.souls = e.target.value === "" ? null : Number(e.target.value);
      salvar(); desenharSaida();
    });
    $("#nova-partida").addEventListener("click", () => {
      if (!confirm("Limpar heróis e itens da partida atual?")) return;
      const tiers = estado.tiers;
      estado = estadoVazio();
      estado.tiers = tiers;
      atualizar();
    });
  }

  // ---------- desenho ----------
  function atualizar() { salvar(); desenhar(); }

  function desenhar() {
    $("#meu-heroi").replaceChildren(...opcoesHerois(estado.meuHeroi));
    $("#souls").value = estado.souls ?? "";
    desenharAliados();
    desenharChips($("#meus-itens"), estado.meusItens, (id) => {
      estado.meusItens = estado.meusItens.filter((x) => x !== id); atualizar();
    });
    desenharInimigos();
    desenharSaida();
  }

  function desenharAliados() {
    $("#aliados").replaceChildren(...estado.aliados.map((nome, i) =>
      el("label", { class: "campo" }, `Aliado ${i + 1}`,
        el("select", { onchange: (e) => { estado.aliados[i] = e.target.value; atualizar(); } },
          opcoesHerois(nome)))));
  }

  function chipItem(id, aoRemover) {
    const it = dados.itensPorId[id];
    const nome = it ? it.nome : id;
    const cat = it ? it.categoria : "";
    return el("span", { class: `chip cat-${cat}` },
      el("span", { class: "chip-tier" }, it ? `T${it.tier}` : "?"), nome,
      el("button", { class: "x", title: "Remover", "aria-label": `Remover ${nome}`, onclick: () => aoRemover(id) }, "×"));
  }

  function desenharChips(alvo, ids, aoRemover) {
    alvo.replaceChildren(...ids.map((id) => chipItem(id, aoRemover)));
  }

  function desenharInimigos() {
    $("#inimigos").replaceChildren(...estado.inimigos.map((ini, i) => {
      const heroi = dados.herois[ini.heroi];
      const input = el("input", { list: "lista-itens", placeholder: "+ item que ele comprou", autocomplete: "off" });
      ligarInputItem(input, (id) => {
        if (!ini.itens.includes(id)) ini.itens.push(id);
        atualizar();
      });
      const chips = el("div", { class: "chips" });
      desenharChips(chips, ini.itens, (id) => { ini.itens = ini.itens.filter((x) => x !== id); atualizar(); });

      return el("div", { class: "card-inimigo" + (ini.heroi ? "" : " vazio") },
        el("select", { class: "sel-inimigo", "aria-label": `Inimigo ${i + 1}`,
          onchange: (e) => { ini.heroi = e.target.value; atualizar(); } }, opcoesHerois(ini.heroi)),
        heroi ? el("div", { class: "tags" }, heroi.tags.map((t) => el("span", { class: "tag" }, t))) : null,
        heroi ? el("p", { class: "nota" }, heroi.nota,
          heroi.confianca === "baixa" ? el("em", { class: "revisar" }, " (dados a revisar)") : null) : null,
        input, chips);
    }));
  }

  function desenharSaida() {
    const r = DeadlockEngine.recomendar(dados, estado);

    // Alertas
    $("#alertas").replaceChildren(...(r.alertas.length ? r.alertas.map((a) =>
      el("div", { class: `alerta perigo-${a.perigo}` },
        el("div", { class: "alerta-cab" },
          el("strong", {}, a.nomeItem), el("span", { class: "quem" }, ` — ${a.heroi}`),
          el("span", { class: "nivel" }, NOMES_PERIGO[a.perigo])),
        el("p", {}, a.alerta),
        el("p", { class: "dica" }, "💡 ", a.dica))) :
      [el("p", { class: "vazio-msg" }, "Nenhum item perigoso anotado nos inimigos.")]));

    // Filtro de tiers
    $("#filtro-tiers").replaceChildren(...[1, 2, 3, 4].map((t) =>
      el("button", {
        class: "tier-btn" + (estado.tiers.includes(t) ? " on" : ""),
        "aria-pressed": String(estado.tiers.includes(t)),
        onclick: () => {
          estado.tiers = estado.tiers.includes(t) ? estado.tiers.filter((x) => x !== t) : [...estado.tiers, t].sort();
          salvar(); desenharSaida();
        },
      }, `T${t}`)));

    // Recomendações
    const souls = estado.souls;
    const recs = r.recomendacoes.slice(0, 12);
    $("#recomendacoes").replaceChildren(...(recs.length ? recs.map((rec, idx) => {
      const it = rec.item;
      const podeComprar = souls == null || souls >= it.custo;
      return el("details", { class: `rec cat-${it.categoria}` + (podeComprar ? "" : " caro"), open: idx < 3 },
        el("summary", {},
          el("span", { class: "rec-nome" }, it.nome, it.ativo ? el("span", { class: "ativo" }, "ATIVO") : null),
          el("span", { class: "rec-meta" }, `${NOMES_CATEGORIA[it.categoria]} · T${it.tier} · ${it.custo}`),
          el("span", { class: "barra", style: `--v:${Math.min(rec.pontos / 10, 1)}` })),
        el("ul", {}, rec.motivos.map((m) =>
          el("li", {}, el("b", {}, m.titulo), m.origem.length ? ` (${m.origem.join(", ")})` : "", ": ", m.texto))));
    }) : [el("p", { class: "vazio-msg" }, "Escolha os heróis inimigos para receber recomendações.")]));

    $("#avisos").replaceChildren(...[...new Set(r.avisos)].map((a) => el("p", {}, "⚙ ", a)));
  }

  iniciar();
})();
