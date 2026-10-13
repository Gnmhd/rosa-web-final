import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys'
import express from 'express'
import pino from 'pino'
import QRCode from 'qrcode'
import fs from 'fs'

const app = express()
const PORT = process.env.PORT || 10000
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

let sock
let qrData = ''
let pairingCodeData = ''

async function startSock() {
    const { version } = await fetchLatestBaileysVersion()
    console.log('WA Version:', version)
    const { state, saveCreds } = await useMultiFileAuthState('./auth')

    sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['ROSA-MD', 'Chrome', '120.0.0']
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            qrData = await QRCode.toDataURL(qr)
            console.log('QR generated')
        }
        if (connection === 'open') {
            console.log('Connected!')
            const creds = fs.readFileSync('./auth/creds.json', 'utf8')
            const sessionId = 'ROSA-MD;;;' + Buffer.from(creds).toString('base64')
            console.log('SESSION:', sessionId)
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) startSock()
        }
    })
}

startSock()

app.get('/', (req, res) => {
    res.send(`
    <html><head><meta name="viewport" content="width=device-width"><style>
    body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
   .card{background:#1a1a1a;padding:30px;border-radius:15px;text-align:center;max-width:400px;width:90%;border:1px solid #333}
    h1{color:#ffcc00}
    input{width:90%;padding:12px;border-radius:8px;border:1px solid #333;background:#000;color:#fff;margin:10px 0}
    button{background:#ffcc00;color:#000;border:none;padding:12px 20px;border-radius:8px;font-weight:bold;width:95%;cursor:pointer;margin:5px 0}
   .qr{margin:15px auto;background:#fff;padding:10px;border-radius:10px;max-width:250px}
    img{width:100%}
    </style></head><body><div class="card">
    <h1>ROSA-MD</h1>
    <p>GÉNÉRER UNE SESSION</p>
    <a href="/qr"><button>QR CODE SCAN</button></a>
    <a href="/pair"><button>PAIRING CODE</button></a>
    <a href="/env"><button style="background:#222;color:#ffcc00;border:1px solid #ffcc00">GÉNÉRATEUR.ENV</button></a>
    </div></body></html>`)
})

app.get('/qr', (req, res) => {
    res.send(`<html><body style="background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif"><div style="text-align:center">
    <h2 style="color:#ffcc00">QR CODE</h2>
    <div style="background:#fff;padding:15px;border-radius:10px;max-width:300px;margin:auto">${qrData? `<img src="${qrData}" style="width:100%">` : '<p style="color:#000">Génération... rafraichis dans 5s</p>'}</div>
    <p>Scanne avec WhatsApp > Appareils liés</p>
    <a href="/" style="color:#ffcc00">Retour</a>
    <script>setTimeout(()=>location.reload(),5000)</script>
    </div></body></html>`)
})

app.get('/pair', (req, res) => {
    res.send(`<html><body style="background:#000;color:#ffcc00;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif"><div style="background:#111;padding:30px;border-radius:15px;text-align:center;max-width:400px;width:90%">
    <h2>PAIRING CODE</h2>
    <form action="/getcode" method="post">
    <input name="number" placeholder="22896352213" value="22896352213" style="width:90%;padding:12px;border-radius:8px;background:#000;color:#fff;border:1px solid #333">
    <button type="submit" style="background:#ffcc00;color:#000;padding:12px;width:95%;border-radius:8px;font-weight:bold;border:none;margin-top:10px">OBTENIR CODE</button>
    </form>
    ${pairingCodeData? `<h1 style="font-size:40px;letter-spacing:5px;margin-top:20px">${pairingCodeData}</h1><p style="color:#fff">Entre ce code dans WhatsApp > Lier avec numéro</p>` : ''}
    <br><a href="/" style="color:#ffcc00"><- Retour</a></div></body></html>`)
})

app.post('/getcode', async (req, res) => {
    try {
        const number = req.body.number.replace(/[^0-9]/g, '')
        if (!sock) return res.send('Socket pas prêt, rafraichis')
        const code = await sock.requestPairingCode(number)
        pairingCodeData = code
        console.log('Pairing code:', code, 'for', number)
        res.redirect('/pair')
    } catch (e) {
        console.log('Pairing error', e)
        res.send('Erreur pairing: ' + e.message + '<br><a href="/pair">Retour</a>')
    }
})

app.get('/env', (req, res) => {
    res.send('Générateur.env - connecte-toi d\'abord')
})

app.listen(PORT, () => console.log('Server on ' + PORT))
