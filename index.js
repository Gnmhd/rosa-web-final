const express = require('express');
const app = express();
const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const P = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

app.use(express.json());
const sessions = {};

const HOME = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ROSA-MD</title><style>body{margin:0;min-height:100vh;background:#050505;display:flex;align-items:center;justify-content:center;font-family:Arial}.card{background:#121212;border:1px solid #2a2a2a;border-radius:24px;padding:32px 24px;width:90%;max-width:360px;text-align:center}h1{color:#d4af37;letter-spacing:2px;margin:0;font-size:32px;font-weight:900}.sub{color:#888;letter-spacing:4px;margin:12px 0 28px;font-size:13px}.btn{display:block;width:100%;padding:16px;border-radius:14px;margin:12px 0;font-weight:800;font-size:14px;text-decoration:none}.gold{background:linear-gradient(135deg,#d4af37,#f5d76e);color:#000}.dark{background:#1e1e1e;color:#d4af37;border:1px solid #333}.foot{color:#d4af37;margin-top:28px;font-weight:800;letter-spacing:3px}</style></head><body><div class="card"><h1>ROSA-MD</h1><div class="sub">GÉNÉRER UNE SESSION</div><a class="btn gold" href="/qr">QR CODE SCAN</a><a class="btn dark" href="/pair">PAIRING CODE</a><a class="btn dark" href="/env">GÉNÉRATEUR.ENV</a><div class="foot">ROSA</div></div></body></html>`;

app.get('/', (req,res)=>res.send(HOME));

app.get('/env',(req,res)=>res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>GEN.ENV ROSA XX</title><style>body{background:#050505;color:#fff;font-family:monospace;padding:15px}.box{max-width:500px;margin:auto;background:#121212;padding:20px;border-radius:16px;border:1px solid #2a2a2a} h2{color:#d4af37;text-align:center} label{color:#888;font-size:12px;margin-top:10px;display:block} input,textarea,select{width:100%;padding:12px;margin:6px 0 12px;border-radius:8px;background:#1e1e1e;color:#fff;border:1px solid #333;box-sizing:border-box} button{background:linear-gradient(135deg,#d4af37,#f5d76e);padding:14px;width:100%;border:0;border-radius:10px;font-weight:900;color:#000;margin-top:10px} #out{height:380px;font-size:11px;line-height:14px}.copy{margin-top:10px;background:#1e1e1e;color:#d4af37;border:1px solid #d4af37}</style></head><body><div class="box"><h2>ROSA XX - GÉNÉRATEUR.ENV</h2>
<label>SESSION_ID (colle ton eyJ...)</label><textarea id="sess" rows="3" placeholder="eyJ..."></textarea>
<label>NUMERO_OWNER</label><input id="numero" value="22896352213">
<label>NOM_OWNER</label><input id="nomowner" value="MOMO XX">
<label>NOM_BOT</label><input id="nombot" value="ROSA XX">
<label>PREFIX</label><input id="prefix" value="🎃">
<label>MODE (private/public)</label><select id="mode"><option>private</option><option>public</option></select>
<label>ZONE_DE_TEMPS</label><input id="zone" value="Africa/Lomé">
<label>LECTURE_AUTO_STATUS</label><select id="lecture"><option>oui</option><option>non</option></select>
<label>AUTO_LIKE_STATUS</label><select id="autolike"><option>non</option><option>oui</option></select>
<label>LIKE_STATUS_EMOJIS</label><input id="emojis" value="💚,❤️,✨,🔥,🙌">
<label>STICKER_PACKNAME</label><input id="pack" value="🎃">
<label>STICKER_AUTHOR</label><input id="author" value="MOMO XX">
<button onclick="generer()">GÉNÉRER.ENV</button>
<textarea id="out" readonly></textarea>
<button class="copy" onclick="navigator.clipboard.writeText(document.getElementById('out').value);alert('Copié!')">COPIER.ENV</button>
<br><br><a href="/" style="color:#d4af37;text-decoration:none"><- Retour</a>
</div><script>
function generer(){
 const sess=document.getElementById('sess').value.trim();
 const num=document.getElementById('numero').value.trim();
 const nomowner=document.getElementById('nomowner').value.trim();
 const nombot=document.getElementById('nombot').value.trim();
 const pref=document.getElementById('prefix').value.trim();
 const mode=document.getElementById('mode').value;
 const zone=document.getElementById('zone').value;
 const lec=document.getElementById('lecture').value;
 const like=document.getElementById('autolike').value;
 const em=document.getElementById('emojis').value;
 const pack=document.getElementById('pack').value;
 const auth=document.getElementById('author').value;
 const txt = \`# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 𝙼𝙴𝙽𝙼𝙰-𝙼𝙳 CONFIGURATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SESSION_ID=\${sess}
NUMERO_OWNER="\${num}"
NOM_OWNER="\${nomowner}"

# ─── CONFIG BOT ───
NOM_BOT=\${nombot}
PREFIX="\${pref}"
MODE="\${mode}"
ZONE_DE_TEMPS="\${zone}"

# ─── STATUTS & INTERACTIONS ───
LECTURE_AUTO_STATUS="\${lec}"
AUTO_LIKE_STATUS="\${like}"
LIKE_STATUS_EMOJIS="\${em}"

# ─── STICKERS ───
STICKER_PACKNAME="\${pack}"
STICKER_AUTHOR="\${auth}"
\`;
 document.getElementById('out').value=txt;
}
</script></body></html>`));

async function createSession(id, num=null){
 const dir='./temp/'+id; if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
 const { state, saveCreds } = await useMultiFileAuthState(dir);
 const sock = makeWASocket({auth:state, logger:P({level:'silent'}), browser:["ROSA","Chrome","1.0"]});
 sessions[id]={qr:null,code:null,sessionId:null,status:'init'};
 sock.ev.on('creds.update', saveCreds);
 sock.ev.on('connection.update', async (u)=>{
  if(u.qr){sessions[id].qr=u.qr; sessions[id].status='qr';}
  if(u.connection==='open'){
   await delay(2000);
   const creds=fs.readFileSync(path.join(dir,'creds.json'));
   sessions[id].sessionId=Buffer.from(creds).toString('base64');
   sessions[id].status='connected';
  }
 });
 if(num){ await delay(3000); try{ const c=await sock.requestPairingCode(num); sessions[id].code=c; sessions[id].status='code'; }catch(e){ sessions[id].status=e.message; } }
}
app.get('/qr', async (req,res)=>{
 const id=Date.now().toString(); await createSession(id);
 res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><style>body{background:#050505;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:Arial}.card{background:#121212;padding:20px;border-radius:16px;text-align:center;width:90%;max-width:350px}#qr{background:#fff;padding:10px;border-radius:10px}</style></head><body><div class="card"><h2 style="color:#d4af37">SCAN QR</h2><div id="qr">Chargement...</div><div id="st"></div><div id="sess" style="word-break:break-all;background:#1e1e1e;padding:10px;font-size:9px;margin-top:10px;color:#d4af37;display:none"></div><a href="/" style="color:#d4af37"><- Retour</a></div><script>const id="${id}";async function poll(){const r=await fetch('/qr-data/'+id);const j=await r.json();document.getElementById('st').innerText=j.status;if(j.qrImg)document.getElementById('qr').innerHTML='<img src="'+j.qrImg+'" width="240">';if(j.sessionId){document.getElementById('sess').style.display='block';document.getElementById('sess').innerText=j.sessionId;}}setInterval(poll,2000);</script></body></html>`);
});
app.get('/qr-data/:id', async (req,res)=>{
 const s=sessions[req.params.id]; if(!s) return res.json({status:'no'});
 let img=null; if(s.qr) img=await QRCode.toDataURL(s.qr);
 res.json({status:s.status,qrImg:img,sessionId:s.sessionId});
});
app.get('/pair',(req,res)=>res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><style>body{background:#050505;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:Arial}.card{background:#121212;padding:20px;border-radius:16px;text-align:center;width:90%;max-width:350px}input{width:90%;padding:12px;border-radius:8px;background:#1e1e1e;color:#fff;border:1px solid #333}button{background:#d4af37;padding:12px;width:100%;border:0;border-radius:8px;font-weight:800;margin-top:10px}</style></head><body><div class="card"><h2 style="color:#d4af37">PAIRING CODE</h2><input id="num" placeholder="22896352213"><button onclick="go()">OBTENIR CODE</button><h1 id="code" style="letter-spacing:5px"></h1><div id="sess" style="word-break:break-all;background:#1e1e1e;padding:10px;font-size:9px;display:none;color:#d4af37"></div><div id="st"></div><a href="/" style="color:#d4af37"><- Retour</a></div><script>let gid=null;async function go(){const n=document.getElementById('num').value;const r=await fetch('/pair-start?number='+n);const j=await r.json();gid=j.id;setInterval(poll,2000)}async function poll(){if(!gid)return;const r=await fetch('/pair-data/'+gid);const j=await r.json();if(j.code)document.getElementById('code').innerText=j.code;document.getElementById('st').innerText=j.status;if(j.sessionId){document.getElementById('sess').style.display='block';document.getElementById('sess').innerText=j.sessionId}}</script></body></html>`));
app.get('/pair-start', async (req,res)=>{ const num=(req.query.number||'').replace(/[^0-9]/g,''); const id=Date.now().toString(); await createSession(id,num); res.json({id}); });
app.get('/pair-data/:id',(req,res)=>{ const s=sessions[req.params.id]; if(!s) return res.json({status:'no'}); res.json(s); });
app.listen(process.env.PORT||3000, ()=>console.log('ROSA WEB OK'));
