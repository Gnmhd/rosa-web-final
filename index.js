import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys'
import express from 'express'
import pino from 'pino'
import QRCode from 'qrcode'
import fs from 'fs'
import { analyzeMatch } from './predict.js'

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

  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      qrData = await QRCode.toDataURL(qr)
      console.log("QR généré")
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut
      console.log('Connection closed, reconnecting:', shouldReconnect)
      if (shouldReconnect) startSock()
    } else if (connection === 'open') {
      console.log('✅ ROSA-BET Connecté!')
      qrData = ''
    }
  })

  // ICI TON BOT + IA
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = messages[0]
      if (!m.message || m.key.fromMe) return

      const from = m.key.remoteJid
      const messageText = m.message.conversation || m.message.extendedTextMessage?.text || ""

      console.log("Message:", messageText)

      // COMMANDE IA ROSA-BET
      if (messageText.toLowerCase().includes("analyse") || messageText.toLowerCase().includes("prono")) {
        const stats = [4.3, 1.9, 2.9, 1.8, 13] // Exemple Man City vs Ipswich
        const result = analyzeMatch(stats)
        const reply = `🧠 *ROSA-BET AI - Analyse ML*\n\n📊 Résultat: ${result.resultat}\n🔥 Confiance: ${result.confiance}\n${result.piege}\n\n_Match analysé par Random Forest (100 arbres)_`
        await sock.sendMessage(from, { text: reply })
        return
      }

      if (messageText.toLowerCase() === "ping") {
        await sock.sendMessage(from, { text: "🏓 Pong! ROSA-BET est LIVE 👑" })
      }

    } catch (e) {
      console.log("Erreur message:", e)
    }
  })
}

startSock()

// Serveur web pour Render
app.get('/', (req, res) => {
  if (qrData) {
    res.send(`<img src="${qrData}" /><h1>Scanne ce QR avec WhatsApp</h1>`)
  } else {
    res.send('<h1>✅ ROSA-BET Bot est en ligne - IA Active</h1><p>Envoie "analyse" sur WhatsApp pour tester</p>')
  }
})

app.listen(PORT, () => console.log(`Serveur sur port ${PORT}`))
