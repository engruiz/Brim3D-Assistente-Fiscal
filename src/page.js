// Página de configuração do Assistente (abre em http://localhost:3777).
export const VERSAO = "1.0.1";

export function paginaInicial(token) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Assistente Fiscal · Brim3D</title>
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
<h1>Assistente Fiscal</h1><p class="sub">Brim3D · emite a nota fiscal usando o certificado deste computador. Deixe esta janela aberta enquanto emitir notas.</p>

<div class="card"><h2>1. Código de conexão</h2>
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
</script></body></html>`;
}
