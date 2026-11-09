# Contexto para o Claude

Projeto da Morghs (chamar sempre de Morghs). Responder em português, direto, sem travessão, sem jargão corporativo, sem emoji.

## Arquitetura
- `app.html`: página única (HTML/CSS/JS). Publicada no `main`, o Apps Script busca de
  `https://raw.githubusercontent.com/ghaidhub-svg/ghaid-cash/main/app.html`. Mudança de tela = editar este arquivo e dar push no `main`.
- `modulos.js`: janelas e painéis usados só por clique (Boletos, ficha do cliente, plano, nota fiscal, permuta, contrato, adicionais, publicações, colunas, acessos, agrupar). O `app.html` busca este arquivo em `https://raw.githubusercontent.com/ghaidhub-svg/ghaid-cash/main/modulos.js` logo ao abrir; até ele chegar, essas funções esperam. Funções novas desse tipo vão para o `modulos.js`.
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
- O Apps Script deixa a página escura (sem erro visível; no navegador de teste abre normal) em dois casos, confirmados por teste em 09/11/2026:
  - tamanho: quando o `app.html`, medido como o Google empacota (JSON do texto + 5 por caractere `< > & ' " =`), passa de ~368 mil. Abriu com 367.932; ficou escura com 368.364 e 372.431. Medir com:
    `node -e "const s=require('fs').readFileSync('app.html','utf8');console.log(JSON.stringify(s).length+5*[...'<>&\'\"='].reduce((t,c)=>t+s.split(c).length-1,0))"`
    Manter abaixo de 340 mil. Por isso o código das janelas fica no `modulos.js`.
  - trechos que o Apps Script lê errado: `/*` dentro de texto (ex.: `accept='image/*'`) e expressão regular complexa (`(?:...)`, parêntese dentro de colchete). No JS, nada de `/*` ou `*/` fora de comentário de verdade, e só expressões regulares simples (vale também para o `modulos.js`).
- Depois de publicar, pedir para a Morghs recarregar com Ctrl+Shift+R e confirmar que abriu. Se ficar escuro, voltar na hora para a última versão que abriu.
