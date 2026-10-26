# Como contribuir

O conhecimento do advisor está todo em JSON dentro de `data/`. Você **não precisa saber programar** para melhorar as recomendações.

Antes de mandar um PR, rode o validador:

```
powershell -ExecutionPolicy Bypass -File tools\validar.ps1
```

E teste abrindo o `iniciar.bat`.

## 1. Itens: `data/items.json`

```json
{ "id": "toxic-bullets", "nome": "Toxic Bullets", "categoria": "weapon", "tier": 3 }
```

- `id`: nome em minúsculas com hífens, sem apóstrofo (`Diviner's Kevlar` → `diviners-kevlar`). As regras usam o id.
- `categoria`: `weapon`, `vitality` ou `spirit`. `tier`: 1 a 4. `"ativo": true` se o item tem ativação.
- `nome_pt`: nome do item no jogo em português (vem de `citadel_gc_mod_names_brazilian.txt`).
- `classes`: id interno do item no jogo (`upgrade_...`). `icones`: caminhos das imagens do item (de `scripts/abilities.vdata`, campos `m_strAbilityImage` e `m_strShopIconLarge`). **O mod usa os ícones para reconhecer os itens no placar**: se um item novo não for reconhecido, o console mostra `[ShopAdvisor] ícones sem item mapeado: ...`; adicione o caminho em `icones`.
- Item renomeado no patch? Mude o `nome` e mantenha o `id`. Item removido? Apague e corrija as regras que o citam (o validador aponta).

## 2. Heróis e tags: `data/heroes.json`

```json
"Haze": { "tags": ["gun","burst","stealth","stun","channel-ult"], "nota": "…", "confianca": "alta" }
```

As tags descrevem o que o herói **faz**. Use só estas:

| tag | significado |
|---|---|
| `gun` | dano principal vem da arma |
| `spirit` | dano principal vem de habilidades |
| `melee` | depende muito de corpo a corpo |
| `burst` | consegue matar um alvo rapidamente com combo |
| `sustain` | se cura muito / roubo de vida no kit |
| `healer` | cura aliados |
| `stun` | stun, sleep, knock-up, puxão |
| `silence` | silence ou disarm |
| `slow` | slows, roots |
| `dot` | dano ao longo do tempo, sangramento |
| `mobility` | muito móvel (dash, voo, teleporte) |
| `stealth` | invisibilidade |
| `channel-ult` | ultimate canalizada (dá pra interromper) |
| `summons` | invoca unidades/torretas |
| `tank` | muito resistente, linha de frente |
| `airborne` | fica muito no ar |
| `area` | muito dano/controle em área |
| `shield` | dá barreiras/escudos |

Quer uma tag nova? Adicione em `tools/validar.ps1` (`$tagsValidas`), nesta tabela, e crie a regra que a usa.

`confianca`: `alta` (kit conferido), `media`, `baixa` (precisa de revisão: aparece "dados a revisar" na interface).

## 3. Regras: `data/rules/contra-tags.json` e `composicao-time.json`

```json
{
  "id": "anti-cura",
  "titulo": "Inimigos com muita cura própria",
  "quando": { "inimigos_tag": "sustain" },
  "recomendar": [
    { "item": "toxic-bullets", "peso": 3, "meu_heroi_tag": "gun", "motivo": "…" },
    { "item": "healbane", "peso": 3, "meu_heroi_tag": "spirit", "motivo": "…" }
  ]
}
```

**Condições do `quando`** (todas precisam ser verdadeiras):

| condição | exemplo | dispara quando |
|---|---|---|
| `inimigos_tag` + `min` | `"inimigos_tag": "stun", "min": 2` | pelo menos `min` inimigos têm a tag (padrão 1). Cada inimigo extra aumenta a força da recomendação. |
| `aliados_tag` + `min` | `"aliados_tag": "gun", "min": 4` | seu time (você + aliados) tem pelo menos `min` heróis com a tag |
| `aliados_sem_tag` | `"aliados_sem_tag": "healer"` | ninguém do seu time tem a tag |
| `inimigo_heroi` | `"inimigo_heroi": "Haze"` ou `["Haze","Wraith"]` | algum desses heróis está no time inimigo |
| `meu_heroi` | `"meu_heroi": "Seven"` | você está jogando com esse herói |
| `meu_heroi_tag` | `"meu_heroi_tag": "spirit"` | seu herói tem a tag |

**Cada recomendação:**

- `item`: id do item.
- `peso`: 1 = situacional, 2 = bom, 3 = forte, 4 = quase obrigatório.
- `motivo`: frase curta explicando **por que** (é o que o jogador lê).
- `meu_heroi_tag` (opcional): só recomenda se o seu herói tiver essa tag. Use para separar versões de arma e spirit do mesmo counter (Toxic Bullets × Healbane).

## 4. Itens perigosos do inimigo: `data/rules/itens-inimigos.json`

```json
{
  "item": "knockdown", "perigo": 3,
  "alerta": "O que o item faz contra você.",
  "dica": "Como jogar contra.",
  "counters": [ { "item": "debuff-reducer", "peso": 2, "motivo": "…" } ]
}
```

`perigo`: 1 = atenção, 2 = perigoso, 3 = muito perigoso. `counters` pode ser vazio (`[]`) quando a resposta é de jogabilidade, não de compra (ex.: "não use CC no Unstoppable").

## 5. Counters por herói: `data/rules/counters-herois.json`

```json
"Haze": [ { "item": "metal-skin", "peso": 2, "motivo": "O Bullet Dance é dano de bala." } ]
```

Vale quando o herói está no time inimigo. Também dá para editar **dentro do jogo** (aba Deadlock Utils > Editar counters) e mandar o código `DU1:...` para alguém incluir aqui.

## 6. Builds: `data/builds.json` (gerado)

Gerado por `tools\atualizar-builds.ps1` a partir dos dados de popularidade que o próprio jogo traz (`m_PopularItems` em `scripts/heroes.vdata`): para cada herói e fase (`inicio`/`meio`/`fim`), `[item, % de escolha, % de vitória]`. Não edite à mão: rode o script depois de um patch.

## 7. Traduções

O mod tem inglês (padrão), português (pt-BR), espanhol e russo; o jogador troca em Configurações > Idioma (o `install.bat` da raiz também grava um idioma padrão no `.vpk`).

- **Interface: `data/textos.json`.** Um bloco por idioma (`"en"`, `"pt"`, `"es"`, `"ru"`) com as mesmas chaves. `{1}` e `{2}` são trocados pelo herói, a fase etc. Chave que faltar num idioma usa o texto em inglês. Nos layouts (`mod/layout/*.xml`), um Label com `text="@chave"` usa a chave daqui. Os títulos dos cartazes da aba (`cartaz.*`) ficam melhores curtos: são escritos em letras grandes. Nomes das camadas do mapa: `camada.<id>` e `camada.<id>.desc`.
- **Regras: `data/rules/*.json`.** `titulo`, `motivo`, `alerta` e `dica` são objetos `{ "en": "...", "pt": "...", "es": "...", "ru": "..." }`. Um texto simples (`"motivo": "..."`) também funciona: aparece igual em todos os idiomas. Ao traduzir, use os nomes oficiais dos itens no idioma (estão em `game\citadel\resource\localization\citadel_gc_mod_names\`).
- **Nomes de itens** vêm da localização do próprio jogo no build; não precisa traduzir.
- Novo idioma: acrescente o bloco em `textos.json`, a chave nos objetos das regras, o código em `IDIOMAS` (`mod/src/05-textos.js` e `tools/pacote/instalar.ps1`, com os textos do instalador) e o arquivo de nomes de itens em `tools/build-mod.ps1` (`$arqIdioma`).

## Boas práticas

- Um PR por assunto ("anti-cura revisado para o patch X"), dizendo **o porquê**, idealmente com link de patch notes ou da wiki.
- Prefira motivos curtos e concretos, com números quando ajudar ("-35% de cura por 8s").
- Não aumente pesos só porque o item é forte em geral: o advisor é sobre **counters à partida atual**, não tier list.
