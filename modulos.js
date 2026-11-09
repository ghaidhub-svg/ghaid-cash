function openItems(id){
const r=rows.find(x=>x.id===id); if(!r) return;
if(ASSIST()) return openItemsAssist(r);
let items=itemsOf(r).map(i=>({...i}));
if(!items.length) items=[{id:randHex(6),mes:refMes,desc:'',valor:null}];
const hist=[]; let antesFoco=null, syncAtual=()=>{}, redes=false;
const estado=()=>JSON.stringify(items);
const desfazerItens=()=>{
syncAtual(); const atual=estado();
if(antesFoco!==null&&atual!==antesFoco){items=JSON.parse(antesFoco);antesFoco=null}
else if(hist.length){items=JSON.parse(hist.pop());antesFoco=null}
else{toast('Nada para desfazer');return}
draw(); toast('Desfeito');
};
const draw=()=>{
const body=`<div class="sec">${esc(mesLabel(refMes))}</div>
<div class="ithead c4"><span>O que foi feito</span><span style="text-align:right">Valor final</span><span></span><span></span></div>
<div class="itlist">${items.map((i,n)=>`<div class="itrow c4" data-n="${n}"><input id="it-d-${n}" class="d" placeholder="Ex.: Folder, vídeo extra, dronagem" value="${esc(i.desc||'')}" aria-label="Descrição do item ${n+1}"><input id="it-v-${n}" class="v" inputmode="decimal" ${(st=>st?`disabled placeholder="${{cortesia:'Cortesia',contrato:'Contrato',pago:'Já pago'}[st]}" value=""`:`placeholder="0,00" value="${isNum(i.valor)?i.valor.toFixed(2).replace('.',','):''}"`)(sitDe(i))} aria-label="Valor do item ${n+1}"><select class="sit" id="it-s-${n}" data-prev="${sitDe(i)}" aria-label="Situação do item ${n+1}" title="Cortesia, no contrato e já pago (pago em outro mês) ficam registrados e não somam no valor">${SITUACOES.map(([k,l])=>`<option value="${k}"${sitDe(i)===k?' selected':''}>${l}</option>`).join('')}</select><button class="mini" type="button" data-rm="${n}" aria-label="Remover item ${n+1}">×</button></div>`).join('')}</div>
<div><button class="btn" type="button" id="itAdd">+ Adicionar item</button></div>
<div class="itsum" id="itSum"></div>
<div class="sec">Texto para o e-mail do boleto</div>
<textarea class="emailbox" id="itMail" readonly></textarea>`;
redes=true; shell(`Adicionais · ${r.cliente||''}`,body,`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="itUndo" type="button" title="Desfazer (Ctrl+Z)">Desfazer</button><button class="btn" id="itCopy" type="button">Copiar para o e-mail</button></div><div style="display:flex;gap:8px"><button class="btn" id="itCancel" type="button">Cancelar</button><button class="btn primary" id="itSave" type="button">Salvar</button></div>`);
redes=false; drawerUndo=desfazerItens; $('#itUndo').onclick=desfazerItens;
const sync=()=>{
document.querySelectorAll('.itrow').forEach(row=>{const n=+row.dataset.n;if(!items[n])return;items[n].desc=row.querySelector('.d').value.trim();
const sel=row.querySelector('.sit');items[n].sit=sel?sel.value:'';delete items[n].cortesia;
if(items[n].sit) return; // com situação o valor fica travado e não conta
const v=parseMoney(row.querySelector('.v').value);items[n].valor=(v===null||isNaN(v))?null:v});
const clean=items.filter(i=>i.desc||isNum(i.valor));
const plano=!semCobranca(r)&&!ehEsporadico(r)?planoValor(r):0, sum=clean.reduce((s,i)=>s+(contaNoValor(i)?i.valor:0),0);
const nSit=k=>clean.filter(i=>sitDe(i)===k).length, nCort=clean.filter(i=>sitDe(i)).length;
$('#itSum').innerHTML=`<div><span>Plano mensal</span><span>${brl.format(plano)}</span></div><div><span>Adicionais (${clean.length-nCort})</span><span>${brl.format(sum)}</span></div>${[['cortesia','Cortesias'],['contrato','No contrato'],['pago','Já pagos']].filter(([k])=>nSit(k)).map(([k,l])=>`<div><span>${l} (${nSit(k)})</span><span>não soma</span></div>`).join('')}<div class="tt"><span>Total do mês</span><span>${brl.format(plano+sum)}</span></div>`;
$('#itMail').value=emailText(r,clean);
return clean;
};
sync(); syncAtual=sync;
const lista=document.querySelector('.itlist');
lista.addEventListener('input',sync);
lista.addEventListener('change',e=>{const sel=e.target.closest('.sit');if(!sel)return;
const n=+sel.closest('.itrow').dataset.n, ant=JSON.stringify(items.map((x,i)=>i===n?{...x,sit:sel.dataset.prev||''}:x));
hist.push(ant); antesFoco=null; sync(); draw();
document.getElementById((sel.value===''?'it-v-':'it-s-')+n)?.focus()});
lista.addEventListener('focusin',()=>{if(redes)return;sync();antesFoco=estado()});
lista.addEventListener('focusout',()=>{if(redes)return;sync();if(antesFoco!==null&&estado()!==antesFoco)hist.push(antesFoco);antesFoco=null});
document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{sync();hist.push(estado());items.splice(+b.dataset.rm,1);if(!items.length)items.push({id:randHex(6),mes:refMes,desc:'',valor:null});draw()});
$('#itAdd').onclick=()=>{sync();hist.push(estado());items.push({id:randHex(6),mes:refMes,desc:'',valor:null});draw();document.getElementById('it-d-'+(items.length-1))?.focus()};
$('#itCancel').onclick=closeDrawer;
$('#itCopy').onclick=()=>{const t=$('#itMail').value;
const fb=()=>{const el=$('#itMail');el.focus();el.select();toast('Texto selecionado. Use Ctrl+C (ou Cmd+C) para copiar.')};
try{navigator.clipboard.writeText(t).then(()=>toast('Texto copiado'),fb)}catch(e){fb()}};
$('#itSave').onclick=async()=>{
if(!canWrite){toast('Você só tem acesso de leitura.');return}
for(const row of document.querySelectorAll('.itrow')){const raw=row.querySelector('.v').value;if(raw.trim()&&isNaN(parseMoney(raw))){toast(`“${raw}” não é um valor válido. Use algo como 150,00.`);row.querySelector('.v').focus();return}}
const clean=sync().map(i=>{const st=sitDe(i);return {id:i.id||randHex(6),mes:refMes,desc:i.desc,valor:st?0:(isNum(i.valor)?i.valor:null),sit:st,cortesia:st==='cortesia'}});
const others=(Array.isArray(r.adicionaisItens)?r.adicionaisItens:[]).filter(i=>i&&i.mes!==refMes);
$('#itSave').disabled=true;
const antes=copia(r);
try{await writeDoc(id,{adicionaisItens:others.concat(clean)},'update');oferecerDesfazer('Adicionais salvos',[{id,antes}]);closeDrawer()}
catch(e){$('#itSave').disabled=false;handleWriteErr(e)}
};
};
draw();
}
function openItemsAssist(r){
let items=itemsOf(r).map(i=>({id:i.id,mes:i.mes,desc:i.desc}));
if(!items.length) items=[{id:'',mes:refMes,desc:''}];
const hist=[]; let antesFoco=null, syncAtual=()=>{}, redes=false;
const estado=()=>JSON.stringify(items);
const desfazerItens=()=>{
syncAtual(); const atual=estado();
if(antesFoco!==null&&atual!==antesFoco){items=JSON.parse(antesFoco);antesFoco=null}
else if(hist.length){items=JSON.parse(hist.pop());antesFoco=null}
else{toast('Nada para desfazer');return}
draw(); toast('Desfeito');
};
const draw=()=>{
redes=true; shell(`Adicionais · ${r.cliente||''}`,`<div class="sec">${esc(mesLabel(refMes))}</div>
<p class="sub" style="margin:0 0 4px;font-size:13px">Descreva o que foi feito. O valor é definido pela dona depois.</p>
<div class="itlist">${items.map((i,n)=>`<div class="itrow" data-n="${n}" style="grid-template-columns:1fr auto"><input class="d" placeholder="Ex.: Folder, vídeo extra, dronagem" value="${esc(i.desc||'')}" aria-label="Descrição do item ${n+1}"><button class="iconbtn" type="button" data-rm="${n}" aria-label="Remover item ${n+1}">×</button></div>`).join('')}</div>
<div><button class="btn" type="button" id="itAdd">+ Adicionar item</button></div>`,
`<button class="btn" id="itUndo" type="button" title="Desfazer (Ctrl+Z)">Desfazer</button><div style="display:flex;gap:8px"><button class="btn" id="itCancel" type="button">Cancelar</button><button class="btn primary" id="itSave" type="button">Salvar</button></div>`);
redes=false; drawerUndo=desfazerItens; $('#itUndo').onclick=desfazerItens;
const sync=()=>document.querySelectorAll('.itrow').forEach(row=>{if(!items[+row.dataset.n])return;items[+row.dataset.n].desc=row.querySelector('.d').value.trim()});
syncAtual=sync;
const lista=document.querySelector('.itlist');
lista.addEventListener('focusin',()=>{if(redes)return;sync();antesFoco=estado()});
lista.addEventListener('focusout',()=>{if(redes)return;sync();if(antesFoco!==null&&estado()!==antesFoco)hist.push(antesFoco);antesFoco=null});
document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{sync();hist.push(estado());items.splice(+b.dataset.rm,1);if(!items.length)items.push({id:'',mes:refMes,desc:''});draw()});
$('#itAdd').onclick=()=>{sync();hist.push(estado());items.push({id:'',mes:refMes,desc:''});draw();document.querySelectorAll('.itrow .d')[items.length-1]?.focus()};
$('#itCancel').onclick=closeDrawer;
$('#itSave').onclick=async()=>{
sync();
const deste=items.filter(i=>i.desc).map(i=>({id:i.id||randHex(6),mes:refMes,desc:i.desc}));
const outros=(Array.isArray(r.adicionaisItens)?r.adicionaisItens:[]).filter(i=>i&&i.mes!==refMes).map(i=>({id:i.id,mes:i.mes,desc:i.desc}));
$('#itSave').disabled=true;
const antes=copia(r);
try{await writeDoc(r.id,{adicionaisItens:outros.concat(deste)},'update');oferecerDesfazer('Adicionais salvos. A dona coloca o valor.',[{id:r.id,antes}]);closeDrawer()}
catch(e){$('#itSave').disabled=false;handleWriteErr(e)}
};
};
draw();
}
function openPub(id){
const r=rows.find(x=>x.id===id); if(!r) return;
const p=pubPlano(r);
let il=p.ilimitado, total=p.total;
const qtd=new Map(); p.itens.forEach(i=>{if(!ehNormal(i.tipo))qtd.set(String(i.tipo),isNum(i.qtd)?i.qtd:null)});
let tipos=pubTiposTodos(); qtd.forEach((v,k)=>{if(!tipos.some(t=>t.toLowerCase()===k.toLowerCase()))tipos.push(k)});
const val=t=>{for(const [k,v] of qtd)if(k.toLowerCase()===t.toLowerCase())return v;return null};
const draw=()=>{
shell(`Publicações · ${r.cliente||''}`,`
<label class="pubil"><input type="checkbox" id="pubIl"${il?' checked':''}><span>Ilimitado<small>Qualquer pedido, a qualquer momento, inclusive projetos.</small></span></label>
<div id="pubCorpo"${il?' hidden':''}>
<div class="field"><label for="pubTot">Quantas publicações por mês</label><input id="pubTot" type="number" min="0" inputmode="numeric" value="${isNum(total)?total:''}" placeholder="Ex.: 16"></div>
<div class="sec" style="margin-top:16px">Como se dividem <span style="text-transform:none;letter-spacing:0;font-weight:500;color:var(--muted)">(opcional)</span></div>
<div class="itlist" id="pubList">${tipos.map((t,n)=>`<div class="pubrow"><label for="pq-${n}" class="pubnome">${esc(t)}</label><input class="q" id="pq-${n}" data-tipo="${esc(t)}" type="number" min="0" inputmode="numeric" value="${isNum(val(t))&&val(t)>0?val(t):''}" placeholder="0"><span></span></div>`).join('')}
<div class="pubrow pubresto"><span class="pubnome">${PUB_NORMAL} <small>o que sobra</small></span><span class="q" id="pubResto">0</span><span></span></div>
</div>
<div class="pubrow" style="margin-top:8px"><input id="pubNovo" placeholder="Novo tipo (ex.: Reels de bastidor)" aria-label="Nome do novo tipo"><span></span><button class="iconbtn" type="button" id="pubAdd" aria-label="Adicionar tipo">+</button></div>
<div id="pubSum"></div>
</div>`,
`<span></span><div style="display:flex;gap:8px"><button class="btn" id="pubCancel" type="button">Cancelar</button><button class="btn primary" id="pubSave" type="button">Salvar</button></div>`);
const sync=()=>{
il=$('#pubIl').checked; const tv=$('#pubTot').value.trim(); total=tv===''?null:Math.max(0,Math.round(+tv));
document.querySelectorAll('#pubList input.q').forEach(i=>{const v=i.value.trim();qtd.set(i.dataset.tipo,v===''?null:Math.max(0,Math.round(+v)))});
const soma=[...qtd.values()].reduce((a,v)=>a+(isNum(v)?v:0),0), el=$('#pubSum'), resto=isNum(total)?total-soma:null;
$('#pubResto').textContent=resto==null?'–':Math.max(0,resto);
el.className=''; el.textContent='';
if(isNum(total)&&soma>total){el.textContent=`Os tipos somam ${soma}, ${soma-total} a mais que o total de ${total}.`;el.className='warn'}
else if(!isNum(total)&&soma) el.textContent=`Sem total definido: o total fica ${soma}.`;
return {soma,resto};
};
sync();
$('#pubIl').onchange=()=>{sync();draw()};
document.querySelector('.drawer').addEventListener('input',sync);
const add=()=>{const n=$('#pubNovo').value.trim();if(!n)return;sync();if(ehNormal(n)){toast('Post normal já é o que sobra do total.');return}
if(!tipos.some(t=>t.toLowerCase()===n.toLowerCase())){tipos.push(n);qtd.set(n,null)}draw();const q=[...document.querySelectorAll('#pubList input.q')].find(i=>i.dataset.tipo.toLowerCase()===n.toLowerCase());q?.focus()};
$('#pubAdd').onclick=add; $('#pubNovo').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();add()}};
$('#pubCancel').onclick=closeDrawer;
$('#pubSave').onclick=async()=>{
const {soma}=sync();
if(!canWrite){toast('Você só tem acesso de leitura.');return}
if(!il&&isNum(total)&&soma>total){toast('Os tipos passaram do total. Ajuste antes de salvar.');return}
let plano;
if(il) plano={ilimitado:true,total:null,itens:[]};
else{
const itens=[...qtd.entries()].filter(([,v])=>isNum(v)&&v>0).map(([tipo,v])=>({tipo,qtd:v}));
const tot=isNum(total)?total:(soma||null);
if(itens.length&&isNum(tot)&&tot-soma>0) itens.push({tipo:PUB_NORMAL,qtd:tot-soma});
plano={ilimitado:false,total:tot,itens};
}
const vazio=!plano.ilimitado&&!isNum(plano.total);
const novo={pubPlano:vazio?null:JSON.stringify(plano),publicacoes:vazio?null:pubTexto(plano)};
$('#pubSave').disabled=true;
const antes=copia(r);
try{Object.assign(r,novo);render();await writeDoc(id,novo,'update');oferecerDesfazer('Publicações salvas',[{id,antes}]);closeDrawer()}
catch(e){$('#pubSave').disabled=false;handleWriteErr(e)}
};
};
draw();
}
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let pdfjsPronto=null;
function carregarPdfjs(){
if(!pdfjsPronto) pdfjsPronto=new Promise((ok,bad)=>{const sc=document.createElement('script');sc.src=PDFJS+'pdf.min.js';sc.onload=async()=>{
try{const w=await fetch(PDFJS+'pdf.worker.min.js').then(x=>x.text());window.pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([w],{type:'text/javascript'}))}
catch(e){window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'}
ok(window.pdfjsLib)};sc.onerror=()=>{pdfjsPronto=null;bad(new Error('Não consegui carregar o leitor de PDF.'))};document.head.appendChild(sc)});
return pdfjsPronto;
}
async function textoDoPdf(buf){
const lib=await carregarPdfjs(), doc=await lib.getDocument({data:buf}).promise; let t='';
for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i), c=await pg.getTextContent();t+=' '+c.items.map(x=>x.str).join(' ')}
return t.replace(/\s+/g,' ');
}
function lerNota(t){
const din=v=>{const m=/([\d.]+,\d{2})/.exec(v||'');return m?parseMoney(m[1]):null}, V='(-|R\\$\\s*[\\d.]+,\\d{2})', o={};
const pega=(...rs)=>{for(const re of rs){const m=re.exec(t);if(m)return m}return null};
let m=pega(/N[ÚU]MERO DA NFS-e\s+(\d+)\b/i,/N[ÚU]MERO DA NFS-e\s+COMPET[ÊE]NCIA DA NFS-e\s+DATA E HORA DA EMISS[ÃA]O DA NFS-e\s+(\d+)/i,/N[°º] NFS-e \/ CHAVE NFS-e\s+(\d+)/i); if(m) o.num=m[1];
m=pega(new RegExp('VALOR DA OPERA[ÇC][ÃA]O / SERVI[ÇC]O\\s+'+V,'i'),new RegExp('Desconto Condicionado\\s+'+V,'i')); if(m) o.bruto=din(m[1]);
m=pega(new RegExp('Total das Reten[çc][õo]es \\(ISSQN / Federais\\)\\s+'+V,'i')); if(m) o.iss=m[1]==='-'?0:din(m[1]);
m=pega(/VALOR L[ÍI]QUIDO DA NFS-e\s+(R\$\s*[\d.]+,\d{2})/i); if(m) o.liquido=din(m[1]);
if(!isNum(o.liquido)){m=new RegExp('L[ÍI]QUIDO DA NFS-e \\+ IBS/CBS\\s+'+V+'\\s+'+V,'i').exec(t);if(m){o.iss=m[1]==='-'?0:din(m[1]);o.liquido=din(m[2])}}
if(!isNum(o.iss)&&isNum(o.bruto)&&isNum(o.liquido)) o.iss=r2(o.bruto-o.liquido);
const docs=[...t.matchAll(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2}/g)].map(x=>x[0]);
o.cnpj=docs.find((d,i)=>i>0&&d!==docs[0])||null; // o 1º documento da nota é o da GHAID (prestador); o seguinte é o do cliente (tomador)
if(!isNum(o.bruto)&&isNum(o.liquido)) o.bruto=r2(o.liquido+(o.iss||0));
if(!isNum(o.liquido)&&isNum(o.bruto)) o.liquido=r2(o.bruto-(o.iss||0));
return o;
}
function conferirBoleto(b){
const r=b.r, L=[];
if(String(r.vinculo||'').trim().toLowerCase()==='provável') L.push({txt:'Razão social e CNPJ vieram da importação como "provável". Confira no contrato.',acao:'vinculo'});
const zero=itemsOf(r).filter(i=>!sitDe(i)&&isNum(i.valor)&&i.valor===0);
if(zero.length) L.push({txt:`Adicional com R$ 0,00: ${zero.map(i=>i.desc||'item').join('; ')}. Coloque o preço ou marque Cortesia, No contrato ou Já pago.`,acao:'zero'});
const nf=notaDoMes(r), bruto=tm(r);
if(nf&&isNum(bruto)&&Math.abs(nf.bruto-bruto)>0.009&&Math.abs(nf.bruto-(bruto+permutaNoMes(r)))>0.009) L.push({txt:`A nota é de ${brl.format(nf.bruto)}, mas plano + adicionais do mês dá ${brl.format(bruto)}. O boleto segue a nota.`,acao:'nota'});
if(nf&&nf.cnpj&&soDig(nf.cnpj)!==soDig(b.pag.doc)) L.push({txt:`A nota está no CNPJ/CPF ${nf.cnpj}, diferente do pagador (${b.pag.doc||'sem CNPJ'}).`,acao:'nota'});
if(!nf&&isNum(r.valorBoleto)&&isNum(b.total)&&Math.abs(r.valorBoleto-b.total)>0.009) L.push({txt:`O último boleto registrado foi de ${brl.format(r.valorBoleto)}. Este sai com ${brl.format(b.total)}.`,acao:'valor'});
return L;
}
const anexosDe=b=>{const nf=notaDoMes(b.r), L=b.partes.map((x,i)=>nomeArquivo(b,i)).join(' e ');
return nf?`${L} e a nota fiscal${nf.num?` nº ${nf.num}`:''}: ${nf.arqNome||`(PDF da nota${nf.num?` nº ${nf.num}`:''} deste cliente)`}`:L};
function corpoEmail(b){
const r=b.r, mes=mesLabel(refMes).toLowerCase(), it=itemsOf(r), L=[`Olá, ${r.cliente}!`,'',`Segue em anexo ${b.partes.length>1?'os boletos referentes':'o boleto referente'} a ${mes}.`,'',`Protocolo da cobrança · ${mes}`];
if(ehGrupo(r)){const cs=contasDe(r).map(c=>c.cliente).filter(Boolean);if(cs.length)L.push(`Contas: ${cs.join(', ')}`)}
if(!ehEsporadico(r)) L.push(`Plano mensal: ${brl.format(planoValor(r))}`);
const limpaDesc=d=>{let t=String(d||'Item');const a=t.indexOf('(');if(a>=0){const lo=t.slice(a+1).toLowerCase();if(['verificar','ver se','conferir','confirmar'].some(w=>lo.startsWith(w))){const b=t.indexOf(')',a);t=t.slice(0,a)+(b>=0?t.slice(b+1):'')}}t=t.trim();while(t.endsWith(':'))t=t.slice(0,-1).trim();return t||'Item'};
const itC=it.filter(i=>sitDe(i)||(isNum(i.valor)&&i.valor>0));
if(itC.length){L.push(ehEsporadico(r)?'Serviços do mês:':'Adicionais do mês:');itC.forEach(i=>{const st=sitDe(i);L.push(`• ${limpaDesc(i.desc)}: ${st?SIT_TEXTO[st]:brl.format(i.valor)}`)})}
const nf=notaDoMes(r);
if(nf){L.push(`Nota fiscal${nf.num?` nº ${nf.num}`:''}: ${brl.format(nf.bruto)}`);if(nf.iss>0)L.push(`ISS retido por vocês: − ${brl.format(nf.iss)}`);if(boletoPelaNota(r,nf)!==nf.liquido)L.push(`Permuta: − ${brl.format(permutaNoMes(r))}`)}
L.push(`${nf?'Total do boleto':'Total'}: ${brl.format(b.total)}`);
if(b.partes.length>1) b.partes.forEach((x,i)=>L.push(`Boleto ${i+1} de ${b.partes.length}: ${brl.format(x.valor)}, vencimento ${dataBR(x.venc)}`));
else L.push(`Vencimento: ${dataBR(b.partes[0].venc)}`);
L.push('',emailFim());
return L.join('\n');
}
function textoEmails(lista){
const prontos=lista.filter(vaiNoTexto), comEmail=prontos.filter(emailDe), semEmail=prontos.filter(b=>!emailDe(b));
const de=envioCfg().email;
const L=[`Enviar os boletos por e-mail · ${mesLabel(refMes)}`,'',
de?`Envie pelo Gmail da conta ${de} (financeiro). Antes de começar, confira no Gmail aberto qual conta está conectada: se não for ${de}, troque para ela ou pare e me avise. Não envie por outra conta.`
:'ATENÇÃO: o e-mail de envio do financeiro não foi definido no GHAID Cash. Antes de começar, me pergunte por qual conta enviar e não envie por nenhuma outra.',
'Para cada cliente abaixo, crie um e-mail novo com o destinatário, o assunto e o texto indicados, e anexe o(s) PDF(s) indicado(s), que estão na pasta '+PASTA_BOLETOS()+'. Quando houver nota fiscal, ela também está nessa pasta e vai junto com o boleto do mesmo cliente.',
'Os PDFs foram baixados pelo Sicredi com o nome "Boleto-" + nome do pagador cadastrado no banco, que pode estar abreviado. Se o nome indicado não existir, use o arquivo desse pagador (veja a lista cliente → arquivo do texto 1).',
autoEnvio()?'Envie todos em sequência, sem me pedir confirmação a cada e-mail. Pule (sem enviar) só quem tiver PDF não encontrado ou dúvida sobre o arquivo certo. No final, me mostre o resumo: enviados e pulados, com o motivo.'
:'Antes de enviar cada e-mail, me mostre e espere a minha confirmação. Se algum PDF não for encontrado, me avise e não envie esse e-mail.',''];
comEmail.forEach((b,n)=>{
L.push(`--- ${n+1}. ${b.r.cliente} ---`,`Para: ${emailDe(b)}`,`Assunto: Boleto GHAID · ${mesLabel(refMes)} · ${b.r.cliente}`,
`Anexar: ${anexosDe(b)}`,'Texto:',corpoEmail(b),'');
});
if(semEmail.length){L.push('Sem e-mail cadastrado (não enviar, cadastre o e-mail no GHAID Cash):');semEmail.forEach(b=>L.push(`- ${b.r.cliente}`))}
return L.join('\n');
}
function textoWhats(lista){
const prontos=lista.filter(vaiNoTexto), com=prontos.filter(whatsDe), sem=prontos.filter(b=>!whatsDe(b)), de=envioCfg().whats;
const L=[`Enviar os boletos por WhatsApp · ${mesLabel(refMes)}`,'',
de?`Envie pelo WhatsApp Web conectado no número ${de} (financeiro). Antes de começar, confira em web.whatsapp.com qual número está conectado (Configurações → perfil): se não for ${de}, pare e me avise. Não envie por outro número.`
:'ATENÇÃO: o WhatsApp de envio do financeiro não foi definido no GHAID Cash. Antes de começar, me pergunte por qual número enviar e não envie por nenhum outro.',
'Para cada cliente abaixo, abra a conversa pelo link indicado, escreva a mensagem e anexe o(s) PDF(s) indicado(s) como documento, que estão na pasta '+PASTA_BOLETOS()+'. Quando houver nota fiscal, ela também está nessa pasta e vai junto com o boleto do mesmo cliente.',
'Os PDFs foram baixados pelo Sicredi com o nome "Boleto-" + nome do pagador cadastrado no banco, que pode estar abreviado. Se o nome indicado não existir, use o arquivo desse pagador (veja a lista cliente → arquivo do texto 1).',
autoEnvio()?'Envie todos em sequência, sem me pedir confirmação a cada mensagem. Pule só quem tiver PDF não encontrado, dúvida sobre o arquivo certo ou número sem WhatsApp. No final, me mostre o resumo: enviados e pulados, com o motivo.'
:'Antes de enviar cada mensagem, me mostre e espere a minha confirmação. Se algum PDF não for encontrado ou o número não tiver WhatsApp, me avise e pule esse cliente.',''];
com.forEach((b,n)=>{
L.push(`--- ${n+1}. ${b.r.cliente} ---`,`WhatsApp: ${whatsDe(b)} · abrir: https://web.whatsapp.com/send?phone=${whatsDigitos(whatsDe(b))}`,
`Anexar: ${anexosDe(b)}`,'Mensagem:',corpoEmail(b),'');
});
if(sem.length){L.push('Sem WhatsApp cadastrado (não enviar por aqui):');sem.forEach(b=>L.push(`- ${b.r.cliente}`))}
return L.join('\n');
}
function textoBoletos(lista){
const cfg=cfgBoleto(), prontos=lista.filter(vaiNoTexto);
const L=[`Gerar boletos no Sicredi · ${mesLabel(refMes)}`,`Juros: ${cfg.juros} · Multa: ${String(cfg.multa).replace(/\s*ao mês$/i,'')} (única, cobrada após o vencimento)`,
'Espécie do documento: DSI (Duplicata de Serviço por Indicação)',
`Número do documento: o indicado em cada linha (mês + sequência, ex.: ${refMes.replace('-','')}-01). Não reutilize números já usados neste mês.`,'',
'Para cada linha abaixo, emita um boleto de cobrança para o pagador (razão social e CNPJ/CPF), com o valor e o vencimento indicados, usando os juros e a multa acima.',
'Se o pagador não estiver cadastrado no banco e a linha trouxer o endereço, cadastre com a razão social, o CNPJ/CPF e esse endereço (se o CEP parecer errado, confirme numa consulta pública do CNPJ)'+(autoEnvio()?', sem me perguntar.':', me mostrando antes de salvar.'),
autoEnvio()?'Emita todos em sequência, sem me pedir confirmação a cada boleto. Pare e me pergunte só se: o pagador não estiver cadastrado no banco e a linha não tiver endereço; houver mais de um cadastro para o mesmo CNPJ/CPF e você não souber qual usar; ou o banco mostrar dados diferentes dos da linha. No final, me mostre o resumo: emitidos, pulados e o motivo.'
:'Antes de emitir cada boleto, me mostre os dados e espere a minha confirmação. Se o pagador não estiver cadastrado no banco, me pergunte antes de cadastrar.',
'Não faça pagamentos nem transferências.',
'Baixe o PDF de cada boleto uma vez só, pelo botão "Salvar boleto em PDF". Não use "imprimir". Se o botão não aparecer, use Emitir Boletos e salve o PDF uma vez.',
'Se houver mais de um cadastro de pagador para o mesmo CNPJ/CPF, use o que tiver o endereço completo e sem texto repetido, e cite isso no resumo final.',
'Ao cadastrar pagador novo: nome e endereço têm no máximo 40 caracteres no banco; abrevie mantendo o começo da razão social, e coloque o bairro no endereço.',
'Se a extensão cair ou a página recarregar no meio de um boleto, antes de refazer confira na consulta se ele já foi criado.',
'O pagador é identificado pelo CNPJ/CPF. Se ele estiver cadastrado no banco com um nome mais curto, mas com o mesmo CNPJ/CPF, use esse cadastro normalmente.',
'Se o banco der erro (ex.: sistema indisponível), confira se o boleto não foi criado antes de tentar de novo, para não emitir em dobro.',
`Depois de emitir cada boleto, baixe o PDF. O Chrome já está configurado para baixar direto na pasta ${PASTA_BOLETOS()}, sem perguntar onde salvar. O Sicredi salva como "Boleto-" + nome do pagador no banco (arquivo esperado indicado na linha). Anote o nome com que cada arquivo foi baixado e, no final, me mostre a lista: cliente → nome do arquivo (e boleto 1 ou 2, se for dividido). Essa lista será usada nos envios por e-mail e WhatsApp.`,''];
let n=0, nDoc=docInicio(lista)-1;
prontos.forEach(b=>b.partes.forEach((x,i)=>{n++;nDoc++;
const nf=notaDoMes(b.r), extra=(b.partes.length>1?` · boleto ${i+1} de ${b.partes.length}${x.rotulo?` (${x.rotulo})`:''}`:'')+(nf?` · valor pela NFS-e${nf.num?` nº ${nf.num}`:''}${nf.iss>0?' (líquido, ISS retido pelo cliente)':''}`:'');
L.push(`${n}. ${b.pag.razao} · ${b.pag.doc} · ${brl.format(x.valor)} · vencimento ${dataBR(x.venc)}${extra} (cliente: ${b.r.cliente}${nomeBancoDe(b.pag)!==String(b.pag.razao||'').trim()?` · no banco: ${nomeBancoDe(b.pag)}`:''})${valido(b.pag.endereco)?` · endereço: ${b.pag.endereco}`:''} · nº do documento: ${refMes.replace('-','')}-${String(nDoc).padStart(2,'0')} · arquivo esperado: ${nomeArquivo(b,i)}`)}));
const pend=lista.filter(b=>b.gerar&&!b.disp&&b.faltas.length);
if(pend.length){L.push('','Ainda não gerar (falta informação no GHAID Cash):');pend.forEach(b=>L.push(`- ${b.r.cliente}: falta ${b.faltas.join(', ')}`))}
return L.join('\n');
}
function escolherNota(id,depois){
if(!canWrite){toast('Você só tem acesso de leitura.');return}
const inp=document.createElement('input'); inp.type='file'; inp.accept='application/pdf,.pdf';
inp.onchange=async()=>{const f=inp.files&&inp.files[0]; if(!f) return;
if(f.size>8*1024*1024){toast('PDF grande demais (máximo 8 MB).');return}
toast('Lendo a nota…'); let buf, lido={};
try{buf=await f.arrayBuffer();lido=lerNota(await textoDoPdf(buf.slice(0)))}
catch(e){toast('Não consegui ler o PDF. Preencha os valores da nota na janela.')}
abrirNota(id,lido,f,buf,depois)};
inp.click();
}
function abrirNota(id,lido,arq,buf,depois){
const r=rows.find(x=>x.id===id); if(!r) return;
const pag=pagadorDe(r), bruto=tm(r);
fecharDivisao();
const scrim=document.createElement('div'); scrim.className='modalscrim'; scrim.onclick=fecharDivisao;
const m=document.createElement('div'); m.className='modal'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-label','Nota fiscal');
const mt=v=>isNum(v)?moedaTxt(v):'';
m.innerHTML=`<h3>Nota fiscal · ${esc(mesLabel(refMes).toLowerCase())}</h3>
<p class="sub" style="margin:0;font-size:13px">${esc(r.cliente||'')} · plano + adicionais do mês: ${isNum(bruto)?brl.format(bruto):'sem valor'}. Confira os valores lidos da nota.</p>
<div class="dvdatas">
<div class="field"><label for="nfNum">Número da nota</label><input id="nfNum" value="${esc(lido.num||'')}"></div>
<div class="field"><label for="nfBruto">Valor do serviço</label><input id="nfBruto" inputmode="decimal" placeholder="0,00" value="${mt(lido.bruto)}"></div>
<div class="field"><label for="nfIss">ISS retido pelo cliente</label><input id="nfIss" inputmode="decimal" placeholder="0,00 (não retido)" value="${lido.iss>0?mt(lido.iss):''}"></div>
<div class="field"><label>Valor do boleto</label><div class="calcv" id="nfLiq"></div></div>
</div>
<p class="sub" id="nfAviso" style="margin:0;font-size:12px"></p>
<div class="dvfoot"><span></span><div style="display:flex;gap:8px"><button class="btn" type="button" id="nfCancel">Cancelar</button><button class="btn primary" type="button" id="nfSalvar">Salvar nota</button></div></div>`;
document.body.append(scrim,m);
const pm=permutaNoMes(r);
const conta=()=>{const b=parseMoney($('#nfBruto').value), i=parseMoney($('#nfIss').value)||0, ok=isNum(b)&&b>0;
$('#nfLiq').textContent=ok?brl.format(boletoPelaNota(r,{bruto:b,liquido:r2(b-i)}))+(pm>0&&isNum(bruto)&&Math.abs(b-(bruto+pm))<0.01?` (descontada a permuta de ${brl.format(pm)})`:''):'—';
const av=[];
if(ok&&isNum(bruto)&&Math.abs(b-bruto)>0.009&&Math.abs(b-(bruto+pm))>0.009) av.push(`A nota não bate com plano + adicionais do mês (${brl.format(bruto)}).`);
if(lido.cnpj&&soDig(lido.cnpj)!==soDig(pag.doc)) av.push(`A nota está no CNPJ/CPF ${lido.cnpj}, e o pagador é ${pag.doc||'sem CNPJ'}.`);
$('#nfAviso').textContent=av.join(' ')||'O boleto e os textos 1, 2 e 3 passam a usar o valor do boleto acima.';
$('#nfAviso').style.color=av.length?'var(--alert-text)':''};
$('#nfBruto').oninput=conta; $('#nfIss').oninput=conta; conta();
$('#nfCancel').onclick=fecharDivisao;
m.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();fecharDivisao()}});
$('#nfSalvar').onclick=async()=>{
const b=parseMoney($('#nfBruto').value), iRaw=parseMoney($('#nfIss').value), i=isNum(iRaw)?iRaw:0;
if(!isNum(b)||b<=0){toast('Digite o valor do serviço da nota.');$('#nfBruto').focus();return}
if(isNaN(iRaw)||i<0||i>=b){toast('ISS retido inválido.');$('#nfIss').focus();return}
const nota={num:$('#nfNum').value.trim()||null,bruto:b,iss:i,liquido:r2(b-i),cnpj:lido.cnpj||null,arquivo:null,arqNome:arq?arq.name:null};
const grava=async(nt,msg)=>{const x=rows.find(y=>y.id===id);if(!x)return;const n={...(lerJSON(x.notasMeses)||{}),[refMes]:nt},v=JSON.stringify(n);
await setCampo(id,'notasMeses',v,msg);const a=rows.find(y=>y.id===id);if(a)a.notasMeses=v;depois&&depois()};
fecharDivisao();
await grava(nota,`${r.cliente}: nota salva, boleto de ${brl.format(boletoPelaNota(r,nota))}`);
if(buf&&!LEGACY){ // guarda o PDF no Drive (GHAID Cash / Notas fiscais / AAAA-MM)
try{let bin='';const u=new Uint8Array(buf);for(let k=0;k<u.length;k+=0x8000)bin+=String.fromCharCode.apply(null,u.subarray(k,k+0x8000));
const res=await GA('salvarNota',refMes,`${refMes} ${r.cliente}${nota.num?` NF ${nota.num}`:''}.pdf`,btoa(bin));
if(res&&res.url){const x=rows.find(y=>y.id===id),atual=x&&notaDoMes(x);if(atual){const n={...(lerJSON(x.notasMeses)||{}),[refMes]:{...atual,arquivo:res.url}},v=JSON.stringify(n);try{await writeDoc(id,{notasMeses:v},'update');x.notasMeses=v;depois&&depois()}catch(e){}}}
}catch(e){toast('Valores da nota salvos. O PDF não foi guardado no Drive: falta atualizar o Code.gs.')}
}
};
$('#nfBruto').focus();
}
function janela(titulo,corpo,botoes){
fecharDivisao();const sc=document.createElement('div');sc.className='modalscrim';sc.onclick=fecharDivisao;
const m=document.createElement('div');m.className='modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label',titulo);
m.innerHTML=`<h3>${esc(titulo)}</h3>${corpo}<div class="dvfoot"><span></span><div style="display:flex;gap:8px;flex-wrap:wrap">${botoes}<button class="btn" type="button" data-fechar>Fechar</button></div></div>`;
document.body.append(sc,m);m.querySelector('[data-fechar]').onclick=fecharDivisao;
m.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();fecharDivisao()}});return m;
}
const ICON_OLHO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
function valorDaNota(t){const n=lerNota(t);if(isNum(n.liquido))return n.liquido;const u=t.toUpperCase(),k=u.indexOf('VALOR TOTAL DA NOTA');if(k<0)return null;const m=/\d{1,3}(\.\d{3})*,\d{2}/.exec(t.slice(k,k+120));return m?parseMoney(m[0]):null}
function subirArquivo(pasta,cli,perm){return new Promise(ok=>{const inp=document.createElement('input');inp.type='file';
inp.accept='.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png';
inp.onchange=async()=>{const f=inp.files&&inp.files[0];if(!f)return;if(f.size>8e6){toast('Arquivo grande demais (máximo 8 MB).');return}
toast('Guardando o arquivo no Drive…');
try{const u=new Uint8Array(await f.arrayBuffer());let b='';for(let k=0;k<u.length;k+=0x8000)b+=String.fromCharCode.apply(null,u.subarray(k,k+0x8000));
const base={nome:f.name,url:null,data:new Date().toISOString().slice(0,10)};
if(perm){base.mes=refMes;if(f.type==='application/pdf'){try{base.valor=valorDaNota(await textoDoPdf(u.buffer.slice(0)))}catch(e){}}}
try{const res=await GA('salvarArquivo',pasta,`${cli} - ${f.name}`,btoa(b),f.type||'');ok({...base,url:res.url})}
catch(e){toast('Não consegui guardar no Drive. Falta atualizar o Code.gs no Apps Script.');if(perm)ok(base)}}
catch(e){toast('Não consegui ler o arquivo.')}};
inp.click()})}
const olho=a=>a.url?`<a class="mini olho" href="${esc(a.url)}" target="_blank" rel="noopener" title="Ver o arquivo" aria-label="Ver ${esc(a.nome)}">${ICON_OLHO}</a>`:`<span class="mini olho off" title="Arquivo não guardado no Drive">${ICON_OLHO}</span>`;
const listaArq=l=>l.length?l.map((a,i)=>`<div><span class="arqnome">${olho(a)}${esc(a.nome)}${a.data?` · ${esc(dataBR(a.data))}`:''}</span><button class="mini" type="button" data-rmarq="${i}" title="Tirar da lista" aria-label="Tirar ${esc(a.nome)} da lista">×</button></div>`).join(''):'<div><span>Nenhum arquivo ainda.</span></div>';
function abrirContrato(id){
if(!canWrite){toast('Você só tem acesso de leitura.');return}
const r=rows.find(x=>x.id===id);if(!r)return;
const m=janela(`Contrato · ${r.cliente||''}`,`<div class="dvprev plhist" id="arqL"></div><p class="sub" style="margin:0;font-size:12px">PDF ou Word. Fica guardado no Drive, na pasta GHAID Cash / Contratos.</p>`,`<button class="btn primary" type="button" id="arqAdd">Anexar contrato</button>`);
const grava=async(l,msg)=>{const v=l.length?JSON.stringify(l):null;await setCampo(id,'contrato',v,msg);const a=rows.find(x=>x.id===id);if(a)a.contrato=v;desenha()};
const desenha=()=>{if(!$('#arqL'))return;const l=lerJSON((rows.find(x=>x.id===id)||{}).contrato)||[];$('#arqL').innerHTML=listaArq(l);
m.querySelectorAll('[data-rmarq]').forEach(b=>b.onclick=()=>{const n=l.slice();const x=n.splice(+b.dataset.rmarq,1)[0];grava(n,`${r.cliente}: ${x.nome} tirado da lista`)})};
desenha();
$('#arqAdd').onclick=async()=>{const a=await subirArquivo('Contratos',r.cliente||'cliente');const l=lerJSON((rows.find(x=>x.id===id)||{}).contrato)||[];grava([...l,a],`${r.cliente}: contrato anexado`)};
}
function abrirPermuta(id){
if(!canWrite){toast('Você só tem acesso de leitura.');return}
const r=rows.find(x=>x.id===id);if(!r)return;
const pi=lerJSON(r.permutaInfo)||{}, pm=permutaNoMes(r);
const m=janela(`Permuta · ${r.cliente||''}`,`
<div class="field"><label for="pmDesc">Do que é a permuta</label><textarea id="pmDesc" rows="3" placeholder="Ex.: mercadoria, serviço, produtos, o que foi combinado">${esc(pi.desc||'')}</textarea></div>
<div class="dvdatas">
<div class="field"><label for="pmTotal">Valor acordado (total)</label><input id="pmTotal" inputmode="decimal" placeholder="0,00" value="${isNum(pi.total)?moedaTxt(pi.total):''}"></div>
<div class="field"><label for="pmVezes">Em quantas vezes</label><input id="pmVezes" inputmode="numeric" placeholder="Ex.: 6" value="${esc(pi.vezes||'')}"></div>
<div class="field"><label for="pmIni">A partir de</label><input id="pmIni" type="month" value="${esc(pi.inicio||refMes)}"></div>
<div class="field"><label>Por mês</label><div class="calcv" id="pmMes"></div></div>
</div>
<p class="sub" style="margin:0;font-size:12px">No plano de ${esc(mesLabel(refMes).toLowerCase())}: ${pm>0?`${brl.format(pm)} em permuta`:'sem parte em permuta'}. Para mudar o quanto sai do boleto, use Mudar valor do plano.</p>
<div class="sec">Notas e documentos</div><p class="sub" style="margin:0;font-size:12px">Em cada nota, confira o mês e o valor. O valor da nota em PDF é lido sozinho.</p><div class="dvprev" id="arqL"></div>
<div class="sec">Saldo da permuta</div><div id="pmSaldo"></div>`,
`<button class="btn" type="button" id="pmPlano">Mudar valor do plano</button><button class="btn" type="button" id="arqAdd">Anexar documento</button><button class="btn primary" type="button" id="pmSalvar">Salvar</button>`);
m.style.width='min(600px,calc(100% - 32px))';
const conta=()=>{const t=parseMoney($('#pmTotal').value),v=parseInt($('#pmVezes').value,10),ini=$('#pmIni').value;
$('#pmMes').textContent=isNum(t)&&v>0?`${brl.format(r2(t/v))}${/^\d{4}-\d{2}$/.test(ini)?`, até ${mesLabel(shiftMes(ini,v-1)).toLowerCase()}`:''}`:'—'};
$('#pmTotal').oninput=conta;$('#pmVezes').oninput=conta;$('#pmIni').onchange=conta;conta();
const atual=()=>lerJSON((rows.find(x=>x.id===id)||{}).permutaInfo)||{};
const grava=async(o,msg)=>{const vazio=!o.desc&&!isNum(o.total)&&!o.vezes&&!(o.arquivos||[]).length,v=vazio?null:JSON.stringify(o);await setCampo(id,'permutaInfo',v,msg);const a=rows.find(x=>x.id===id);if(a)a.permutaInfo=v;desenha()};
const combinado=(o,mm)=>{if(isNum(o.total)&&o.vezes>0&&o.inicio){return mm>=o.inicio&&mm<=shiftMes(o.inicio,o.vezes-1)?r2(o.total/o.vezes):0}return permutaNoMes(r,mm)};
const saldo=()=>{const o=atual(),l=o.arquivos||[],ms=new Set(l.filter(a=>a.mes).map(a=>a.mes));
if(isNum(o.total)&&o.vezes>0&&o.inicio)for(let k=0;k<o.vezes;k++)ms.add(shiftMes(o.inicio,k));
const meses=[...ms].sort();if(!meses.length)return '<p class="sub" style="margin:0;font-size:12px">Preencha o valor acordado, as vezes e o mês de início, ou lance o mês e o valor das notas.</p>';
let ac=0,ate=0;const fx=v=>`<span class="${v<-0.009?'neg':v>0.009?'pos':''}">${v<-0.009?'− ':v>0.009?'+ ':''}${brl.format(Math.abs(v))}</span>`;
const linhas=meses.map(mm=>{const c=combinado(o,mm),n=r2(l.filter(a=>a.mes===mm&&isNum(a.valor)).reduce((t,a)=>t+a.valor,0)),d=r2(c-n);ac=r2(ac+d);if(mm<=refMes)ate=ac;
return `<span${mm===refMes?' style="font-weight:700"':''}>${mm.slice(5)}/${mm.slice(0,4)}</span><span class="pmx">${brl.format(c)}</span><span class="pmx">${brl.format(n)}</span>${fx(d)}${fx(ac)}`}).join('');
return `<div class="pmsaldo"><span class="h">Mês</span><span class="h pmx">Combinado</span><span class="h pmx">Notas</span><span class="h">No mês</span><span class="h">Acumulado</span>${linhas}</div>
<p class="sub" style="margin:6px 0 0;font-size:12px">Até ${esc(mesLabel(refMes).toLowerCase())}: ${ate<-0.009?`passou do combinado em ${brl.format(-ate)} (compra a acertar).`:ate>0.009?`ainda há ${brl.format(ate)} de permuta a usar.`:'notas iguais ao combinado.'} Contrato inteiro: ${fx(ac)}.</p>`};
const desenha=()=>{if(!$('#arqL'))return;const l=atual().arquivos||[];
$('#arqL').innerHTML=l.length?l.map((a,i)=>`<div class="pmnota"><span class="arqnome">${olho(a)}<span>${esc(a.nome)}</span></span><input type="month" data-pmmes="${i}" value="${esc(a.mes||'')}" aria-label="Mês da nota"><input inputmode="decimal" data-pmval="${i}" placeholder="Valor" value="${isNum(a.valor)?moedaTxt(a.valor):''}" aria-label="Valor da nota"><button class="mini" type="button" data-rmarq="${i}" title="Tirar da lista" aria-label="Tirar ${esc(a.nome)} da lista">×</button></div>`).join(''):'<div><span>Nenhuma nota ainda.</span></div>';
$('#pmSaldo').innerHTML=saldo();
const muda=(i,campo,v)=>{const o=atual(),n=(o.arquivos||[]).slice();n[i]={...n[i],[campo]:v};grava({...o,arquivos:n},`${r.cliente}: nota da permuta atualizada`)};
m.querySelectorAll('[data-pmmes]').forEach(x=>x.onchange=()=>muda(+x.dataset.pmmes,'mes',x.value||null));
m.querySelectorAll('[data-pmval]').forEach(x=>x.onchange=()=>{const v=parseMoney(x.value);if(isNaN(v)){toast('Valor inválido. Use algo como 504,00.');return}muda(+x.dataset.pmval,'valor',v)});
m.querySelectorAll('[data-rmarq]').forEach(b=>b.onclick=()=>{const n=l.slice();const x=n.splice(+b.dataset.rmarq,1)[0];grava({...atual(),arquivos:n},`${r.cliente}: ${x.nome} tirado da permuta`)})};
desenha();
$('#arqAdd').onclick=async()=>{const a=await subirArquivo('Permutas',r.cliente||'cliente',true);const o=atual();grava({...o,arquivos:[...(o.arquivos||[]),a]},`${r.cliente}: documento da permuta anexado`)};
$('#pmPlano').onclick=()=>abrirPlano(id);
$('#pmSalvar').onclick=async()=>{const t=parseMoney($('#pmTotal').value),v=parseInt($('#pmVezes').value,10);
if(isNaN(t)){toast('Valor acordado inválido. Use algo como 3.000,00.');$('#pmTotal').focus();return}
const o={...atual(),desc:$('#pmDesc').value.trim(),total:isNum(t)?t:null,vezes:v>0?v:null,inicio:$('#pmIni').value||null};
fecharDivisao();await grava(o,`${r.cliente}: permuta salva`)};
}
function abrirDivisao(id,aoSalvar){
const r=rows.find(x=>x.id===id); if(!r) return;
const total=tm(r), div=lerJSON(r.boleto2)||{}, plano=planoValor(r), adic=isNum(total)?r2(total-plano):0;
let modo=div.modo==='adicionais'?'adicionais':'valor';
const v1=vencEscolhido(div.venc1,div.dia1)||isoNoMes(r.diaEnvio)||'', v2=vencEscolhido(div.venc2,div.dia2)||'';
fecharDivisao();
const scrim=document.createElement('div'); scrim.className='modalscrim'; scrim.onclick=fecharDivisao;
const m=document.createElement('div'); m.className='modal'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-label','Dividir em 2 boletos');
m.innerHTML=`<h3>Dividir em 2 boletos</h3>
<p class="sub" style="margin:0;font-size:13px">${esc(r.cliente||'')} · total ${isNum(total)?brl.format(total):'sem valor'}</p>
<div class="modos">
<label class="modo"><input type="radio" name="dvModo" value="valor"${modo==='valor'?' checked':''}><span><strong>Dividir o valor total</strong><small>Você escolhe o valor do 1º; o 2º é o restante.</small></span></label>
<label class="modo"><input type="radio" name="dvModo" value="adicionais"${modo==='adicionais'?' checked':''}><span><strong>Plano fixo e adicionais separados</strong><small>Plano ${brl.format(plano)} num boleto, adicionais ${brl.format(Math.max(0,adic))} no outro.</small></span></label>
</div>
<div class="field" id="dvValorWrap"><label for="dvValor">Valor do 1º boleto</label><input id="dvValor" inputmode="decimal" placeholder="Metade: ${isNum(total)?moedaTxt(r2(total/2)):'0,00'}" value="${isNum(div.valor1)?moedaTxt(div.valor1):''}"></div>
<div class="dvdatas">
<div class="field"><label for="dvD1">Data do 1º boleto</label><input id="dvD1" type="date" value="${v1}"></div>
<div class="field"><label for="dvD2">Data do 2º boleto</label><input id="dvD2" type="date" value="${v2}"></div>
</div>
<div class="dvprev" id="dvPrev"></div>
<div class="dvfoot">${r.boleto2?'<button class="btn" type="button" id="dvRemover">Voltar a boleto único</button>':'<span></span>'}<div style="display:flex;gap:8px"><button class="btn" type="button" id="dvCancel">Cancelar</button><button class="btn primary" type="button" id="dvSalvar">Salvar divisão</button></div></div>`;
document.body.append(scrim,m);
const montar=()=>{
modo=m.querySelector('input[name="dvModo"]:checked').value;
const v=parseMoney($('#dvValor').value);
return {modo,valor1:modo==='valor'&&isNum(v)?v:null,venc1:$('#dvD1').value||null,venc2:$('#dvD2').value||null};
};
const prever=()=>{
const d=montar(); $('#dvValorWrap').hidden=d.modo!=='valor';
const ps=partesBoleto(r,d,total);
$('#dvPrev').innerHTML=ps.map((x,i)=>`<div><span>${ps.length>1?`${i+1}º boleto`:'Boleto único'}${x.rotulo?` · ${esc(x.rotulo)}`:''}</span><span>${isNum(x.valor)?brl.format(x.valor):''} · ${x.venc?dataBR(x.venc):'escolha a data'}</span></div>`).join('');
};
m.addEventListener('input',prever); m.addEventListener('change',prever); prever();
$('#dvCancel').onclick=fecharDivisao;
m.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();fecharDivisao()}});
if($('#dvRemover')) $('#dvRemover').onclick=()=>{fecharDivisao();aoSalvar(null)};
$('#dvSalvar').onclick=()=>{
const d=montar();
if(d.modo==='valor'){const v=parseMoney($('#dvValor').value);if(v!==null&&(isNaN(v)||!isNum(total)||v<=0||v>=total)){toast('Valor do 1º boleto precisa ser maior que zero e menor que o total.');$('#dvValor').focus();return}}
if(!d.venc1){toast('Escolha a data do 1º boleto.');$('#dvD1').focus();return}
if(!d.venc2){toast('Escolha a data do 2º boleto.');$('#dvD2').focus();return}
fecharDivisao(); aoSalvar(JSON.stringify(d));
};
($('#dvD2').value?$('#dvSalvar'):$('#dvD2')).focus();
}
function abrirPlano(id){
if(!canWrite){toast('Você só tem acesso de leitura.');return}
const r=rows.find(x=>x.id===id); if(!r) return;
const atual=planoNoMes(r), h=planoHist(r), pmAtual=permutaNoMes(r);
const temPm=h.some(e=>'permuta' in e);
const pmTxt=e=>{const pm=temPm?(isNum(e.permuta)?e.permuta:0):permutaNoMes({valorPermuta:r.valorPermuta});return pm>0?` + ${brl.format(pm)} permuta`:''};
const nome=e=>e.desde===PLANO_BASE?'Até então':`Desde ${mesLabel(e.desde).toLowerCase()}`;
const linhas=h.length?h.slice().reverse().map(e=>`<div><span>${esc(nome(e))}</span><span>${isNum(e.valor)?brl.format(e.valor):'sem valor'}${esc(pmTxt(e))}${e.desde!==PLANO_BASE?` <button class="mini" type="button" data-rmdesde="${e.desde}" aria-label="Apagar o registro ${esc(nome(e))}" title="Apagar este registro">×</button>`:''}</span></div>`).join('')
:`<div><span>Desde o início</span><span>${isNum(r.valorMensal)?brl.format(r.valorMensal):'sem valor'}${esc(pmTxt({}))}</span></div>`;
fecharDivisao();
const scrim=document.createElement('div'); scrim.className='modalscrim'; scrim.onclick=fecharDivisao;
const m=document.createElement('div'); m.className='modal'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-label','Valor do plano');
m.innerHTML=`<h3>Valor do plano</h3>
<p class="sub" style="margin:0;font-size:13px">${esc(r.cliente||'')} · em ${esc(mesLabel(refMes).toLowerCase())}: ${isNum(atual)?brl.format(atual):'sem valor'}${pmAtual>0?` + ${brl.format(pmAtual)} em permuta`:''}</p>
<div class="dvdatas">
<div class="field"><label for="plValor">No boleto</label><input id="plValor" inputmode="decimal" placeholder="0,00" value="${isNum(atual)?moedaTxt(atual):''}"></div>
<div class="field"><label for="plPerm">Em permuta</label><input id="plPerm" inputmode="decimal" placeholder="0,00 (sem permuta)" value="${pmAtual>0?moedaTxt(pmAtual):''}"></div>
<div class="field"><label for="plDesde">Vale a partir de</label><input id="plDesde" type="month" value="${refMes}"></div>
</div>
<p class="sub" id="plTotal" style="margin:0;font-size:13px"></p>
<p class="sub" style="margin:0;font-size:12px">Os meses antes dessa data continuam com o valor anterior. Use para renovação ou mudança de plano.</p>
<div class="sec">Linha do tempo do plano</div>
<div class="dvprev plhist">${linhas}</div>
<div class="dvfoot"><span></span><div style="display:flex;gap:8px"><button class="btn" type="button" id="plCancel">Cancelar</button><button class="btn primary" type="button" id="plSalvar">Salvar</button></div></div>`;
document.body.append(scrim,m);
const gravar=async(nh,msg)=>{
const antes=copia(r), vHoje=nh.length?planoNoMes({planoHist:nh},MES_HOJE):r.valorMensal;
const pHoje=nh.length?permutaNoMes({planoHist:nh,valorPermuta:r.valorPermuta},MES_HOJE):r.valorPermuta;
const novo={planoHist:nh.length?JSON.stringify(nh):null,valorMensal:isNum(vHoje)?vHoje:null,valorPermuta:isNum(pHoje)&&pHoje>0?pHoje:null};
Object.assign(r,novo); render();
try{await writeDoc(id,novo,'update');const a=rows.find(x=>x.id===id);if(a)Object.assign(a,novo);render();oferecerDesfazer(msg,[{id,antes}])}catch(e){handleWriteErr(e)}
};
$('#plCancel').onclick=fecharDivisao;
m.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();fecharDivisao()}});
m.querySelectorAll('[data-rmdesde]').forEach(b=>b.onclick=()=>{
const d=b.dataset.rmdesde, nh=h.filter(e=>e.desde!==d);
fecharDivisao(); gravar(nh,`Registro de ${mesLabel(d).toLowerCase()} apagado`);
});
const somaPl=()=>{const v=parseMoney($('#plValor').value), pm=parseMoney($('#plPerm').value);
$('#plTotal').innerHTML=isNum(pm)&&pm>0&&isNum(v)?`Valor total do plano: <strong>${brl.format(v+pm)}</strong> (${brl.format(v)} no boleto e ${brl.format(pm)} em permuta)`:'O boleto cobra só o valor em dinheiro. A permuta fica registrada e não entra no boleto.'};
$('#plValor').oninput=somaPl; $('#plPerm').oninput=somaPl; somaPl();
$('#plSalvar').onclick=()=>{
const v=parseMoney($('#plValor').value), desde=$('#plDesde').value, pmRaw=parseMoney($('#plPerm').value);
if(v===null||isNaN(v)){toast('Digite o valor do plano. Use algo como 1.380,00.');$('#plValor').focus();return}
if(isNaN(pmRaw)||(isNum(pmRaw)&&pmRaw<0)){toast('Valor da permuta inválido. Use algo como 500,00 ou deixe vazio.');$('#plPerm').focus();return}
const pm=isNum(pmRaw)?pmRaw:0;
if(!/^\d{4}-\d{2}$/.test(desde)){toast('Escolha o mês em que o valor começa a valer.');$('#plDesde').focus();return}
let nh=h.slice();
if(!nh.length&&isNum(r.valorMensal)) nh=[{desde:PLANO_BASE,valor:r.valorMensal}]; // valor de antes vale para o passado
if(!temPm&&(pm>0||pmAtual>0)) nh=nh.map(e=>({...e,permuta:permutaNoMes({valorPermuta:r.valorPermuta})}));
const reg=pm>0||temPm||pmAtual>0?{desde,valor:v,permuta:pm}:{desde,valor:v};
if(!nh.length) nh=[{...reg,desde:PLANO_BASE}]; // cliente sem valor: vale para todos os meses
else{nh=nh.filter(e=>e.desde!==desde);nh.push(reg);nh.sort((a,b)=>a.desde<b.desde?-1:1)}
fecharDivisao(); gravar(nh,`${r.cliente}: ${brl.format(v)}${pm>0?` + ${brl.format(pm)} em permuta`:''} a partir de ${mesLabel(desde).toLowerCase()}`);
};
$('#plValor').focus(); $('#plValor').select();
}
function openBoletos(){
if(ASSIST()) return;
const draw=()=>{
const cfg=cfgBoleto(), lista=boletosDoMes(), prontos=lista.filter(vaiNoTexto), nAguarda=lista.filter(b=>!b.gerar).length;
const nBol=prontos.reduce((s,b)=>s+b.partes.length,0), soma=prontos.reduce((s,b)=>s+b.total,0);
const card=b=>{
const r=b.r, g=ehGrupo(r);
const pagador=g?`<select data-pagador aria-label="Pagador do grupo ${esc(r.cliente)}">${contasDe(r).map(c=>`<option value="${esc(c.id)}"${c.id===b.pag.id?' selected':''}>Pagador: ${esc(c.cliente)}</option>`).join('')}</select> `:'';
return `<div class="bol${!b.gerar?' off':b.faltas.length?' falta':''}" data-id="${esc(r.id)}">
<div class="bolhead"><strong>${esc(r.cliente||'sem nome')}${g?' · grupo':''}${b.esp?' · esporádico':''}</strong><span class="v">${isNum(b.total)?brl.format(b.total):'sem valor'}</span></div>
<div class="bolsub">${pagador}${esc(valido(b.pag.razao)?b.pag.razao:'sem razão social')} · ${esc(valido(b.pag.doc)?b.pag.doc:'sem CNPJ/CPF')}</div>
<div class="bolsub${emailDe(b)||whatsDe(b)?'':' bolsememail'}">${emailDe(b)?esc(emailDe(b)):'<span class="bolsememail">sem e-mail</span>'} · ${whatsDe(b)?`WhatsApp ${esc(whatsDe(b))}`:'<span class="bolsememail">sem WhatsApp</span>'}</div>
${b.partes.map((x,i)=>`<div class="bolparte"><span>${b.partes.length>1?`Boleto ${i+1} de ${b.partes.length}${x.rotulo?` · ${esc(x.rotulo)}`:''}`:`Boleto único${x.rotulo?` · ${esc(x.rotulo)}`:''}`} · venc. ${x.venc?dataBR(x.venc):'sem data'}${!b.div&&x.venc?' <span class="bolorig">(Dia de vencimento)</span>':''}</span><span>${isNum(x.valor)?brl.format(x.valor):''}</span></div>`).join('')}
${(it=>it.length?`<div class="bolitens"><span class="bolitt">${ehEsporadico(r)?'Serviços do mês':'Adicionais do mês'}</span>${it.map(i=>{const st=sitDe(i);return `<div><span>${esc(i.desc||'Item')}</span><span>${st?SIT_TEXTO[st]:isNum(i.valor)?brl.format(i.valor):'sem preço'}</span></div>`}).join('')}</div>`:'')(itemsOf(r))}
${conferirBoleto(b).map(c=>`<div class="bolconf"><span>${esc(c.txt)}</span><button class="mini" type="button" data-conf="${c.acao}" title="Marcar como conferido" aria-label="Marcar como conferido">Conferido</button></div>`).join('')}
<label class="boldiv bolok"><input type="checkbox" data-incluir${b.incluir?' checked':''}> OK para disparar</label>
${b.faltas.length&&(b.gerar||b.faltas.includes('adicional sem preço'))?`<div class="bolfalta">Falta: ${esc(b.faltas.join(', '))}</div>`:''}
${(nf=>nf?`<div class="bolnota"><span>Nota fiscal${nf.num?` nº ${esc(nf.num)}`:''}: ${brl.format(nf.bruto)}${nf.iss>0?` − ISS retido ${brl.format(nf.iss)}`:''} ${boletoPelaNota(r,nf)!==nf.liquido?` − permuta ${brl.format(permutaNoMes(r))}`:''} = <strong>${brl.format(boletoPelaNota(r,nf))}</strong> no boleto${nf.arquivo?` · <a href="${esc(nf.arquivo)}" target="_blank" rel="noopener">ver PDF</a>`:''}${nf.arqNome?`<br><span class="bolorig">Para o envio, deixe o arquivo ${esc(nf.arqNome)} na pasta ${esc(PASTA_BOLETOS())}.</span>`:''}</span><span class="bolnotabtns"><button class="mini" type="button" data-nota title="Trocar a nota">Trocar</button><button class="mini" type="button" data-semnota title="Tirar a nota deste mês">Remover</button></span></div>`:'')(notaDoMes(r))}
<div class="bolbtns"><button class="btn bolbtn" type="button" data-dividir>${b.div?'Editar divisão em 2 boletos':'Dividir em 2 boletos'}</button>${notaDoMes(r)?'':'<button class="btn bolbtn" type="button" data-nota>Anexar nota fiscal</button>'}</div>
</div>`;
};
shell('Boletos do mês',`
<p class="sub" style="margin:0;font-size:13px">${esc(mesLabel(refMes))}: ${nBol} boleto(s) com OK para disparar, somando ${brl.format(soma)}. Aqui aparecem os clientes com <strong>OK</strong> no Status cobrança deste mês${nAguarda?` (${nAguarda} sem OK na coluna)`:''}. Confira, decida a forma de pagamento e marque <strong>OK para disparar</strong> em quem vai neste disparo: só esses entram nos textos. Não pagantes, contas de grupo e arquivados ficam de fora. Os valores são de ${esc(mesLabel(refMes).toLowerCase())} e o vencimento fica em <strong>${esc(mesLabel(mesVenc()).toLowerCase())}</strong>, no dia da coluna Dia de vencimento.</p>
<div class="bolcfg"><div class="field"><label for="bDocProx">Próximo nº do documento</label><input id="bDocProx" inputmode="numeric" value="${refMes.replace('-','')}-${String(docInicio(lista)).padStart(2,'0')}"></div><div></div></div>
<div class="bolcfg"><div class="field"><label for="bJuros">Juros</label><input id="bJuros" value="${esc(cfg.juros)}"></div><div class="field"><label for="bMulta">Multa</label><input id="bMulta" value="${esc(cfg.multa)}"></div></div>
${(n=>n?`<div class="bolaguarda">${n} cobrança(s) com algo para conferir (aviso tracejado no cartão). Confira e clique em Conferido.</div>`:'')(lista.filter(b=>b.gerar&&!b.disp&&conferirBoleto(b).length).length)}
<div class="sec">Cobranças</div>
<div class="imp">${lista.filter(b=>b.gerar&&!b.disp).map(card).join('')||`<div class="sub">Nenhum cliente para disparar em ${esc(mesLabel(refMes).toLowerCase())}. Marque OK na coluna Status cobrança de quem está liberado.</div>`}</div>
${prontos.length?`<div class="bollote"><button class="btn" type="button" id="bolDisparado">Marcar estes ${prontos.length} como disparados</button><span>Use depois de gerar e enviar. Eles saem da lista deste mês e não entram de novo no próximo disparo.</span></div>`:''}
${(n=>n.length?`<div class="bolaguarda">Já disparados em ${esc(mesLabel(refMes).toLowerCase())} (${n.length}): ${n.map(b=>`<span class="bolchip">${esc(b.r.cliente)}<button type="button" data-voltar="${esc(b.r.id)}" title="Voltar para a lista" aria-label="Voltar ${esc(b.r.cliente)} para a lista">×</button></span>`).join(' ')}</div>`:'')(lista.filter(b=>b.disp))}
${nAguarda?`<div class="bolaguarda">${nAguarda} cliente(s) sem OK em ${esc(mesLabel(refMes).toLowerCase())} não aparecem aqui: ${esc(lista.filter(b=>!b.gerar).map(b=>b.r.cliente).join(', '))}.</div>`:''}
<div class="sec">Envio pelo financeiro</div>
<label class="boldiv bolok"><input type="checkbox" id="bAuto"${autoEnvio()?' checked':''}> Claude segue sozinho, sem pedir confirmação a cada boleto e mensagem</label>
<p class="sub" style="margin:0;font-size:12px">Ele só para se algo não bater (pagador sem cadastro, dados diferentes, PDF não encontrado) e mostra um resumo no final. Deixe desmarcado se quiser conferir um por um.</p>
<div class="bolcfg"><div class="field"><label for="bDeEmail">E-mail que envia</label><input id="bDeEmail" type="email" placeholder="financeiro@..." value="${esc(envioCfg().email)}"></div><div class="field"><label for="bDeWhats">WhatsApp que envia</label><input id="bDeWhats" inputmode="tel" placeholder="51 99999-9999" value="${esc(envioCfg().whats)}"></div></div>
<div class="sec">1. Texto para gerar os boletos (Claude in Chrome no Sicredi)</div>
<p class="sub" style="margin:0;font-size:12px">Os PDFs vão para <strong>${esc(PASTA_BOLETOS())}</strong>. Antes de colar: crie essa pasta e, no Chrome (chrome://settings/downloads), mude o Local para ela, com "Perguntar onde salvar" desligado.</p>
<textarea class="emailbox" id="bolTexto" readonly>${esc(textoBoletos(lista))}</textarea>
<div><button class="btn" id="bolCopiar" type="button">Copiar texto 1</button></div>
<div class="sec">2. Texto para enviar os e-mails (Claude in Chrome no Gmail, depois de gerar)</div>
<p class="sub" style="margin:0;font-size:12px">O fim da mensagem vale para o e-mail e para o WhatsApp.</p>
<div class="field"><label for="bFim">Saudação final do e-mail</label><textarea id="bFim" rows="3">${esc(emailFim())}</textarea></div>
<textarea class="emailbox" id="bolEmails" readonly>${esc(textoEmails(lista))}</textarea>
<div><button class="btn" id="bolCopiar2" type="button">Copiar texto 2</button></div>
<div class="sec">3. Texto para enviar pelo WhatsApp (Claude in Chrome no WhatsApp Web, depois de gerar)</div>
<textarea class="emailbox" id="bolWhats" readonly>${esc(textoWhats(lista))}</textarea>
<div><button class="btn" id="bolCopiar3" type="button">Copiar texto 3</button></div>`,
`<span></span><div style="display:flex;gap:8px"><button class="btn" id="bolFechar" type="button">Fechar</button></div>`);
painelVivo=draw;
$('#bolFechar').onclick=closeDrawer;
const marcarDisparo=async(lista2,dentro,msg)=>{
if(!canWrite){toast('Você só tem acesso de leitura.');return}
const antes=lista2.map(r=>({id:r.id,antes:copia(r)}));
const totais=new Map(boletosDoMes().map(b=>[b.r.id,b.total]));
const novos=new Map(lista2.map(r=>{const st=new Set(lerJSON(r.disparoMeses)||[]);dentro?st.add(refMes):st.delete(refMes);const a=[...st].sort(),o={disparoMeses:a.length?JSON.stringify(a):null};
if(dentro&&isNum(totais.get(r.id)))o.valorBoleto=totais.get(r.id);return [r.id,o]}));
lista2.forEach(r=>Object.assign(r,novos.get(r.id))); draw();
try{await writeMany(lista2.map(r=>[r.id,novos.get(r.id)]));lista2.forEach(r=>{const a=rows.find(x=>x.id===r.id);if(a)Object.assign(a,novos.get(r.id))});draw();oferecerDesfazer(msg,antes)}
catch(e){handleWriteErr(e)}
};
if($('#bolDisparado')) $('#bolDisparado').onclick=()=>{const b=$('#bolDisparado');
if(b.dataset.armed!=='1'){b.dataset.armed='1';b.classList.add('armed');b.textContent=`Confirmar: ${prontos.length} disparados?`;setTimeout(()=>{if(b.isConnected){b.dataset.armed='';b.classList.remove('armed');b.textContent=`Marcar estes ${prontos.length} como disparados`}},4000);return}
marcarDisparo(prontos.map(x=>x.r),true,`${prontos.length} cliente(s) marcados como disparados em ${mesLabel(refMes).toLowerCase()}`)};
document.querySelectorAll('[data-voltar]').forEach(x=>x.onclick=()=>{const r=rows.find(y=>y.id===x.dataset.voltar);if(r)marcarDisparo([r],false,`${r.cliente} voltou para a lista de disparo`)});
const copiar=(sel,msg)=>{const t=$(sel).value;const fb=()=>{const el=$(sel);el.focus();el.select();toast('Texto selecionado. Use Ctrl+C (ou Cmd+C) para copiar.')};
try{navigator.clipboard.writeText(t).then(()=>toast(msg),fb)}catch(e){fb()}};
$('#bolCopiar').onclick=()=>copiar('#bolTexto','Texto 1 copiado. Cole no Claude in Chrome com o Sicredi aberto.');
$('#bolCopiar2').onclick=()=>copiar('#bolEmails','Texto 2 copiado. Cole no Claude in Chrome com o Gmail aberto.');
$('#bolCopiar3').onclick=()=>copiar('#bolWhats','Texto 3 copiado. Cole no Claude in Chrome com o WhatsApp Web aberto.');
const salvarEnvio=()=>{
const em=normEmails($('#bDeEmail').value), wv=$('#bDeWhats').value.trim(), wn=wv?normWhats(wv):null;
if(em&&em.err){toast(em.err);$('#bDeEmail').focus();return}
if(wn&&wn.err){toast(wn.err);$('#bDeWhats').focus();return}
cfgFlags={...cfgFlags,envio:{email:em||'',whats:wn||''}};saveCols();
if(wn) $('#bDeWhats').value=wn;
$('#bolEmails').value=textoEmails(boletosDoMes());$('#bolWhats').value=textoWhats(boletosDoMes());toast('Contas de envio salvas')};
$('#bAuto').onchange=e=>{cfgFlags={...cfgFlags,autoEnvio:e.target.checked};saveCols();const l=boletosDoMes();$('#bolTexto').value=textoBoletos(l);$('#bolEmails').value=textoEmails(l);$('#bolWhats').value=textoWhats(l);toast(e.target.checked?'Claude vai seguir sozinho nos textos 1, 2 e 3':'Claude vai pedir confirmação a cada um')};
$('#bDeEmail').onchange=salvarEnvio; $('#bDeWhats').onchange=salvarEnvio;
$('#bFim').onchange=()=>{const v=$('#bFim').value.trim();cfgFlags={...cfgFlags,emailFim:v&&v!==EMAIL_FIM_PADRAO?v:''};saveCols();$('#bolEmails').value=textoEmails(boletosDoMes());$('#bolWhats').value=textoWhats(boletosDoMes());toast('Saudação final salva')};
const salvarCfg=()=>{cfgFlags={...cfgFlags,boleto:{juros:$('#bJuros').value.trim()||BOLETO_PADRAO.juros,multa:$('#bMulta').value.trim()||BOLETO_PADRAO.multa}};saveCols();$('#bolTexto').value=textoBoletos(boletosDoMes());toast('Juros e multa salvos')};
$('#bJuros').onchange=salvarCfg; $('#bMulta').onchange=salvarCfg;
$('#bDocProx').onchange=()=>{const m=/(\d+)\s*$/.exec($('#bDocProx').value), v=m?parseInt(m[1],10):NaN;
if(!(v>=1&&v<1000)){toast('Use só o número final, como 23.');$('#bDocProx').value=`${refMes.replace('-','')}-${String(docInicio(boletosDoMes())).padStart(2,'0')}`;return}
cfgFlags={...cfgFlags,docProx:{...(cfgFlags.docProx||{}),[refMes]:v}};saveCols();draw();toast(`Numeração deste mês começa no ${String(v).padStart(2,'0')}`)};
const salvarDiv=async(id,valor)=>{await setCampo(id,'boleto2',valor,valor?'Divisão em 2 boletos salva':'Volta a ser boleto único');const a=rows.find(x=>x.id===id);if(a)a.boleto2=valor;draw()};
document.querySelectorAll('.bol').forEach(el=>{
const id=el.dataset.id;
el.querySelector('[data-dividir]').onclick=()=>abrirDivisao(id,v=>salvarDiv(id,v));
el.querySelectorAll('[data-nota]').forEach(btn=>btn.onclick=()=>escolherNota(id,draw));
el.querySelector('[data-semnota]')?.addEventListener('click',async()=>{const r=rows.find(x=>x.id===id);if(!r)return;
const n={...(lerJSON(r.notasMeses)||{})};delete n[refMes];const v=Object.keys(n).length?JSON.stringify(n):null;
await setCampo(id,'notasMeses',v,`${r.cliente}: nota de ${mesLabel(refMes).toLowerCase()} removida`);const a=rows.find(x=>x.id===id);if(a)a.notasMeses=v;draw()});
el.querySelectorAll('[data-conf]').forEach(btn=>btn.onclick=async()=>{ // conferido: vínculo vira Confirmado; valor: o último boleto passa a ser o deste mês
const r=rows.find(x=>x.id===id); if(!r) return;
if(btn.dataset.conf==='zero'){openItems(id);return}
if(btn.dataset.conf==='nota'){toast('Se a nota estiver errada, use Trocar ou Remover na linha da nota.');return}
if(btn.dataset.conf==='vinculo'){await setCampo(id,'vinculo','Confirmado',`${r.cliente}: cadastro conferido`);const a=rows.find(x=>x.id===id);if(a)a.vinculo='Confirmado'}
else{const t=tm(r);await setCampo(id,'valorBoleto',isNum(t)?t:null,`${r.cliente}: valor conferido`);const a=rows.find(x=>x.id===id);if(a)a.valorBoleto=isNum(t)?t:null}
draw();
});
el.querySelector('[data-incluir]')?.addEventListener('change',async e=>{ // OK de dentro do painel: entra neste disparo
const r=rows.find(x=>x.id===id); if(!r) return;
const st=new Set(lerJSON(r.liberadoMeses)||[]); e.target.checked?st.add(refMes):st.delete(refMes);
const a=[...st].sort(), v=a.length?JSON.stringify(a):null;
await setCampo(id,'liberadoMeses',v,e.target.checked?`${r.cliente}: OK para disparar`:`${r.cliente}: fora deste disparo`);
const x=rows.find(y=>y.id===id); if(x) x.liberadoMeses=v; draw();
});
el.querySelector('[data-pagador]')?.addEventListener('change',e=>{const v=e.target.value;setCampo(id,'pagadorId',v,'Pagador do grupo salvo').then(()=>{const a=rows.find(x=>x.id===id);if(a)a.pagadorId=v;draw()})});
});
};
draw();
}
function abrirAgrupar(){
if(!canWrite){toast('Você só tem acesso de leitura.');return}
const contas=[...selecionados].map(id=>rows.find(r=>r.id===id)).filter(r=>r&&!ehGrupo(r)&&!ehConta(r)).sort((a,b)=>coll.compare(a.cliente||'',b.cliente||''));
if(contas.length<2){toast('Selecione pelo menos 2 clientes para agrupar.');return}
const soma=contas.reduce((s,r)=>s+planoValor(r),0);
const nItens=contas.reduce((s,r)=>s+(Array.isArray(r.adicionaisItens)?r.adicionaisItens.length:0),0);
const contato=(contas.find(r=>!isEmpty(r.email)&&!ehIsento(r.email))||{}).email||'';
shell('Agrupar clientes',`
<p class="sub" style="margin:0;font-size:13px">O grupo vira uma linha com um só valor do plano, adicionais e total. As contas ficam logo abaixo dela, só com os dados de cadastro.</p>
<div class="imp">${contas.map(r=>`<div class="imp-row"><span class="nm">${esc(r.cliente||'sem nome')}</span><span class="tag">${isNum(planoNoMes(r))?brl.format(planoNoMes(r)):'sem valor'}</span></div>`).join('')}
<div class="imp-row soma"><span class="nm">Soma das contas</span><span class="tag">${brl.format(soma)}</span></div></div>
<div class="field"><label for="gNome">Nome do grupo (quem paga)</label><input id="gNome" autocomplete="off" placeholder="Ex.: Grupo R. Selau"></div>
<div class="field"><label for="gValor">Valor do plano do grupo</label><input id="gValor" inputmode="decimal" value="${moedaTxt(soma)}" placeholder="0,00"></div>
<div class="field"><label for="gDia">Dia de vencimento do boleto</label><input id="gDia" value="${esc(maisComum(contas.map(r=>r.diaEnvio)))}" placeholder="Ex.: 10"></div>
<div class="field"><label for="gContato">E-mail p/ boleto</label><input id="gContato" type="email" value="${esc(contato)}"></div>
${nItens?`<p class="sub" style="margin:0;font-size:12px">${nItens} adicional(is) que estavam nas contas passam para o grupo, com o nome da conta na frente. Ao desagrupar, cada um volta para a sua conta.</p>`:''}`,
`<span></span><div style="display:flex;gap:8px"><button class="btn" id="gCancel" type="button">Cancelar</button><button class="btn primary" id="gSave" type="button">Agrupar ${contas.length} contas</button></div>`);
$('#gNome').focus();
$('#gCancel').onclick=closeDrawer;
$('#gSave').onclick=async()=>{
const nome=$('#gNome').value.trim().replace(/\s+/g,' ');
if(!nome){toast('Dê um nome ao grupo.');$('#gNome').focus();return}
const v=parseMoney($('#gValor').value);
if(v!==null&&isNaN(v)){toast('Valor do plano inválido. Use algo como 1.380,00.');$('#gValor').focus();return}
const gid=db.collection('clientes').doc().id;
const antes=contas.map(r=>({id:r.id,antes:copia(r)}));
const itensGrupo=[];
contas.forEach(r=>(Array.isArray(r.adicionaisItens)?r.adicionaisItens:[]).forEach(i=>itensGrupo.push({...i,desc:`${r.cliente}: ${i.desc||''}`.trim()})));
const grupo={cliente:nome.toUpperCase(),tipo:'grupo',valorMensal:v,diaEnvio:$('#gDia').value.trim()||null,email:(v=>v&&!v.err?v:null)(normEmails($('#gContato').value)),adicionaisItens:itensGrupo};
$('#gSave').disabled=true;
rows.push({id:gid,...copia(grupo)}); contas.forEach(r=>{r.grupoId=gid;r.adicionaisItens=[]});
selecionados.clear(); closeDrawer(); render();
try{
await writeMany([[gid,grupo,'set'],...contas.map(r=>[r.id,{grupoId:gid,adicionaisItens:[]}])]);
oferecerDesfazer(`Grupo ${grupo.cliente} criado com ${contas.length} contas`,[{id:gid,antes:null},...antes]);
}catch(e){handleWriteErr(e)}
};
}
function abrirDesagrupar(gid){
if(!canWrite){toast('Você só tem acesso de leitura.');return}
const g=rows.find(x=>x.id===gid); if(!ehGrupo(g)) return;
const contas=contasDe(g);
const itens=Array.isArray(g.adicionaisItens)?g.adicionaisItens:[];
const dono=i=>contas.find(c=>c.cliente&&String(i.desc||'').startsWith(`${c.cliente}: `));
const voltam=itens.filter(dono), soltos=itens.filter(i=>!dono(i));
shell(`Desagrupar ${g.cliente||'grupo'}`,`
<p class="sub" style="margin:0;font-size:13px">As contas voltam a ser clientes normais, cada uma com o valor do plano que tinha antes de agrupar. A linha do grupo é apagada.</p>
<div class="imp">${contas.map(c=>`<div class="imp-row"><span class="nm">${esc(c.cliente||'sem nome')}</span><span class="tag">${isNum(planoNoMes(c))?brl.format(planoNoMes(c)):'sem valor'}</span></div>`).join('')||'<div class="sub">Este grupo não tem contas.</div>'}</div>
${voltam.length?`<p class="sub" style="margin:0;font-size:12px">${voltam.length} adicional(is) voltam para a conta de origem.</p>`:''}
${soltos.length&&contas.length?`<div class="field"><label for="dgPara">${soltos.length} adicional(is) lançado(s) no grupo vão para</label><select id="dgPara">${contas.map(c=>`<option value="${esc(c.id)}">${esc(c.cliente||'sem nome')}</option>`).join('')}</select></div>`:''}`,
`<span></span><div style="display:flex;gap:8px"><button class="btn" id="dgCancel" type="button">Cancelar</button><button class="btn primary" id="dgSave" type="button">Desagrupar</button></div>`);
$('#dgCancel').onclick=closeDrawer;
$('#dgSave').onclick=async()=>{
const para=$('#dgPara')?.value||null;
const antes=[{id:g.id,antes:copia(g)},...contas.map(c=>({id:c.id,antes:copia(c)}))];
const novos=new Map(contas.map(c=>[c.id,(Array.isArray(c.adicionaisItens)?c.adicionaisItens:[]).slice()]));
itens.forEach(i=>{const d=dono(i);if(d)novos.get(d.id).push({...i,desc:String(i.desc).slice(d.cliente.length+2)});else if(para)novos.get(para).push({...i})});
$('#dgSave').disabled=true;
const ix=rows.indexOf(g); if(ix>=0) rows.splice(ix,1);
contas.forEach(c=>{c.grupoId=null;c.adicionaisItens=novos.get(c.id)});
closeDrawer(); render();
try{
await writeMany([...contas.map(c=>[c.id,{grupoId:null,adicionaisItens:novos.get(c.id)}]),[g.id,null,'delete']]);
oferecerDesfazer(`${g.cliente} desagrupado`,antes);
}catch(e){handleWriteErr(e)}
};
}
function openAcessos(){
const draw=lista=>{
shell('Acessos',`<p class="sub" style="margin:0;font-size:13px">A <strong>dona</strong> vê e edita tudo. A <strong>assistente</strong> vê e edita só os dados de cadastro, vê o Tipo e lança adicionais sem valor. Ela não vê valores, observações nem status do boleto.</p>
<div class="imp">${(lista||[]).map(u=>`<div class="imp-row"><span class="nm">${esc(u.usuario)}</span><span class="tag">${u.papel==='dona'?'dona':'assistente'}</span>${u.papel==='dona'?'':`<button class="btn danger" type="button" data-rmu="${esc(u.usuario)}" style="height:32px">Remover</button>`}</div>`).join('')||'<div class="sub">Carregando…</div>'}</div>
<div class="sec">Criar acesso ou trocar senha</div>
<div class="field"><label for="acU">Usuário</label><input id="acU" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="login"></div>
<div class="field"><label for="acP">Senha (mínimo 6 caracteres)</label><input id="acP" type="password" autocomplete="new-password"></div>
<div class="field"><label for="acP2">Confirmar senha</label><input id="acP2" type="password" autocomplete="new-password"></div>
<p class="sub" style="margin:0;font-size:12px">Usuário novo entra como assistente. Usar um usuário que já existe troca a senha dele e encerra as sessões abertas.</p>`,
`<span></span><div style="display:flex;gap:8px"><button class="btn" id="acClose" type="button">Fechar</button><button class="btn primary" id="acSave" type="button">Salvar acesso</button></div>`);
$('#acClose').onclick=closeDrawer;
$('#acSave').onclick=async()=>{
const u=$('#acU').value.trim(), p=$('#acP').value;
if(u.length<2){toast('Digite o usuário.');return}
if(p.length<6){toast('A senha precisa ter pelo menos 6 caracteres.');return}
if(p!==$('#acP2').value){toast('As duas senhas não são iguais.');return}
$('#acSave').disabled=true;
try{const l=await GA('salvarAcesso',u,p);toast('Acesso salvo');draw(l)}catch(e){$('#acSave').disabled=false;e.code?handleWriteErr(e):toast(e.message)}
};
document.querySelectorAll('[data-rmu]').forEach(b=>b.onclick=async()=>{
if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='Confirmar';b.classList.add('armed');setTimeout(()=>{if(b.isConnected){b.dataset.armed='';b.textContent='Remover';b.classList.remove('armed')}},4000);return}
try{const l=await GA('removerAcesso',b.dataset.rmu);toast('Acesso removido');draw(l)}catch(e){handleWriteErr(e)}
});
};
draw(null);
GA('listarAcessos').then(draw).catch(handleWriteErr);
}
function openClient(id){
const r=id?rows.find(x=>x.id===id):(filter==='esp'&&!ASSIST()?{tipo:'esporadico'}:{});
if(id&&!r) return;
SUGGEST.forEach(ensureDatalist);
if(!document.getElementById('dl-isento')){const d=document.createElement('datalist');d.id='dl-isento';d.innerHTML=`<option value="${ISENTO}">`;document.body.appendChild(d)}
const body=cols.filter(podeVer).filter(c=>!((id||r.tipo)&&naoSeAplica(c,r))).map(c=>{
if(c.type==='tipo'&&id&&ehGrupo(r)) return `<div class="field"><label>Grupo</label><div class="calcv">${contasDe(r).length} conta(s): ${esc(contasDe(r).map(x=>x.cliente).join(', ')||'nenhuma')}</div></div>`;
if(c.type==='tipo'&&id&&ehConta(r)) return `<div class="field"><label>Grupo</label><div class="calcv">Conta do grupo ${esc(grupoDe(r).cliente||'')}</div></div>`;
if(c.type==='tipo'&&ASSIST()) return `<div class="field"><label>${esc(c.label)}</label><div class="calcv">${esc(tipoLabel(r.tipo))}</div></div>`;
if(c.key==='valorMensal'&&id&&!ASSIST()){const v=planoNoMes(r);return `<div class="field${c.required&&isEmpty(v)?' miss':''}"><label>${esc(c.label)} · ${esc(mesLabel(refMes))}</label><div style="display:flex;gap:10px;align-items:center"><span class="calcv">${isNum(v)?brl.format(v):esc(v??'sem valor')}${permutaNoMes(r)>0?` + ${brl.format(permutaNoMes(r))} em permuta`:''}</span><button class="btn" type="button" id="goPlano">Mudar valor do plano</button></div></div>`}
if(c.key==='valorNF'&&id&&!ASSIST()){const nf=notaDoMes(r);return `<div class="field"><label>${esc(c.label)} · ${esc(mesLabel(refMes))}</label><div style="display:flex;gap:10px;align-items:center"><span class="calcv">${nf?`${brl.format(nf.bruto)}${nf.num?` · nº ${esc(nf.num)}`:''}${nf.iss>0?` · boleto ${brl.format(nf.liquido)}`:''}`:'Sem nota neste mês'}</span><button class="btn" type="button" id="goNota">${nf?'Trocar nota':'Anexar nota fiscal'}</button></div></div>`}
if(c.key==='contrato'){const l=lerJSON(r.contrato)||[];return id&&!ASSIST()?`<div class="field"><label>Contrato</label><div style="display:flex;gap:10px;align-items:center"><span class="calcv">${l.length?l.map(a=>esc(a.nome)).join(', '):'Nenhum'}</span><button class="btn" type="button" id="goContrato">Contratos</button></div></div>`:''}
if(c.key==='publicacoes') return `<div class="field"><label>${esc(c.label)}</label>${id?`<div style="display:flex;gap:10px;align-items:center"><span class="calcv">${esc(pubResumo(r)||'não definido')}</span><button class="btn" type="button" id="goPub">Editar publicações</button></div>`:'<div class="calcv">Defina depois de salvar o cliente.</div>'}</div>`;
if(c.items&&id){const v=CALC[c.key](r);return `<div class="field"><label>${esc(c.label)} · ${esc(mesLabel(refMes))}</label><div style="display:flex;gap:10px;align-items:center"><span class="calcv">${ASSIST()?(itemsOf(r).length?itemsOf(r).length+' item(ns)':'nenhum'):v==null?'nenhum':brl.format(v)}</span><button class="btn" type="button" id="goItems">Editar adicionais</button></div></div>`}
if(c.type==='calc'){const v=CALC[c.key](r);return `<div class="field"><label>${esc(c.label)}</label><div class="calcv">${v==null?'calculado automaticamente':brl.format(v)}</div></div>`}
if(c.type==='tipo') return `<div class="field"><label for="f-${c.key}">${esc(c.label)} <span class="hint" style="color:var(--muted)">parceria, permuta, filantropia e pago por outro não têm cobrança</span></label><select id="f-${c.key}" name="${c.key}">${tipoOpts(r[c.key])}</select></div>`;
if(c.type==='simnao') return `<div class="field${ehSim(r[c.key])?' okv':''}"><label for="f-${c.key}">${esc(c.label)}</label><select id="f-${c.key}" name="${c.key}">${simNaoOpts(r[c.key])}</select></div>`;
if(c.type==='ok'){const ok=id?okDe(c,r):false;return `<div class="field${ok?' okv':(id?' miss':'')}"><label for="f-${c.key}">${esc(c.label)}</label><select id="f-${c.key}" name="${c.key}">${okOpts(ok)}</select></div>`}
const v=r[c.key]; const val=isEmpty(v)?'':(c.type==='money'&&isNum(v)?String(v).replace('.',','):String(v));
const miss=c.required&&isEmpty(v)&&id;
const list=SUGGEST.includes(c.key)?` list="dl-${c.key}"`:(c.key==='cliente'||c.type==='long'?'':' list="dl-isento"');
const input=c.type==='long'?`<textarea id="f-${c.key}" name="${c.key}">${esc(val)}</textarea>`
:`<input id="f-${c.key}" name="${c.key}" value="${esc(val)}"${c.key==='valorNF'?'':list}${c.type==='money'?` inputmode="decimal" placeholder="${c.key==='valorNF'?'Não (sem nota)':'0,00'}"`:''}${ASSIST()&&(id||c.key!=='cliente')?' disabled':''}>`;
return `<div class="field${miss?' miss':''}"><label for="f-${c.key}">${esc(c.label)}${c.required?'<span class="req" style="color:var(--warn)">•</span>':''}${miss?'<span class="hint">falta preencher</span>':''}</label>${input}</div>`;
}).join('');
const foot=(id&&!ehGrupo(r)?`<button class="btn danger" id="delBtn" type="button">Excluir cliente</button>`:'<span></span>')+`<div style="display:flex;gap:8px"><button class="btn" id="cancelBtn" type="button">Cancelar</button><button class="btn primary" id="saveBtn" type="button">${id?'Salvar alterações':'Adicionar cliente'}</button></div>`;
shell(id?(r.cliente||'Cliente'):(r.tipo==='esporadico'?'Novo cliente esporádico':'Novo cliente'),body,foot);
$('#cancelBtn').onclick=closeDrawer;
if($('#goItems')) $('#goItems').onclick=()=>openItems(id);
if($('#goPub')) $('#goPub').onclick=()=>openPub(id);
if($('#goPlano')) $('#goPlano').onclick=()=>abrirPlano(id);
if($('#goContrato')) $('#goContrato').onclick=()=>abrirContrato(id);
if($('#goNota')) $('#goNota').onclick=()=>escolherNota(id,()=>openClient(id));
if(ASSIST()&&id){$('#saveBtn').hidden=true;$('#cancelBtn').textContent='Fechar'}
$('#f-cliente')?.focus();
$('#saveBtn').onclick=async()=>{
if(!canWrite){toast('Você só tem acesso de leitura.');return}
const data={};
for(const c of cols){if(c.type==='calc'||!podeVer(c)||(c.type==='tipo'&&ASSIST())||(ASSIST()&&c.key!=='cliente'))continue;const el=document.getElementById('f-'+c.key);if(!el)continue;
if(c.key==='status'){Object.assign(data,novoStatus(r,!!el.value));continue} // OK só no mês da tela
if(c.type==='ok'||c.type==='tipo'||c.type==='simnao'){data[c.key]=el.value||null;continue}
const v=toValue(c,el.value); if(v&&v.err){toast(typeof v.err==='string'?`${c.label}: ${v.err}`:`${c.label}: valor inválido. Use algo como 1.380,00.`);el.focus();return} data[c.key]=v}
if(isEmpty(data.cliente)){toast('Dê um nome ao cliente.');$('#f-cliente').focus();return}
$('#saveBtn').disabled=true;
try{
if(id){const antes=copia(r);await writeDoc(id,data,'update');oferecerDesfazer('Alterações salvas',[{id,antes}])}
else{const nid=db.collection('clientes').doc().id;await writeDoc(nid,data,'set');oferecerDesfazer('Cliente adicionado',[{id:nid,antes:null}])}
closeDrawer();
}catch(e){$('#saveBtn').disabled=false;handleWriteErr(e)}
};
const del=$('#delBtn');
if(del){let armed=false;del.onclick=async()=>{
if(!armed){armed=true;del.classList.add('armed');del.textContent='Clique de novo para excluir';setTimeout(()=>{if(del.isConnected){armed=false;del.classList.remove('armed');del.textContent='Excluir cliente'}},4000);return}
const antes=copia(r);
try{await writeDoc(id,null,'delete');oferecerDesfazer('Cliente excluído',[{id,antes}]);closeDrawer()}catch(e){handleWriteErr(e)}
}}
}
function openCols(){
const draw=()=>{
const body=cols.map((c,i)=>`<div class="colrow" data-i="${i}">
<div class="mv"><button class="mini" data-a="up" ${i<=2?'disabled':''} aria-label="Subir ${esc(c.label)}">↑</button><button class="mini" data-a="down" ${i<=1||i===cols.length-1?'disabled':''} aria-label="Descer ${esc(c.label)}">↓</button></div>
<div class="nm">${esc(c.label)}${c.type==='calc'?' <span style="color:var(--muted);font-weight:400;font-size:12px">(cálculo)</span>':''}</div>
<label class="tog"><input type="checkbox" data-a="vis" ${c.visible?'checked':''} ${c.locked?'disabled':''}>Mostrar</label>
<label class="tog"><input type="checkbox" data-a="req" ${c.required?'checked':''} ${c.locked||c.type==='calc'?'disabled':''}>Obrigatório</label>
${c.custom?`<button class="mini" data-a="rm" aria-label="Remover coluna ${esc(c.label)}" title="Remover coluna">×</button>`:'<span style="width:28px"></span>'}
</div>`).join('')+`<div class="addcol"><input id="newColName" placeholder="Nova coluna (ex.: Responsável)" aria-label="Nome da nova coluna"><select id="newColType" aria-label="Tipo"><option value="text">Texto</option><option value="money">Valor (R$)</option><option value="long">Texto longo</option></select><button class="btn" id="addColBtn" type="button">Adicionar</button></div>`;
shell('Colunas',`<div style="font-size:13px;color:var(--muted)">Mude a ordem, esconda o que não usa e marque o que é obrigatório. Campo obrigatório vazio vira alerta vermelho na tabela.</div>${body}`,`<span></span><button class="btn primary" id="okCols" type="button">Pronto</button>`);
$('#okCols').onclick=closeDrawer;
document.querySelectorAll('.colrow').forEach(row=>{
const i=+row.dataset.i;
row.querySelectorAll('[data-a]').forEach(el=>{
const a=el.dataset.a;
const h=()=>{
if(a==='up'&&i>2){[cols[i-1],cols[i]]=[cols[i],cols[i-1]]}
else if(a==='down'&&i>1&&i<cols.length-1){[cols[i+1],cols[i]]=[cols[i],cols[i+1]]}
else if(a==='vis'){cols[i].visible=el.checked}
else if(a==='req'){cols[i].required=el.checked}
else if(a==='rm'){cols.splice(i,1)}
saveCols(); pendingRender=true; draw();
};
el.addEventListener(el.type==='checkbox'?'change':'click',h);
});
});
$('#addColBtn').onclick=()=>{
const name=$('#newColName').value.trim(); if(!name){$('#newColName').focus();return}
const key='x_'+name.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,30)+'_'+Date.now().toString(36).slice(-4);
cols.push({key,label:name,type:$('#newColType').value,visible:true,required:false,custom:true});
saveCols(); pendingRender=true; draw(); toast('Coluna adicionada');
};
};
draw();
}
