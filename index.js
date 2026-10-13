import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys'
import express from 'express'
import pino from 'pino'
import fs from 'fs'
import { analyzeMatch } from './predict.js'

const app = express()
const PORT = process.env.PORT || 10000

// TON NUMÉRO WHATSAPP ICI (avec indicatif, ex: 228 pour Togo)
const PHONE_NUMBER = "2289XXXXXXXX" // <-- METS TON NUMÉRO ICI

async function startSock() {
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: ["ROSA-BET", "Chrome", "1.0"]
  })

  sock.ev.on('creds.update', saveCreds)

  // SI PAS CONNECTÉ, DEMANDE CODE
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER)
        console.log(`\n\n👑 TON CODE PAIRING: ${code}\n\n`)
      } catch(e) { console.log("Erreur code:", e) }
    }, 3000)
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startSock()
    } else if (connection === 'open') {
      console.log('✅ ROSA-BET Connecté!')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    const from = m.key.remoteJid
    const text = m.message.conversation || m.message.extendedTextMessage?.text || ""
    if (text.toLowerCase().includes("analyse") || text.toLowerCase().includes("prono")) {
      const result = analyzeMatch([4.3, 1.9, 2.9, 1.8, 13])
      await sock.sendMessage(from, { text: `🧠 *ROSA-BET AI*\n📊 ${result.resultat}\n🔥 ${result.confiance}\n${result.piege}` })
    }
  })
}

startSock()
app.get('/', (req,res) => res.send('<h1>ROSA-BET - Regarde les logs Render pour ton CODE</h1>'))
app.listen(PORT, () => console.log(`Serveur ${PORT}`))
