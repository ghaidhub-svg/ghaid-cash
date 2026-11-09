# Contexto para o Claude

Projeto da Morghs (chamar sempre de Morghs). Responder em português, direto, sem travessão, sem jargão corporativo, sem emoji.

## Arquitetura
- `app.html`: página única (HTML/CSS/JS). Publicada no `main`, o Apps Script busca de
  `https://raw.githubusercontent.com/ghaidhub-svg/ghaid-cash/main/app.html`. Mudança de tela = editar este arquivo e dar push no `main`.
- `Code.gs`: servidor Apps Script. Funções chamadas pela tela via `google.script.run`: `listar`, `salvarCliente(id, dados, substituir)`, `excluirCliente(id)`, `lerConfig`, `salvarConfig`.
  Mudança aqui exige colar no editor do Apps Script e criar nova versão da implantação (mesmo URL).
- Dados: planilha "GHAID Cash · Dados" (Drive da conta ghaidhub@gmail.com). Nunca colocar dados de clientes no repositório (ele é público).
- Pasta do Drive "GHAID Cash": 1OYS1_92L9cEAbVHHv9dmFuONzd-VZDiH (tem cópia de app.html como reserva).

## Identidade visual (regras da marca)
- Cores: Process Black C #211E16 (70%), Wispy Clouds #F1EFEE (20%), vermelho 2347 XGC #E01900 (10%). Nada de laranja.
  Verde só como verde-limão (claro #5E9F0B, escuro #A3E635).
- Tipografia: Montserrat em tudo.
- Logo: GHAID Cash escura no modo diurno, clara no noturno. Nunca distorcer ou cortar logo ou símbolo.
- Modo diurno e noturno: tudo troca junto (usar tokens no :root).
- Padrão: um raio de canto (--r: 8px), controles com 40px de altura, cards na mesma grade.
- Layout centralizado com margens laterais generosas.

## Publicação
- Morghs autorizou push direto no `main` para alterações no `app.html`, em todos os pedidos (sem precisar perguntar o branch).
- Antes de publicar: conferir sintaxe do JS, abrir a página num navegador de teste sem erro no console, checar modo diurno, noturno e tela de celular, e as regras da marca.
- Se algo quebrar: `git revert` do commit e push no `main` para voltar à versão anterior.
- A autorização vale só para o `app.html`. Outros arquivos: perguntar antes.

## Limites do Apps Script (tela escura)
- A página fica escura (sem erro visível, só servida pelo Apps Script; no navegador de teste abre normal) quando o JS tem certos trechos que o Apps Script lê errado. Casos confirmados por teste em 09/11/2026:
  - a sequência `/*` dentro de texto (ex.: `accept='image/*'`); trocar por `image/jpeg,image/png`;
  - expressão regular com grupo `(?:...)` e parêntese dentro de colchete (ex.: `[^)]*\)`); usar `indexOf`, `startsWith`, `slice`.
- Regra: no JS, nada de `/*` ou `*/` fora de comentário de verdade, e só expressões regulares simples.
- Tamanho: não ficou provado que existe limite (o teste com 303 mil bytes foi feito em cima de uma versão já quebrada). 287.994 bytes abriu. Por precaução, manter o `app.html` abaixo de ~288 mil bytes até um teste limpo; se precisar de espaço, tirar comentários e espaços.
- Depois de publicar, pedir para a Morghs recarregar com Ctrl+Shift+R e confirmar que abriu. Se ficar escuro, voltar na hora para a última versão que abriu e procurar esses trechos no que mudou.
