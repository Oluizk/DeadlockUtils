// Motor de recomendação: recebe os dados (data/*.json) e o estado da partida e devolve
//   - build:    itens da build do SEU herói na fase atual (dados de popularidade do próprio jogo)
//   - counters: itens contra o time inimigo (regras por tag, por herói e por item comprado)
//   - recomendacoes: as duas listas somadas
//   - alertas:  itens perigosos que os inimigos compraram
// Não mexe em UI: roda no navegador (app/) e dentro do jogo (mod/, V8 do Panorama).
// Evite sintaxe muito nova (??, ?., flatMap, spread de objeto): o V8 do jogo pode não ter.
(function (global) {
  "use strict";

  const FATOR_MAX = 2.5;
  const PESO_BUILD = 4;          // item que 100% dos jogadores compram vale 4 pontos
  const PESO_PROXIMA_FASE = 0.4; // itens da próxima fase aparecem com peso menor
  const FASES = ["inicio", "meio", "fim"];
  const NOME_FASE = { inicio: "no início", meio: "no meio do jogo", fim: "no fim do jogo" };

  function criarContexto(dados, estado) {
    const herois = dados.herois;
    const tagsDe = (nome) => (herois[nome] && herois[nome].tags) || [];
    const inimigos = estado.inimigos.map((i) => i.heroi).filter(Boolean);
    const time = [estado.meuHeroi].concat(estado.aliados).filter(Boolean);
    return {
      tagsDe,
      inimigos,
      time,
      meuHeroi: estado.meuHeroi,
      minhasTags: tagsDe(estado.meuHeroi),
      comTag: (lista, tag) => lista.filter((n) => tagsDe(n).indexOf(tag) >= 0),
    };
  }

  // Avalia o bloco "quando" de uma regra. Todas as condições precisam ser verdadeiras.
  // Retorna null (não dispara) ou { fator, origem }.
  function avaliar(quando, ctx) {
    const min = quando.min != null ? quando.min : 1;
    let fator = 1;
    let origem = [];

    if (quando.inimigos_tag) {
      const m = ctx.comTag(ctx.inimigos, quando.inimigos_tag);
      if (m.length < min) return null;
      // Mais inimigos com a tag = recomendação mais forte (com teto).
      fator = Math.min(1 + 0.5 * (m.length - min), FATOR_MAX);
      origem = m;
    }
    if (quando.aliados_tag) {
      const m = ctx.comTag(ctx.time, quando.aliados_tag);
      if (m.length < min) return null;
    }
    if (quando.aliados_sem_tag) {
      if (ctx.time.length === 0) return null;
      if (ctx.comTag(ctx.time, quando.aliados_sem_tag).length > 0) return null;
    }
    if (quando.inimigo_heroi) {
      const alvos = [].concat(quando.inimigo_heroi);
      const m = ctx.inimigos.filter((n) => alvos.indexOf(n) >= 0);
      if (m.length === 0) return null;
      origem = origem.concat(m);
    }
    if (quando.meu_heroi) {
      if ([].concat(quando.meu_heroi).indexOf(ctx.meuHeroi) < 0) return null;
    }
    if (quando.meu_heroi_tag) {
      if (ctx.minhasTags.indexOf(quando.meu_heroi_tag) < 0) return null;
    }
    return { fator, origem };
  }

  // Fase pelo relógio da partida (segundos). Ajustável pela comunidade.
  function faseDoTempo(segundos) {
    if (segundos == null) return "inicio";
    if (segundos < 12 * 60) return "inicio";
    if (segundos < 25 * 60) return "meio";
    return "fim";
  }

  function fmt(n) { return String(Math.round(n)); }

  function recomendar(dados, estado) {
    const ctx = criarContexto(dados, estado);
    const itensPorId = dados.itensPorId;
    const meusItens = {};
    (estado.meusItens || []).forEach((id) => { meusItens[id] = true; });
    const avisos = [];
    const pontuacao = {};
    const ordem = [];
    const nomeDe = (item) => (estado.nomesPt && item.nome_pt) || item.nome;

    function somar(tipo, rec, pontos, titulo, origem) {
      const item = itensPorId[rec.item];
      if (!item) {
        avisos.push("Regra \"" + titulo + "\" cita item inexistente: " + rec.item);
        return;
      }
      // Filtra variantes de arma/spirit pelo seu herói (se ele for conhecido).
      if (rec.meu_heroi_tag && ctx.meuHeroi && ctx.minhasTags.indexOf(rec.meu_heroi_tag) < 0) return;
      if (meusItens[rec.item]) return;

      let e = pontuacao[rec.item];
      if (!e) {
        e = { item, pontos: 0, pontosBuild: 0, pontosCounter: 0, motivos: [] };
        pontuacao[rec.item] = e;
        ordem.push(rec.item);
      }
      e.pontos += pontos;
      if (tipo === "build") e.pontosBuild += pontos; else e.pontosCounter += pontos;
      e.motivos.push({ tipo, titulo, texto: rec.motivo, origem: origem || [] });
    }

    // 1) Build do seu herói (fase atual + prévia da próxima).
    const fase = estado.fase || "inicio";
    const build = ctx.meuHeroi && dados.builds && dados.builds[ctx.meuHeroi];
    if (build) {
      const iFase = FASES.indexOf(fase);
      [[fase, 1], [FASES[iFase + 1], PESO_PROXIMA_FASE]].forEach(function (par) {
        const f = par[0];
        if (!f || !build[f]) return;
        build[f].forEach(function (linha) {
          const pick = linha[1], win = linha[2];
          const pontos = par[1] * (PESO_BUILD * pick / 100 + Math.max(0, win - 50) / 5);
          somar("build", {
            item: linha[0],
            motivo: fmt(pick) + "% dos jogadores de " + ctx.meuHeroi + " compram " + NOME_FASE[f] +
              " (" + win.toFixed(1).replace(".", ",") + "% de vitória).",
          }, pontos, f === fase ? "Build" : "Próxima fase", []);
        });
      });
    }

    // 2) Regras por tag / composição.
    for (const regra of dados.regras) {
      const r = avaliar(regra.quando || {}, ctx);
      if (!r) continue;
      for (const rec of regra.recomendar) somar("counter", rec, rec.peso * r.fator, regra.titulo, r.origem);
    }

    // 3) Counters por herói inimigo (o editor do jogo pode sobrescrever).
    const porHeroi = Object.assign({}, dados.countersHerois || {}, (estado.overrides && estado.overrides.herois) || {});
    ctx.inimigos.forEach(function (h) {
      (porHeroi[h] || []).forEach(function (rec) { somar("counter", rec, rec.peso, "Contra " + h, [h]); });
    });

    // 4) Itens perigosos comprados pelos inimigos.
    const alertas = [];
    for (const inimigo of estado.inimigos) {
      for (const itemId of inimigo.itens) {
        const ameaca = dados.ameacasPorItem[itemId];
        if (!ameaca) continue;
        const nomeItem = itensPorId[itemId] ? nomeDe(itensPorId[itemId]) : itemId;
        const quem = inimigo.heroi || "Inimigo";
        alertas.push(Object.assign({}, ameaca, { itemId, nomeItem, heroi: quem }));
        for (const c of ameaca.counters) {
          // Ameaça mais perigosa pesa mais na recomendação.
          somar("counter", c, c.peso * (0.75 + 0.25 * ameaca.perigo), nomeItem + " de " + quem, [quem]);
        }
      }
    }
    alertas.sort((a, b) => b.perigo - a.perigo);

    const tiers = estado.tiers || [1, 2, 3, 4];
    const todos = ordem.map((id) => pontuacao[id]).filter((e) => tiers.indexOf(e.item.tier) >= 0);
    const porCampo = (campo) => todos.filter((e) => e[campo] > 0).sort((a, b) => b[campo] - a[campo]);

    return {
      fase,
      recomendacoes: todos.slice().sort((a, b) => b.pontos - a.pontos),
      build: porCampo("pontosBuild"),
      counters: porCampo("pontosCounter"),
      alertas,
      avisos,
    };
  }

  // Junta os arquivos JSON num formato pronto pro motor.
  function prepararDados(arq) {
    const itensPorId = {};
    for (const it of arq.items.itens) itensPorId[it.id] = Object.assign({}, it, { custo: arq.items.custos[it.tier] });
    const ameacasPorItem = {};
    for (const a of arq.ameacas.itens) ameacasPorItem[a.item] = a;
    return {
      itens: arq.items.itens.map((i) => itensPorId[i.id]),
      itensPorId,
      herois: arq.heroes.herois,
      regras: [].concat.apply([], arq.regrasArquivos.map((f) => f.regras)),
      ameacasPorItem,
      builds: arq.builds ? arq.builds.herois : {},
      countersHerois: arq.countersHerois ? arq.countersHerois.herois : {},
    };
  }

  global.DeadlockEngine = { recomendar, prepararDados, avaliar, faseDoTempo, FASES };
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
