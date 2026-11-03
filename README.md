# GHAID Cash

Sistema financeiro da GHAID: tabela de clientes, valores do plano, adicionais do mês, total do mês e painel de resumo.

- **Tela:** `app.html` (servida pelo Google Apps Script, que busca este arquivo direto do GitHub).
- **Servidor:** `Code.gs` (Google Apps Script, conta ghaidhub@gmail.com).
- **Dados:** planilha "GHAID Cash · Dados" no Google Drive (abas Clientes, Adicionais e Config). Os dados não ficam neste repositório.

Qualquer alteração em `app.html` na branch `main` aparece no app em até ~5 minutos.
Alterações em `Code.gs` precisam ser coladas no Apps Script e publicadas em Implantar > Gerenciar implantações > Editar > Nova versão.
