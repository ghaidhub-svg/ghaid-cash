/**
 * GHAID Cash · servidor (Google Apps Script)
 * A tela (app.html) e os dados iniciais ficam no Google Drive.
 * Os dados do sistema ficam na planilha "GHAID Cash · Dados", criada pela função instalar().
 */
var PASTA_ID = '1OYS1_92L9cEAbVHHv9dmFuONzd-VZDiH'; // pasta "GHAID Cash" no Drive
var APP_HTML = 'app.html';
var SEED = 'dados-iniciais.json';
var NUMEROS = ['valorMensal', 'valorNF', 'valorBoleto', 'issRetido'];
var CAB_ADIC = ['id', 'clienteId', 'cliente', 'mes', 'descricao', 'valor'];

// A tela vem do GitHub (atualiza sozinha a cada publicação). Se o GitHub falhar, usa a cópia do Drive.
var GITHUB_APP_URL = 'https://raw.githubusercontent.com/ghaidhub-svg/ghaid-cash/main/app.html';

function doGet() {
  var html = null;
  try {
    var r = UrlFetchApp.fetch(GITHUB_APP_URL, { muteHttpExceptions: true });
    if (r.getResponseCode() === 200) html = r.getContentText('UTF-8');
  } catch (e) {}
  if (!html) html = arquivo_(APP_HTML).getBlob().getDataAsString('UTF-8');
  return HtmlService.createHtmlOutput(html)
    .setTitle('GHAID Cash')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function instalar() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SHEET_ID')) {
    props.setProperty('SHEET_ID', SpreadsheetApp.create('GHAID Cash · Dados').getId());
  }
  var seed = JSON.parse(arquivo_(SEED).getBlob().getDataAsString('UTF-8'));
  var clientes = aba_('Clientes', ['id', 'cliente']);
  aba_('Adicionais', CAB_ADIC);
  aba_('Config', ['config']);
  if (clientes.getLastRow() < 2) {
    seed.clientes.forEach(function (c) {
      var id = c.id; delete c.id;
      salvarCliente(id, c, true);
    });
  }
  if (seed.config && !lerConfig()) salvarConfig(seed.config);
  var ss = planilha_();
  ['Página1', 'Sheet1', 'Planilha1'].forEach(function (n) {
    var s = ss.getSheetByName(n); if (s && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  Logger.log('Planilha pronta: ' + ss.getUrl());
  return ss.getUrl();
}

function arquivo_(nome) {
  var it = DriveApp.getFolderById(PASTA_ID).getFilesByName(nome);
  if (!it.hasNext()) throw new Error('Não achei o arquivo ' + nome + ' na pasta GHAID Cash do Drive.');
  return it.next();
}

function planilha_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Rode a função instalar primeiro.');
  return SpreadsheetApp.openById(id);
}

function aba_(nome, cab) {
  var ss = planilha_(), s = ss.getSheetByName(nome);
  if (!s) {
    s = ss.insertSheet(nome);
    s.getRange('A:Z').setNumberFormat('@');
    s.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold');
    s.setFrozenRows(1);
  }
  return s;
}

function tabela_(s) {
  var v = s.getDataRange().getValues();
  var h = (v.shift() || []).map(String);
  return { h: h, rows: v };
}

function listar() {
  var c = tabela_(aba_('Clientes', ['id', 'cliente']));
  var a = tabela_(aba_('Adicionais', CAB_ADIC));
  var itens = {};
  a.rows.forEach(function (r) {
    if (!r[0]) return;
    var k = String(r[1]);
    (itens[k] = itens[k] || []).push({ id: String(r[0]), mes: String(r[3]), desc: String(r[4]), valor: Number(String(r[5]).replace(',', '.')) || 0 });
  });
  return c.rows.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var o = {};
    c.h.forEach(function (k, i) {
      var v = r[i];
      if (v === '' || v === null) { o[k] = null; return; }
      if (NUMEROS.indexOf(k) >= 0) { var n = Number(String(v).replace(',', '.')); o[k] = isNaN(n) ? String(v) : n; }
      else if (k === 'arquivado') o[k] = String(v).toLowerCase() === 'true';
      else o[k] = String(v);
    });
    o.id = String(r[0]);
    o.adicionaisItens = itens[o.id] || [];
    return o;
  });
}

function salvarCliente(id, dados, substituir) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = aba_('Clientes', ['id', 'cliente']);
    var t = tabela_(s);
    var chaves = Object.keys(dados).filter(function (k) { return k !== 'adicionaisItens' && k !== 'id'; });
    chaves.forEach(function (k) {
      if (t.h.indexOf(k) < 0) { t.h.push(k); s.getRange(1, t.h.length).setValue(k).setFontWeight('bold'); }
    });
    var idx = -1;
    t.rows.forEach(function (r, i) { if (String(r[0]) === id) idx = i; });
    var linha = (idx >= 0 && !substituir) ? t.rows[idx].slice() : [id];
    while (linha.length < t.h.length) linha.push('');
    chaves.forEach(function (k) {
      var v = dados[k];
      linha[t.h.indexOf(k)] = (v === null || v === undefined) ? '' : String(v);
    });
    var n = idx >= 0 ? idx + 2 : s.getLastRow() + 1;
    s.getRange(n, 1, 1, linha.length).setNumberFormat('@').setValues([linha]);
    if (dados.adicionaisItens) salvarItens_(id, linha[t.h.indexOf('cliente')], dados.adicionaisItens);
  } finally { lock.releaseLock(); }
  return true;
}

function salvarItens_(id, nome, itens) {
  var s = aba_('Adicionais', CAB_ADIC), t = tabela_(s);
  for (var i = t.rows.length - 1; i >= 0; i--) if (String(t.rows[i][1]) === id) s.deleteRow(i + 2);
  if (!itens.length) return;
  var linhas = itens.map(function (x) {
    return [x.id || Utilities.getUuid().slice(0, 8), id, nome || '', x.mes, x.desc || '', String(x.valor || 0)];
  });
  s.getRange(s.getLastRow() + 1, 1, linhas.length, CAB_ADIC.length).setNumberFormat('@').setValues(linhas);
}

function excluirCliente(id) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = aba_('Clientes', ['id', 'cliente']), t = tabela_(s);
    for (var i = t.rows.length - 1; i >= 0; i--) if (String(t.rows[i][0]) === id) s.deleteRow(i + 2);
    salvarItens_(id, '', []);
  } finally { lock.releaseLock(); }
  return true;
}

function lerConfig() {
  var v = aba_('Config', ['config']).getRange('A2').getValue();
  return v ? JSON.parse(v) : null;
}

function salvarConfig(cfg) {
  aba_('Config', ['config']).getRange('A2').setNumberFormat('@').setValue(JSON.stringify(cfg));
  return true;
}
