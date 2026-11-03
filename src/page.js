// Página de configuração do Assistente (abre em http://localhost:3777).
export const VERSAO = "2.0.1";

export function paginaInicial(token) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Brim3D Desktop</title>
<style>
:root{--p:#0b6fa4;--bg:#f4f7fb;--card:#fff;--b:#dbe3ee;--t:#0f172a;--m:#64748b;--ok:#059669;--er:#dc2626;--wa:#d97706}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--t)}
.wrap{max-width:760px;margin:0 auto;padding:24px 16px 60px}
h1{font-size:22px;margin:0 0 4px}p.sub{color:var(--m);margin:0 0 20px}
.card{background:var(--card);border:1px solid var(--b);border-radius:14px;padding:18px;margin-bottom:14px}
.card h2{font-size:15px;margin:0 0 10px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
.ok{background:#d1fae5;color:#065f46}.er{background:#fee2e2;color:#991b1b}.wa{background:#fef3c7;color:#92400e}
label{display:block;font-size:13px;color:var(--m);margin:10px 0 4px}
input[type=password],input[type=text],input[type=file]{width:100%;padding:10px;border:1px solid var(--b);border-radius:8px;font-size:15px;background:#fff}
button{background:var(--p);color:#fff;border:0;border-radius:8px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer}
button.sec{background:#e2e8f0;color:var(--t)}button:disabled{opacity:.5;cursor:default}
.code{font-family:ui-monospace,Consolas,monospace;font-size:26px;letter-spacing:3px;font-weight:700;color:var(--p)}
.msg{margin-top:10px;font-size:14px}.msg.er{color:var(--er);background:none}.msg.ok{color:var(--ok);background:none}
small{color:var(--m)}ul{margin:6px 0 0 18px;padding:0;color:var(--m);font-size:14px}
</style></head><body><div class="wrap">
<h1>Brim3D Desktop</h1><p class="sub">Monitora as impressoras da sua farm e emite a nota fiscal com o certificado deste computador. Deixe esta janela aberta.</p>

<div class="card"><h2>Monitor da Farm</h2>
<div id="monStatus" class="row"><span class="badge wa">Carregando…</span></div>
<div id="monPar" style="display:none"><label>Código de pareamento (no sistema: Configurações › Brim3D Desktop)</label>
<div class="row"><input type="text" id="monCod" placeholder="Cole aqui o código" autocomplete="off" style="flex:1"><button onclick="salvarCodigo()">Parear</button></div></div>
<div id="monLista" style="margin-top:12px"></div>
<div id="monAcoes" class="row" style="margin-top:10px;display:none"><button class="sec" onclick="procurar()">Procurar impressoras na rede</button><small id="monBusca"></small></div>
<div id="monMsg" class="msg"></div></div>

<div id="fiscalAviso" class="card" style="display:none"><h2>Assistente Fiscal</h2><p style="margin:0;color:var(--m);font-size:14px">O plano da sua conta não inclui a emissão de NF-e. Faça o upgrade no sistema (menu Plano) para liberar.</p></div>
<div id="fiscalCards">
<div class="card"><h2>1. Código de conexão do Assistente Fiscal</h2>
<p style="margin:0 0 8px;color:var(--m);font-size:14px">Cole este código no sistema (Fiscal › Configurações) uma única vez, para ele reconhecer este computador.</p>
<div class="row"><span class="code" id="tok">${token}</span><button class="sec" onclick="navigator.clipboard.writeText(document.getElementById('tok').textContent);this.textContent='Copiado!'">Copiar</button></div></div>

<div class="card"><h2>2. Certificado digital A1</h2>
<div id="certStatus" class="row"><span class="badge wa">Verificando…</span></div>
<div id="certForm">
<label>Arquivo do certificado (.pfx ou .p12)</label><input type="file" id="pfx" accept=".pfx,.p12">
<label>Senha do certificado</label><input type="password" id="senha" autocomplete="off">
<label style="display:flex;gap:8px;align-items:center;color:var(--t)"><input type="checkbox" id="lembrar" checked> Lembrar a senha neste computador (cifrada)</label>
<div style="margin-top:12px" class="row"><button id="btnCert" onclick="enviarCert()">Salvar certificado</button><button class="sec" id="btnRem" onclick="removerCert()" style="display:none">Remover</button></div>
</div><div id="certMsg" class="msg"></div></div>

<div class="card"><h2>3. Ambiente de produção (nota com valor fiscal)</h2>
<p style="margin:0 0 10px;color:var(--m);font-size:14px">Enquanto estiver desligado, só é possível emitir em <b>homologação</b> (teste, sem valor fiscal). Ligue só depois de testar tudo.</p>
<label style="display:flex;gap:8px;align-items:center;color:var(--t)"><input type="checkbox" id="prod" onchange="salvarProd()"> Liberar emissão real (produção)</label></div>

<div class="card"><h2>4. Testar conexão com a SEFAZ-SP</h2>
<div class="row"><button class="sec" onclick="testar('homologacao')">Testar homologação</button><button class="sec" onclick="testar('producao')">Testar produção</button></div>
<div id="testMsg" class="msg"></div></div>

</div>
<p><small>Versão ${VERSAO}. As notas emitidas ficam copiadas aqui no computador (pasta do Assistente). O certificado nunca sai deste computador.</small></p>
</div>
<script>
const T=${JSON.stringify(token)};
const H={'Content-Type':'application/json','X-Fiscal-Token':T};
async function api(p,b){const r=await fetch(p,{method:b?'POST':'GET',headers:H,body:b?JSON.stringify(b):undefined});return r.json();}
function set(id,html,cls){const e=document.getElementById(id);e.innerHTML=html;if(cls!==undefined)e.className='msg '+cls;}
async function carregar(){
 const s=await api('/status');const c=s.certificado||{};
 let h;
 if(c.carregado){h='<span class="badge ok">Certificado ativo</span> <span>'+(c.nome||'')+' · CNPJ '+(c.cnpj||'')+'</span><small>Vence em '+(c.validade||'').slice(0,10)+' ('+c.diasParaVencer+' dias)</small>';document.getElementById('btnRem').style.display='';}
 else if(c.salvo){h='<span class="badge wa">Certificado salvo, falta a senha</span>';}
 else{h='<span class="badge er">Nenhum certificado</span>';}
 document.getElementById('certStatus').innerHTML=h;
 document.getElementById('prod').checked=!!s.producaoLiberada;
 document.getElementById('certForm').querySelector('input[type=file]').style.display=c.salvo&&!c.carregado?'none':'';
}
function lerArquivo(f){return new Promise((ok,er)=>{const r=new FileReader();r.onload=()=>ok(r.result.split(',')[1]);r.onerror=er;r.readAsDataURL(f);});}
async function enviarCert(){
 const f=document.getElementById('pfx').files[0],senha=document.getElementById('senha').value,lembrar=document.getElementById('lembrar').checked;
 if(!senha){set('certMsg','Digite a senha do certificado.','er');return;}
 const body={senha,lembrar};
 if(f)body.pfxBase64=await lerArquivo(f);
 const r=await api('/certificado',body);
 if(r.ok){set('certMsg','Certificado carregado com sucesso.','ok');document.getElementById('senha').value='';}else set('certMsg',r.erro||'Erro','er');
 carregar();
}
async function removerCert(){if(!confirm('Remover o certificado deste computador?'))return;await api('/certificado/remover',{});set('certMsg','Certificado removido.','ok');carregar();}
async function salvarProd(){const v=document.getElementById('prod').checked;if(v&&!confirm('Liberar a emissão de notas com valor fiscal?')){document.getElementById('prod').checked=false;return;}await api('/config',{producaoLiberada:v});}
async function testar(a){set('testMsg','Conectando…','');const r=await api('/sefaz/status',{ambiente:a});set('testMsg',r.ok?('SEFAZ respondeu: '+r.xMotivo+(r.online?' ✔':'')):('Falhou: '+(r.erro||'sem resposta')),r.ok&&r.online?'ok':'er');}
carregar();

const TIPO={bambu_lan:'Bambu LAN',bambu_nuvem:'Bambu nuvem',moonraker:'Klipper',elegoo_sdcp:'Elegoo',octoprint:'OctoPrint',snapmaker2:'Snapmaker 2.0'};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function carregarMonitor(){
 let m;try{m=await api('/monitor/status');}catch{return;}
 const st=document.getElementById('monStatus');let h;
 if(!m.temCodigo){h='<span class="badge wa">Não pareado</span>';}
 else if(m.erro&&!m.pareado){h='<span class="badge er">'+esc(m.erro)+'</span>';}
 else if(!m.pareado){h='<span class="badge wa">Conectando…</span>';}
 else if(m.plano&&!m.plano.monitor){h='<span class="badge wa">Pareado</span> <span>O plano da sua conta não inclui o Monitor.</span>';}
 else{h='<span class="badge ok">Pareado</span> <span>'+esc(m.email||'')+'</span>'+(m.ultimoEnvio?'<small>Último envio: '+new Date(m.ultimoEnvio).toLocaleTimeString('pt-BR')+'</small>':'')+(m.erro?' <span class="badge er">'+esc(m.erro)+'</span>':'');}
 st.innerHTML=h;
 document.getElementById('monPar').style.display=(!m.temCodigo||(m.erro&&!m.pareado))?'':'none';
 const ok=m.temCodigo&&m.pareado&&m.plano&&m.plano.monitor;
 document.getElementById('monAcoes').style.display=ok?'':'none';
 document.getElementById('monBusca').textContent=m.procurando?'Procurando…':(m.ultimaBusca?'Última busca: '+m.descobertas+' encontrada(s)':'');
 const fiscalOk=!(m.temCodigo&&m.plano&&!m.plano.fiscal);
 document.getElementById('fiscalCards').style.display=fiscalOk?'':'none';
 document.getElementById('fiscalAviso').style.display=fiscalOk?'none':'';
 let l='';
 if(ok&&(m.impressoras||[]).length===0)l='<small>Nenhuma impressora com tipo de conexão cadastrada. No sistema, abra Impressoras e informe como cada uma se conecta (ou adicione as que forem encontradas na rede).</small>';
 else if(ok){l='<table style="width:100%;border-collapse:collapse;font-size:14px">'+m.impressoras.map(i=>{
  const cor=i.status==='imprimindo'?'ok':(i.status==='erro'||i.status==='offline'?'er':'wa');
  let extra='';
  if(i.precisaCodigo||(i.tipo.indexOf('bambu')===0&&i.erro&&/acesso/i.test(i.erro))) extra='<div class="row" style="margin-top:6px"><input type="password" placeholder="Código de acesso da impressora" id="ac_'+esc(i.serial)+'" style="flex:1" autocomplete="off"><button class="sec" data-s="'+esc(i.serial)+'" onclick="salvarAcesso(this.dataset.s)">Salvar</button></div><small>Está na tela da impressora (Configurações › Rede). Fica só neste computador.</small>';
  else if(i.erro) extra='<small>'+esc(i.erro)+'</small>';
  return '<tr style="border-top:1px solid var(--b)"><td style="padding:8px 4px"><b>'+esc(i.nome)+'</b><br><small>'+esc(TIPO[i.tipo]||i.tipo)+(i.ip?' · '+esc(i.ip):'')+'</small>'+extra+'</td><td style="text-align:right;white-space:nowrap"><span class="badge '+cor+'">'+esc(i.status)+(i.status==='imprimindo'?' '+i.progresso+'%':'')+'</span></td></tr>';}).join('')+'</table>';}
 const foco=document.activeElement&&document.activeElement.tagName==='INPUT'&&document.getElementById('monLista').contains(document.activeElement);
 if(!foco)document.getElementById('monLista').innerHTML=l;
}
async function salvarCodigo(){const c=document.getElementById('monCod').value.trim();if(!c){set('monMsg','Cole o código de pareamento.','er');return;}await api('/monitor/config',{codigo:c});set('monMsg','Código salvo. Conectando…','ok');setTimeout(carregarMonitor,1500);}
async function salvarAcesso(serial){const v=document.getElementById('ac_'+serial).value.trim();if(!v)return;await api('/monitor/acesso',{serial,codigo:v});set('monMsg','Código de acesso salvo.','ok');setTimeout(carregarMonitor,2500);}
async function procurar(){await api('/monitor/procurar',{});set('monMsg','Procurando impressoras na rede… elas aparecem no sistema em Impressoras.','ok');setTimeout(carregarMonitor,1000);}
carregarMonitor();setInterval(carregarMonitor,5000);
</script></body></html>`;
}
