# Como publicar o Deadlock Utils

Tudo o que dava para preparar daqui já está pronto. Falta só o que precisa da sua conta.

## 0. Antes de tudo

- [ ] Rode `powershell -ExecutionPolicy Bypass -File tools\empacotar.ps1`. Ele gera `dist\DeadlockUtils-v1.0.0.zip` (sem a sua conta Steam gravada; o script confere isso e cancela se achar).
- [ ] Teste o zip como um jogador novo faria: extraia numa pasta qualquer, rode `Desinstalar.bat`, depois `Instalar.bat`, abra o jogo e confira loja, Tab, mapa M e Configurações.
- [ ] Escolha uma licença para o repositório. Sugestão: **MIT** (simples, permite que outros usem e contribuam). No GitHub: **Add file > Create new file**, nome `LICENSE`, clique em **Choose a license template**.

## 1. Imagens e vídeo (o que mais faz diferença)

Tire prints em 1920x1080, de preferência numa partida real (ou no modo de testes, sem o painel "Ferramentas de teste" aparecendo):

1. **Aba da loja**: cabeçalho "Deadlock Utils" com o retrato do herói, seções Perigo, Build e Counters.
2. **Faixa do Tab**: Counters e Recomendados acima dos investimentos, com o tooltip aberto num item.
3. **Mapa M**: mapa grande com os pontos ligados e o painel lateral (relógio, buff da ponte).
4. **Minimapa** com os pontos pequenos.
5. **Configurações**: a tela com as opções.
6. **Tracker** (F6), se a ponte estiver funcionando.

Vídeo curto (30 a 60 s, sem som tudo bem): abrir a loja e a aba, segurar Tab e comprar um item pela faixa, apertar M e passar o mouse num ponto. Dá para gravar com a Barra de Jogo do Windows (Win + Alt + R).

Dica: o seu nome de jogador aparece nos prints (placar e topo). Se não quiser expor, use um nome diferente na hora de gravar.

## 2. Release no GitHub

1. Abra https://github.com/Oluizk/DeadlockUtils/releases/new
2. Em **Choose a tag**, escolha `v1.0.0` (já está no repositório).
3. Título: `Deadlock Utils 1.0.0`.
4. Descrição: copie `docs/publicar/release-1.0.0.md`.
5. Arraste `dist\DeadlockUtils-v1.0.0.zip` para a área de anexos.
6. **Publish release**.

O link para divulgar fica: https://github.com/Oluizk/DeadlockUtils/releases/latest

## 3. GameBanana

1. Crie a conta em https://gamebanana.com e entre.
2. Na página do Deadlock (procure "Deadlock" no site), clique em **Submit** e escolha **Mod**.
3. Categoria: a de interface/HUD (algo como "UI" ou "HUD").
4. Nome: `Deadlock Utils`.
5. Descrição: copie `docs/publicar/gamebanana-en.md` (a maior parte do público lê em inglês; dá para colar a versão em português logo abaixo, de `gamebanana-pt.md`).
6. Arquivo: `dist\DeadlockUtils-v1.0.0.zip`.
7. Imagens: os prints do passo 1 (a primeira imagem vira a capa: use a aba da loja ou o mapa).
8. Link do código: https://github.com/Oluizk/DeadlockUtils

## 4. Reddit

- r/DeadlockTheGame: título e texto em `docs/publicar/reddit-en.md`. Poste com o vídeo ou com um álbum de imagens; post só de texto chama pouca atenção.
- Leia as regras do subreddit antes (alguns pedem flair "Mod" ou proíbem links diretos para download; nesse caso, link para o GitHub).
- Para a comunidade brasileira (subreddits e grupos BR): `docs/publicar/reddit-pt.md`.

## 5. Discord

Servidores de modding de Deadlock costumam ter um canal de "showcase" ou "releases". Use a mensagem curta de `docs/publicar/discord.md`.

## 6. Depois de publicar

- Responda as dúvidas nas primeiras horas, faz diferença no alcance.
- Problemas de outras pessoas: peça para abrirem uma **Issue** no GitHub (com print e a versão do mod).
- **Patch do Deadlock:** se o HUD quebrar, rode `powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -AtualizarHud`, teste, aumente a versão em `tools\build-mod.ps1` (`$VersaoMod`), gere o pacote de novo e suba uma nova Release e uma atualização no GameBanana.
