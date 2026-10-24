const {
  default: makeWASocket,
  useMultiFileAuthState,
  Browsers,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys')
const express = require('express')
const pino = require('pino')

const app = express()
const PORT = process.env.PORT || 3000

const CONFIG = {
  AUTO_VIEW_STATUS: true,
  AUTO_LIKE_STATUS: true,
  AUTO_LIKE_EMOJIS: ['❤️','🔥','😍','👍','💯'],
  ANTI_CALL: true,
  ANTI_LINK: true,
  WELCOME: false,
  PREFIX: '.'
}

let sock = null

// ---------- DASHBOARD ----------
app.get('/', (req, res) => {
  res.send(`
  <html><head><title>KATSHA MB V2 FULL</title></head>
  <body style="background:#111;color:white;text-align:center;font-family:Arial;padding:40px">
  <h1>🚀 KATSHA MB - V2 FULL</h1>
  <h2 style="color:#25D366">En Ligne ✅</h2>
  <p>Auto View: ${CONFIG.AUTO_VIEW_STATUS} | Auto Like: ${CONFIG.AUTO_LIKE_STATUS} | Anti-Call: ${CONFIG.ANTI_CALL}</p>
  <a href="/pair?number=243810140264" style="background:#25D366;color:white;padding:15px 30px;text-decoration:none;border-radius:10px;font-weight:bold">OBTENIR CODE PAIR</a>
  <br><br><p>Features: AutoLike Story + AntiCall + AntiLink + Sticker</p>
  </body></html>`)
})

// ---------- ROUTE PAIR (globale, sûre) ----------
app.get('/pair', async (req, res) => {
  let number = req.query.number
  if (!number) return res.send('<h3>Utilise: /pair?number=2439XXXXXXXX</h3>')
  number = number.replace(/[^0-9]/g, '')
  if (!sock) return res.send('Bot pas encore prêt, attends 5s et réessaie.')
  try {
    const code = await sock.requestPairingCode(number)
    res.send(`<h1>KATSHA MB V2 PAIR</h1>
      <h2 style="letter-spacing:5px;background:#111;color:#25D366;padding:20px;font-size:30px">${code}</h2>
      <p>WhatsApp > Appareils liés > Lier avec numéro</p>
      <p style="color:orange">Auto Like Story ACTIVÉ ❤️</p>`)
  } catch (e) {
    res.send('Erreur: ' + e.message + '<br>Attends 30s et réessaie.')
  }
})

// ---------- BOT ----------
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    browser: Browsers.macOS('Desktop')
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'open') console.log('KATSHA MB V2 CONNECTÉ ✅')
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        console.log('🔁 Reconnexion...')
        setTimeout(startBot, 3000)
      } else {
        console.log('❌ Déconnecté (loggedOut)')
      }
    }
  })

  // ---------- ANTI CALL ----------
  sock.ev.on('call', async (calls) => {
    if (!CONFIG.ANTI_CALL) return
    for (const c of calls) {
      if (c.status === 'offer') {
        try {
          await sock.rejectCall(c.id, c.from)
          await sock.sendMessage(c.from, {
            text: '*📵 KATSHA MB Anti-Call*\nLes appels sont interdits.'
          })
        } catch (e) { console.error('antiCall:', e.message) }
      }
    }
  })

  // ---------- MESSAGES ----------
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0]
      if (!msg?.message) return

      // ===== STATUS : VIEW + LIKE =====
      if (msg.key.remoteJid === 'status@broadcast') {
        if (CONFIG.AUTO_VIEW_STATUS) {
          try { await sock.readMessages([msg.key]) } catch {}
        }
        if (CONFIG.AUTO_LIKE_STATUS && msg.key.participant) {
          const emoji = CONFIG.AUTO_LIKE_EMOJIS[
            Math.floor(Math.random() * CONFIG.AUTO_LIKE_EMOJIS.length)
          ]
          try {
            await sock.sendMessage(
              'status@broadcast',
              { react: { text: emoji, key: msg.key } },
              { statusJidList: [msg.key.participant] }
            )
            console.log('Story likée', emoji)
          } catch (e) { console.error('likeStatus:', e.message) }
        }
        return
      }

      if (msg.key.fromMe) return

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        ''
      const from = msg.key.remoteJid

      // ===== ANTI LINK =====
      const linkRegex = /(https?:\/\/|wa\.me|chat\.whatsapp\.com|t\.me|bit\.ly)/i
      if (
        CONFIG.ANTI_LINK &&
        from.endsWith('@g.us') &&
        msg.key.participant &&
        linkRegex.test(text)
      ) {
        try {
          await sock.sendMessage(from, { delete: msg.key })
          await sock.sendMessage(from, {
            text: `*ANTI-LIEN KATSHA*\nLien supprimé @${msg.key.participant.split('@')[0]}`,
            mentions: [msg.key.participant]
          })
        } catch (e) { console.error('antiLink:', e.message) }
      }

      // ===== COMMANDES =====
      if (!text.startsWith(CONFIG.PREFIX)) return
      const cmd = text.slice(1).split(/\s+/)[0].toLowerCase()

      if (['ping', 'menu', 'alive'].includes(cmd)) {
        await sock.sendMessage(from, {
          text: `*🚀 KATSHA MB V2 FULL*\n\n✅ En ligne\n❤️ Auto Like Story: ${CONFIG.AUTO_LIKE_STATUS ? 'ON' : 'OFF'}\n📵 Anti-Call: ${CONFIG.ANTI_CALL ? 'ON' : 'OFF'}\n🔗 Anti-Link: ${CONFIG.ANTI_LINK ? 'ON' : 'OFF'}\n\n*Commandes:*\n.ping - vitesse\n.menu - ce menu\n.tagall - mentionne tous\n.sticker - réponds à une image`
        })
      }

      if (cmd === 'tagall' && from.endsWith('@g.us')) {
        const group = await sock.groupMetadata(from)
        const mentions = group.participants.map(p => p.id)
        await sock.sendMessage(from, {
          text: '*TAG ALL BY KATSHA MB*\n' + mentions.map(m => '@' + m.split('@')[0]).join('\n'),
          mentions
        })
      }
    } catch (e) {
      console.error('upsert:', e.message)
    }
  })
}

// ---------- LANCEMENT ----------
startBot().catch(e => console.error('startBot:', e))

app.listen(PORT, () => console.log('KATSHA MB V2 Server on ' + PORT))
