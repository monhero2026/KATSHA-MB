const { default: makeWASocket, useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const express = require('express')
const pino = require('pino')
const app = express()
const PORT = process.env.PORT || 3000

// Dashboard KATSHA MB
app.get('/', (req, res) => {
  res.send(`
  <html>
  <head><title>KATSHA MB</title></head>
  <body style="background:#111;color:white;text-align:center;font-family:Arial;padding:40px">
  <h1>🚀 KATSHA MB - MD BOT</h1>
  <h2 style="color:#25D366">En Ligne ✅</h2>
  <p>Dashboard temps réel actif</p>
  <a href="/pair" style="background:#25D366;color:white;padding:15px 30px;text-decoration:none;border-radius:10px;font-weight:bold">LIRE QR / PAIR CODE</a>
  <br><br><p>Dev: KATSHA MB</p>
  </body></html>
  `)
})

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    browser: Browsers.macOS('Desktop')
  })

  // Pairing Code Route
  app.get('/pair', async (req, res) => {
    let number = req.query.number
    if (!number) return res.send('<h3>Utilise: /pair?number=2439XXXXXXXX</h3><p>Ex: /pair?number=243819000000</p>')
    number = number.replace(/[^0-9]/g, '')
    try {
      let code = await sock.requestPairingCode(number)
      res.send(`<h1>KATSHA MB PAIR CODE</h1><h2 style="letter-spacing:5px;background:#111;color:#25D366;padding:20px;font-size:30px">${code}</h2><p>Entre ce code dans WhatsApp > Appareils liés > Lier avec numéro</p>`)
    } catch (e) {
      res.send('Erreur: ' + e.message)
    }
  })

  sock.ev.on('creds.update', saveCreds)
  
  sock.ev.on('connection.update', (update) => {
    const { connection } = update
    if (connection === 'open') {
      console.log('KATSHA MB CONNECTÉ ✅')
    }
  })

  // Commandes simples
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0]
    if (!msg.message || msg.key.fromMe) return
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    const from = msg.key.remoteJid

    if (text === '.ping' || text === '.menu') {
      await sock.sendMessage(from, { text: '*KATSHA MB - MD BOT V1*\n\n✅ En ligne\n🚀 Ping: Rapide\n👑 Owner: KATSHA MB\n\nCommandes:\n.ping\n.menu\n.alive' })
    }
  })
}

startBot()
app.listen(PORT, () => console.log('KATSHA MB Server on ' + PORT))
