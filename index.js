import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys'
import express from 'express'
import pino from 'pino'
import fs from 'fs'
import { analyzeMatch } from './predict.js'

const app = express()
const PORT = process.env.PORT || 10000
const PHONE_NUMBER = "22896352213"

async function startSock() {
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: true,
    browser: ["ROSA-BET", "Chrome", "1.0"]
  })

  sock.ev.on('creds.update', saveCreds)

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER)
        console.log(`\n\n==============================`)
        console.log(`👑 TON CODE PAIRING: ${code}`)
        console.log(`==============================\n\n`)
      } catch(e) { 
        console.log("Erreur code:", e.message) 
      }
    }, 5000)
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Connection closed, reconnect:', shouldReconnect)
      if (shouldReconnect) startSock()
    } else if (connection === 'open') {
      console.log('✅ ROSA-BET Connecté! IA Active')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = messages[0]
      if (!m.message || m.key.fromMe) return
      const from = m.key.remoteJid
      const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
      console.log("Message:", text)
      if (text.toLowerCase().includes("analyse") || text.toLowerCase().includes("prono") || text.toLowerCase() === "ping") {
        const result = analyzeMatch([4.3, 1.9, 2.9, 1.8, 13])
        const reply = `🧠 *ROSA-BET AI - Analyse ML*\n\n📊 Résultat: ${result.resultat}\n🔥 Confiance: ${result.confiance}\n${result.piege}\n\n_Tape 'analyse' pour re-tester_`
        await sock.sendMessage(from, { text: reply })
      }
    } catch(e) { console.log(e) }
  })
}

startSock()
app.get('/', (req,res) => res.send('<h1>ROSA-BET en ligne - Va voir les LOGS pour ton CODE</h1>'))
app.listen(PORT, () => console.log(`Serveur sur ${PORT}`))
