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

// Endereço do app.html da versão mais recente do GitHub. Cada versão tem um endereço próprio,
// então nunca vem uma cópia antiga guardada. Se a consulta falhar, usa o endereço do main.
function urlApp_() {
  var cache = CacheService.getScriptCache(), sha = cache.get('APP_SHA');
  if (!sha) {
    try {
      var r = UrlFetchApp.fetch('https://api.github.com/repos/ghaidhub-svg/ghaid-cash/commits/main',
        { muteHttpExceptions: true, headers: { Accept: 'application/vnd.github.sha' } });
      var t = r.getResponseCode() === 200 ? r.getContentText().trim() : '';
      if (/^[0-9a-f]{40}$/.test(t)) { sha = t; cache.put('APP_SHA', sha, 60); }
    } catch (e) {}
  }
  return sha ? 'https://raw.githubusercontent.com/ghaidhub-svg/ghaid-cash/' + sha + '/app.html' : GITHUB_APP_URL;
}

function doGet() {
  var html = null;
  try {
    var r = UrlFetchApp.fetch(urlApp_(), { muteHttpExceptions: true });
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
      salvarCliente_(id, c, true);
    });
  }
  if (seed.config && !lerConfig_()) salvarConfig_(seed.config);
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

function listar_() {
  var c = tabela_(aba_('Clientes', ['id', 'cliente']));
  var a = tabela_(aba_('Adicionais', CAB_ADIC));
  var itens = {};
  a.rows.forEach(function (r) {
    if (!r[0]) return;
    var k = String(r[1]);
    var vv = String(r[5]).trim();
    (itens[k] = itens[k] || []).push({ id: String(r[0]), mes: String(r[3]), desc: String(r[4]), valor: vv === '' ? null : (Number(vv.replace(',', '.')) || 0) });
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

function salvarCliente_(id, dados, substituir) {
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
    var v = (x.valor === null || x.valor === undefined || x.valor === '') ? '' : String(x.valor);
    return [x.id || Utilities.getUuid().slice(0, 8), id, nome || '', x.mes, x.desc || '', v];
  });
  s.getRange(s.getLastRow() + 1, 1, linhas.length, CAB_ADIC.length).setNumberFormat('@').setValues(linhas);
}

function excluirCliente_(id) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = aba_('Clientes', ['id', 'cliente']), t = tabela_(s);
    for (var i = t.rows.length - 1; i >= 0; i--) if (String(t.rows[i][0]) === id) s.deleteRow(i + 2);
    salvarItens_(id, '', []);
  } finally { lock.releaseLock(); }
  return true;
}

function lerConfig_() {
  var v = aba_('Config', ['config']).getRange('A2').getValue();
  return v ? JSON.parse(v) : null;
}

function salvarConfig_(cfg) {
  aba_('Config', ['config']).getRange('A2').setNumberFormat('@').setValue(JSON.stringify(cfg));
  return true;
}

/* ================= Acesso: login, papéis e o que cada um pode ver =================
 * Papéis: 'dona' vê e edita tudo. 'assistente' vê e edita só dados de cadastro,
 * vê o Tipo e lança adicionais sem valor. Valores, Observações e Status nunca
 * saem do servidor para a assistente. Senhas ficam como hash nas propriedades do script.
 */
var VE_ASSIST = ['cliente', 'publicacoes', 'pubPlano', 'arquivado'];
// A assistente só altera publicações (e lança adicionais sem valor). Cadastrar cliente é só com a dona.
var EDITA_ASSIST = ['publicacoes', 'pubPlano'];
var SESSAO_DIAS = 30;

function props_() { return PropertiesService.getScriptProperties(); }
function usuarios_() { var v = props_().getProperty('USUARIOS'); return v ? JSON.parse(v) : {}; }
function gravarUsuarios_(u) { props_().setProperty('USUARIOS', JSON.stringify(u)); }
function normUser_(u) { return String(u || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
function hash_(senha, salt) {
  var h = salt + '|' + senha;
  for (var i = 0; i < 1500; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8));
  }
  return h;
}
function validarSenha_(senha) {
  if (String(senha || '').length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
}
function novaSessao_(usuario, papel) {
  var p = props_(), agora = Date.now(), todas = p.getProperties();
  Object.keys(todas).forEach(function (k) {
    if (k.indexOf('S_') === 0) { try { if (JSON.parse(todas[k]).exp < agora) p.deleteProperty(k); } catch (e) { p.deleteProperty(k); } }
  });
  var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  p.setProperty('S_' + token, JSON.stringify({ u: usuario, exp: agora + SESSAO_DIAS * 864e5 }));
  return { token: token, papel: papel, usuario: usuario };
}
function sessao_(token) {
  if (!token) throw new Error('LOGIN');
  var v = props_().getProperty('S_' + token);
  if (!v) throw new Error('LOGIN');
  var s = JSON.parse(v);
  if (s.exp < Date.now()) { props_().deleteProperty('S_' + token); throw new Error('LOGIN'); }
  var u = usuarios_()[s.u];
  if (!u) throw new Error('LOGIN');
  return { usuario: s.u, papel: u.papel };
}
function dona_(token) {
  var s = sessao_(token);
  if (s.papel !== 'dona') throw new Error('SEM_PERMISSAO');
  return s;
}

function estado() {
  var u = usuarios_();
  return { temDona: Object.keys(u).some(function (k) { return u[k].papel === 'dona'; }) };
}

function criarDona(usuario, senha) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (estado().temDona) throw new Error('O acesso da dona já foi criado. Use Entrar.');
    usuario = normUser_(usuario);
    if (usuario.length < 2) throw new Error('Digite um nome de usuário.');
    validarSenha_(senha);
    var u = usuarios_(), salt = Utilities.getUuid();
    u[usuario] = { papel: 'dona', salt: salt, hash: hash_(senha, salt), criadoEm: new Date().toISOString() };
    gravarUsuarios_(u);
    return novaSessao_(usuario, 'dona');
  } finally { lock.releaseLock(); }
}

function entrar(usuario, senha) {
  usuario = normUser_(usuario);
  var cache = CacheService.getScriptCache(), chave = 'falhas_' + usuario;
  var falhas = Number(cache.get(chave) || 0);
  if (falhas >= 5) throw new Error('Muitas tentativas. Espere 5 minutos.');
  var rec = usuarios_()[usuario];
  if (!rec || hash_(senha, rec.salt) !== rec.hash) {
    cache.put(chave, String(falhas + 1), 300);
    Utilities.sleep(600);
    throw new Error('Usuário ou senha incorretos.');
  }
  cache.remove(chave);
  return novaSessao_(usuario, rec.papel);
}

function sair(token) {
  if (token) props_().deleteProperty('S_' + token);
  return true;
}

function listarAcessos(token) {
  dona_(token);
  var u = usuarios_();
  return Object.keys(u).map(function (k) { return { usuario: k, papel: u[k].papel }; });
}

// A dona cria ou troca a senha de uma assistente, ou troca a própria senha.
function salvarAcesso(token, usuario, senha) {
  var s = dona_(token);
  usuario = normUser_(usuario);
  if (usuario.length < 2) throw new Error('Digite um nome de usuário.');
  validarSenha_(senha);
  var u = usuarios_();
  if (u[usuario] && u[usuario].papel === 'dona' && usuario !== s.usuario) throw new Error('Esse usuário já existe.');
  var papel = u[usuario] ? u[usuario].papel : 'assistente', salt = Utilities.getUuid();
  u[usuario] = { papel: papel, salt: salt, hash: hash_(senha, salt), criadoEm: new Date().toISOString() };
  gravarUsuarios_(u);
  encerrarSessoes_(usuario, usuario === s.usuario ? token : null);
  return listarAcessos(token);
}

function removerAcesso(token, usuario) {
  dona_(token);
  usuario = normUser_(usuario);
  var u = usuarios_();
  if (!u[usuario]) return listarAcessos(token);
  if (u[usuario].papel === 'dona') throw new Error('O acesso da dona não pode ser removido.');
  delete u[usuario];
  gravarUsuarios_(u);
  encerrarSessoes_(usuario, null);
  return listarAcessos(token);
}

function encerrarSessoes_(usuario, manter) {
  var p = props_(), todas = p.getProperties();
  Object.keys(todas).forEach(function (k) {
    if (k.indexOf('S_') !== 0 || k === 'S_' + manter) return;
    try { if (JSON.parse(todas[k]).u === usuario) p.deleteProperty(k); } catch (e) {}
  });
}

// Se a dona esquecer a senha: rode esta função no editor do Apps Script.
// Ela apaga o acesso da dona e, no próximo acesso ao sistema, a tela pede para criar de novo.
function redefinirDona() {
  var u = usuarios_();
  Object.keys(u).forEach(function (k) { if (u[k].papel === 'dona') { delete u[k]; encerrarSessoes_(k, null); } });
  gravarUsuarios_(u);
  Logger.log('Acesso da dona apagado. Abra o sistema para criar de novo.');
}

/* ---------- funções chamadas pela tela (todas exigem login) ---------- */
function listar(token) {
  var s = sessao_(token), lista = listar_();
  if (s.papel === 'dona') return lista;
  return lista.map(function (c) {
    var o = { id: c.id };
    VE_ASSIST.forEach(function (k) { if (k in c) o[k] = c[k]; });
    o.adicionaisItens = (c.adicionaisItens || []).map(function (i) { return { id: i.id, mes: i.mes, desc: i.desc }; });
    return o;
  });
}

function salvarCliente(token, id, dados, substituir) {
  var s = sessao_(token);
  if (s.papel === 'dona') return salvarCliente_(id, dados, substituir);
  id = String(id || '');
  if (!id) throw new Error('Cliente inválido.');
  if (!listar_().some(function (c) { return c.id === id; })) throw new Error('SEM_PERMISSAO');
  var limpo = {};
  EDITA_ASSIST.forEach(function (k) { if (k in dados) limpo[k] = dados[k]; });
  if (dados.adicionaisItens) limpo.adicionaisItens = juntarItensAssist_(id, dados.adicionaisItens);
  return salvarCliente_(id, limpo, false);
}

// A assistente só manda descrição. Valores que a dona já colocou são mantidos;
// itens com valor não podem ser apagados por ela.
function juntarItensAssist_(id, novos) {
  var atuais = ((listar_().filter(function (c) { return c.id === id; })[0] || {}).adicionaisItens) || [];
  var porId = {};
  atuais.forEach(function (i) { porId[i.id] = i; });
  var vistos = {}, saida = [];
  (novos || []).forEach(function (n) {
    if (!n || !String(n.desc || '').trim()) return;
    var velho = n.id && porId[n.id];
    var item = { id: velho ? velho.id : Utilities.getUuid().slice(0, 8), mes: String(n.mes || (velho && velho.mes) || ''), desc: String(n.desc).trim(), valor: velho ? velho.valor : null };
    vistos[item.id] = true; saida.push(item);
  });
  atuais.forEach(function (i) { if (!vistos[i.id] && i.valor !== null && i.valor !== 0) saida.push(i); });
  return saida;
}

function excluirCliente(token, id) { dona_(token); return excluirCliente_(id); }
function lerConfig(token) { sessao_(token); return lerConfig_(); }
function salvarConfig(token, cfg) { dona_(token); return salvarConfig_(cfg); }
