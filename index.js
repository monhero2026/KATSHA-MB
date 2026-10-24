const {
  default: makeWASocket,
  useMultiFileAuthState,
  Browsers,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason,
  downloadMediaMessage
} = require('@whiskeysockets/baileys')
const express = require('express')
const pino = require('pino')
const fs = require('fs') // ✅ AJOUT 1 : fs ajouté en haut
const { Sticker, StickerTypes } = require('wa-sticker-formatter')

const app = express()
const PORT = process.env.PORT || 3000

// ===== CONFIG =====
const CONFIG = {
  AUTO_VIEW_STATUS: process.env.AUTO_VIEW_STATUS !== 'false',
  AUTO_LIKE_STATUS: process.env.AUTO_LIKE_STATUS !== 'false',
  AUTO_LIKE_EMOJIS: ['❤️','🔥','😍','👍','💯','💚','⚡','🎯'],
  ANTI_CALL: process.env.ANTI_CALL !== 'false',
  ANTI_LINK: process.env.ANTI_LINK !== 'false',
  WELCOME: process.env.WELCOME === 'true',
  PREFIX: process.env.PREFIX || '.',
  OWNER_NUMBER: process.env.OWNER_NUMBER || '243810140264',
  BOT_NAME: 'KATSHA',
  BOT_SUBNAME: 'MB',
  VERSION: '3.1.0'
}

// ===== ÉTAT GLOBAL =====
let sock = null
let pairingCodeRequested = false

const STATS = {
  isConnected: false,
  startTime: Date.now(),
  messages: 0,
  statusLiked: 0,
  callsRejected: 0,
  linksDeleted: 0,
  commandsUsed: 0
}
const cooldowns = new Map()
const COOLDOWN_MS = 3000

// ===== CSS GLOBAL (Design Premium) =====
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color: transparent; }
  :root {
    --bg: #050505; --surface: rgba(20, 25, 22, 0.6); --border: rgba(255, 255, 255, 0.08);
    --green: #25D366; --green-glow: rgba(37, 211, 102, 0.4);
    --text: #ffffff; --muted: #8b9d93; --danger: #ff4757;
  }
  body {
    background-color: var(--bg);
    background-image: radial-gradient(circle at 15% 50%, rgba(37, 211, 102, 0.08) 0%, transparent 40%), radial-gradient(circle at 85% 30%, rgba(37, 211, 102, 0.05) 0%, transparent 40%);
    color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh; padding: 24px 16px; display: flex; flex-direction: column; align-items: center; overflow-x: hidden;
  }
  .container { width: 100%; max-width: 800px; position: relative; z-index: 2; }
  @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.3); opacity: 0; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .glass {
    background: var(--surface); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border); border-radius: 24px; padding: 28px; margin-bottom: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); animation: slideUp 0.5s ease-out forwards;
  }
  .profile-header { text-align: center; margin-bottom: 32px; margin-top: 20px; }
  .avatar-container {
    width: 90px; height: 90px; margin: 0 auto 16px; border-radius: 50%;
    background: linear-gradient(135deg, #1f2c23, #0a0e0a); border: 2px solid var(--green);
    display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 0 30px var(--green-glow);
  }
  .avatar-container::after { content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 2px solid var(--green); animation: pulse-ring 2s infinite ease-out; }
  .avatar-svg { width: 44px; height: 44px; fill: var(--green); }
  .bot-name { font-size: 32px; font-weight: 800; letter-spacing: -1px; line-height: 1.2; }
  .bot-name span { color: var(--green); }
  .bot-subtitle { font-size: 14px; color: var(--muted); font-weight: 500; letter-spacing: 1px; margin-top: 4px; text-transform: uppercase; }
  .status-container { display: flex; justify-content: center; gap: 12px; margin-top: 16px; }
  .badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 30px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; border: 1px solid; }
  .badge-online { background: rgba(37, 211, 102, 0.1); color: var(--green); border-color: rgba(37, 211, 102, 0.2); }
  .badge-offline { background: rgba(255, 71, 87, 0.1); color: var(--danger); border-color: rgba(255, 71, 87, 0.2); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  .dot-pulse { animation: pulse-ring 1.5s infinite; }
  .section-title { font-size: 12px; font-weight: 700; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
  .section-title svg { width: 16px; height: 16px; fill: currentColor; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .stat-box { background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: 16px; padding: 20px 12px; text-align: center; transition: all 0.3s ease; }
  .stat-box:hover { background: rgba(37, 211, 102, 0.05); border-color: rgba(37, 211, 102, 0.2); transform: translateY(-2px); }
  .stat-value { font-size: 24px; font-weight: 800; color: var(--green); margin-bottom: 4px; }
  .stat-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 18px 24px; background: var(--green); color: #000; font-size: 16px; font-weight: 700; font-family: inherit; border: none; border-radius: 16px; cursor: pointer; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 20px var(--green-glow); }
  .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px var(--green-glow); background: #2ee676; }
  .btn svg { width: 20px; height: 20px; fill: currentColor; }
  .features-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .feature-item { display: flex; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.02); padding: 14px; border-radius: 14px; border: 1px solid var(--border); }
  .feature-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(37, 211, 102, 0.1); color: var(--green); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .feature-icon svg { width: 18px; height: 18px; fill: currentColor; }
  .feature-text { font-size: 13px; font-weight: 600; }
  .feature-status { font-size: 11px; color: var(--muted); font-weight: 500; }
  .code-container { background: rgba(0, 0, 0, 0.5); border: 2px dashed rgba(37, 211, 102, 0.5); border-radius: 20px; padding: 32px; text-align: center; margin-bottom: 24px; }
  .code-text { font-family: 'Courier New', monospace; font-size: 42px; font-weight: 800; letter-spacing: 12px; color: var(--green); margin-left: 12px; text-shadow: 0 0 30px var(--green-glow); }
  .steps { display: flex; flex-direction: column; gap: 12px; }
  .step { display: flex; align-items: flex-start; gap: 16px; padding: 16px; background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid var(--border); }
  .step-num { width: 28px; height: 28px; border-radius: 50%; background: rgba(37, 211, 102, 0.15); color: var(--green); font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .step-text { font-size: 14px; font-weight: 500; line-height: 1.4; margin-top: 4px; }
  .footer { text-align: center; color: var(--muted); font-size: 12px; margin-top: 40px; font-weight: 500; }
  @media (max-width: 500px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .features-list { grid-template-columns: 1fr; } .code-text { font-size: 32px; letter-spacing: 8px; } .glass { padding: 20px; } }
`

// ===== ROUTE DASHBOARD =====
app.get('/', (req, res) => {
  const uptime = Math.floor((Date.now() - STATS.startTime) / 1000)
  const h = Math.floor(uptime / 3600)
  const m = Math.floor((uptime % 3600) / 60)
  const connected = STATS.isConnected

  res.send(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${CONFIG.BOT_NAME} ${CONFIG.BOT_SUBNAME}</title>
<style>${GLOBAL_CSS}</style>
</head>
<body>
<div class="container">
  <div class="profile-header">
    <div class="avatar-container"><svg class="avatar-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.74.45 3.37 1.24 4.79L2 22l5.36-1.21C8.74 21.55 10.33 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.45 0-2.84-.36-4.08-1.01L3.9 20.1l1.15-4.02C4.36 14.87 4 13.45 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg></div>
    <h1 class="bot-name">${CONFIG.BOT_NAME} <span>${CONFIG.BOT_SUBNAME}</span></h1>
    <p class="bot-subtitle">WhatsApp Automation Bot</p>
    <div class="status-container">
      <div class="badge ${connected ? 'badge-online' : 'badge-offline'}"><div class="dot ${connected ? 'dot-pulse' : ''}"></div> ${connected ? 'Connecté' : 'Hors Ligne'}</div>
      <div class="badge badge-online"><div class="dot"></div> Multi-Device</div>
    </div>
  </div>
  <div class="glass">
    <div class="section-title"><svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>Statistiques en direct</div>
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-value">${STATS.messages}</div><div class="stat-label">Messages</div></div>
      <div class="stat-box"><div class="stat-value">${STATS.statusLiked}</div><div class="stat-label">Status Likés</div></div>
      <div class="stat-box"><div class="stat-value">${STATS.callsRejected}</div><div class="stat-label">Appels Bloqués</div></div>
      <div class="stat-box"><div class="stat-value">${STATS.linksDeleted}</div><div class="stat-label">Liens Suppr.</div></div>
      <div class="stat-box"><div class="stat-value">${STATS.commandsUsed}</div><div class="stat-label">Commandes</div></div>
      <div class="stat-box"><div class="stat-value">${h}h${m}m</div><div class="stat-label">Uptime</div></div>
    </div>
  </div>
  <div class="glass">
    <div class="section-title"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l4-4 4 4h-3v4h-2z"/></svg>Connexion Requise</div>
    <a href="/pair?number=${CONFIG.OWNER_NUMBER}" class="btn"><svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>Obtenir le Code Pair</a>
  </div>
  <div class="glass">
    <div class="section-title"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>Modules Actifs</div>
    <div class="features-list">
      <div class="feature-item"><div class="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div><div><div class="feature-text">Auto Like</div><div class="feature-status">${CONFIG.AUTO_LIKE_STATUS ? 'Activé' : 'Désactivé'}</div></div></div>
      <div class="feature-item"><div class="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg></div><div><div class="feature-text">Auto View</div><div class="feature-status">${CONFIG.AUTO_VIEW_STATUS ? 'Activé' : 'Désactivé'}</div></div></div>
      <div class="feature-item"><div class="feature-icon"><svg viewBox="0 0 24 24"><path d="M19 7l-2 2v8c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2V9L5 7c-.55-.55-1.55-.15-1.55.7v11.6c0 1.2.98 2.2 2.2 2.2h12.7c1.2 0 2.2-1 2.2-2.2V7.7c0-.85-1-1.25-1.55-.7zM12 2C9.24 2 7 4.24 7 7v8h2V7c0-1.66 1.34-3 3-3s3 1.34 3 3v8h2V7c0-2.76-2.24-5-5-5z"/></svg></div><div><div class="feature-text">Anti-Call</div><div class="feature-status">${CONFIG.ANTI_CALL ? 'Activé' : 'Désactivé'}</div></div></div>
      <div class="feature-item"><div class="feature-icon"><svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg></div><div><div class="feature-text">Anti-Link</div><div class="feature-status">${CONFIG.ANTI_LINK ? 'Activé' : 'Désactivé'}</div></div></div>
    </div>
  </div>
  <div class="footer">© ${new Date().getFullYear()} ${CONFIG.BOT_NAME} ${CONFIG.BOT_SUBNAME} · Développé avec ❤️ à Lubumbashi</div>
</div>
</body></html>`)
})

// ===== API STATS & PING =====
app.get('/api/stats', (req, res) => res.json({ ...STATS, uptime: Math.floor((Date.now() - STATS.startTime) / 1000) }))
app.get('/ping', (req, res) => res.status(200).send('Pong! KATSHA MB est réveillé.'))

// ===== PAGE PAIR =====
app.get('/pair', async (req, res) => {
  let number = req.query.number
  if (!number) return res.redirect('/')
  number = number.replace(/[^0-9]/g, '')

  if (!sock) {
    return res.send('<div style="padding:40px;text-align:center;font-family:sans-serif;color:white;background:#050505;min-height:100vh;"><h2>⏳ Le bot démarre...</h2><p>Le serveur Render se réveille. Patiente 10 secondes et rafraîchis cette page.</p><a href="/pair?number=' + number + '" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#25D366;color:black;text-decoration:none;border-radius:8px;font-weight:bold;">🔄 Réessayer</a></div>')
  }

  try {
    const code = await sock.requestPairingCode(number)
    const formatted = code.match(/.{1,4}/g).join(' ')
    res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Code Pair - ${CONFIG.BOT_NAME}</title><style>${GLOBAL_CSS}</style></head>
<body><div class="container" style="max-width: 500px; margin-top: 40px;">
  <div class="profile-header"><div class="avatar-container" style="width: 70px; height: 70px;"><svg class="avatar-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg></div><h1 class="bot-name" style="font-size: 24px;">Code d'Appariement</h1><p class="bot-subtitle" style="font-size: 12px;">Liaison WhatsApp</p></div>
  <div class="glass"><div class="code-container"><div class="code-text">${formatted}</div><p style="color: #ffaa00; font-size: 12px; margin-top: 16px; font-weight: 600;">⏱️ Expire dans 20 secondes</p></div><button class="btn" onclick="navigator.clipboard.writeText('${code}'); this.innerHTML='✅ Copié !'; setTimeout(()=>this.innerHTML='📋 Copier le code', 2000);">📋 Copier le code</button></div>
  <div class="glass"><div class="section-title">Comment faire ?</div><div class="steps">
    <div class="step"><div class="step-num">1</div><div class="step-text">Ouvre <b>WhatsApp</b> sur ton téléphone</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text">Va dans <b>Paramètres</b> > <b>Appareils liés</b></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text">Appuie sur <b>Lier un appareil</b></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-text">Choisis <b>Lier avec numéro</b></div></div>
    <div class="step"><div class="step-num">5</div><div class="step-text">Colle le code à 8 chiffres</div></div>
  </div></div>
  <div class="footer"><a href="/" style="color: var(--green); text-decoration: none;">← Retour au Dashboard</a></div>
</div></body></html>`)
  } catch (e) {
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Erreur</title><style>${GLOBAL_CSS}</style></head><body><div class="container" style="margin-top: 60px; text-align: center;"><div class="glass"><h2 style="color: var(--danger); margin-bottom: 12px;">❌ Erreur</h2><p style="color: var(--muted); font-size: 14px; margin-bottom: 24px;">${e.message}</p><p style="font-size: 13px; margin-bottom: 24px;">Attends 30s. Si le bot est déjà connecté, déconnecte-le depuis WhatsApp.</p><a href="/pair?number=${number}" class="btn" style="margin-bottom: 12px;">🔄 Réessayer</a><a href="/" style="color: var(--green); text-decoration: none; font-size: 13px;">← Dashboard</a></div></div></body></html>`)
  }
})

// ===== BOT LOGIC =====
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
    browser: Browsers.macOS('Desktop'),
    connectTimeoutMs: 60000, 
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 10000
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // ✅ AJOUT 2 : Condition simplifiée selon Meta AI
    if (qr && !pairingCodeRequested) {
      pairingCodeRequested = true;
      console.log("✅ Socket prêt pour le Pair Code.");
    }

    if (connection === 'open') { 
      STATS.isConnected = true; 
      console.log(`✅ ${CONFIG.BOT_NAME} CONNECTÉ`) 
    }
    
    if (connection === 'close') {
      STATS.isConnected = false
      const code = lastDisconnect?.error?.output?.statusCode
      
      if (code !== DisconnectReason.loggedOut) {
        console.log(`🔁 Reconnexion dans 3s...`)
        sock = null 
        pairingCodeRequested = false;
        setTimeout(startBot, 3000)
      } else {
        console.log('❌ Déconnecté (loggedOut).')
      }
    }
  })

  // --- WELCOME MESSAGE ---
  sock.ev.on('group-participants.update', async (update) => {
    if (!CONFIG.WELCOME) return
    if (update.action === 'add') {
      for (const participant of update.participants) {
        await sock.sendMessage(update.id, { 
          text: `👋 Bienvenue @${participant.split('@')[0]} dans le groupe !\n\n_Powered by ${CONFIG.BOT_NAME} ${CONFIG.BOT_SUBNAME}_`,
          mentions: [participant]
        })
      }
    }
  })

  // --- ANTI CALL ---
  sock.ev.on('call', async (calls) => {
    if (!CONFIG.ANTI_CALL) return
    for (const c of calls) {
      if (c.status === 'offer') {
        try {
          await sock.rejectCall(c.id, c.from)
          await sock.sendMessage(c.from, { text: '*📵 KATSHA MB Anti-Call*\nLes appels sont interdits.' })
          STATS.callsRejected++
        } catch {}
      }
    }
  })

  // --- MESSAGES & COMMANDES ---
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0]
      if (!msg?.message) return
      STATS.messages++

      if (msg.key.remoteJid === 'status@broadcast') {
        if (CONFIG.AUTO_VIEW_STATUS) try { await sock.readMessages([msg.key]) } catch {}
        if (CONFIG.AUTO_LIKE_STATUS && msg.key.participant) {
          const emoji = CONFIG.AUTO_LIKE_EMOJIS[Math.floor(Math.random() * CONFIG.AUTO_LIKE_EMOJIS.length)]
          try {
            await sock.sendMessage('status@broadcast', { react: { text: emoji, key: msg.key } }, { statusJidList: [msg.key.participant] })
            STATS.statusLiked++
          } catch {}
        }
        return
      }

      if (msg.key.fromMe) return
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ''
      const from = msg.key.remoteJid

      const linkRegex = /(https?:\/\/|wa\.me|chat\.whatsapp\.com|t\.me|bit\.ly)/i
      if (CONFIG.ANTI_LINK && from.endsWith('@g.us') && msg.key.participant && linkRegex.test(text)) {
        try {
          await sock.sendMessage(from, { delete: msg.key })
          await sock.sendMessage(from, { text: `*🔗 ANTI-LIEN KATSHA*\nLien supprimé @${msg.key.participant.split('@')[0]}`, mentions: [msg.key.participant] })
          STATS.linksDeleted++
        } catch {}
      }

      if (!text.startsWith(CONFIG.PREFIX)) return
      const cmd = text.slice(1).split(/\s+/)[0].toLowerCase()
      const sender = from.endsWith('@g.us') ? msg.key.participant : from

      const key = `${sender}-${cmd}`
      if (cooldowns.has(key) && Date.now() - cooldowns.get(key) < COOLDOWN_MS) return
      cooldowns.set(key, Date.now())
      STATS.commandsUsed++

      if (['ping', 'menu', 'alive'].includes(cmd)) {
        await sock.sendMessage(from, { text: `╭━〔 *${CONFIG.BOT_NAME} ${CONFIG.BOT_SUBNAME} V${CONFIG.VERSION}* 〕━⬣\n┃\n┃ ✅ *STATUS* : En ligne\n┃\n┃ ╭─〔 *COMMANDES* 〕\n┃ │ .ping\n┃ │ .menu\n┃ │ .tagall\n┃ │ .sticker\n┃ │ .kick\n┃ ╰──────────────\n╰━━━━━━━━━━━━━━⬣` })
      }

      if (cmd === 'tagall' && from.endsWith('@g.us')) {
        const group = await sock.groupMetadata(from)
        const mentions = group.participants.map(p => p.id).slice(0, 50)
        await sock.sendMessage(from, { text: `╭━〔 *TAG ALL* 〕━⬣\n\n` + mentions.map(m => `┃ @${m.split('@')[0]}`).join('\n') + `\n\n╰━━━━━━━━━━━⬣`, mentions })
      }

      if (cmd === 'sticker' && msg.message.imageMessage) {
        const stream = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
        const sticker = new Sticker(stream, { pack: CONFIG.BOT_NAME, author: CONFIG.BOT_SUBNAME, type: StickerTypes.FULL, quality: 70 })
        const buffer = await sticker.toBuffer()
        await sock.sendMessage(from, { sticker: buffer })
      }

      if (cmd === 'kick' && from.endsWith('@g.us')) {
        const group = await sock.groupMetadata(from)
        const isAdmin = group.participants.find(p => p.id === sender)?.admin
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        if (!isAdmin) return sock.sendMessage(from, { text: '❌ Seuls les admins peuvent utiliser cette commande.' })
        if (!mentioned) return sock.sendMessage(from, { text: '⚠️ Mentionne la personne à exclure (ex: .kick @membre).' })
        try {
          await sock.groupParticipantsUpdate(from, [mentioned], 'remove')
          await sock.sendMessage(from, { text: `✅ @${mentioned.split('@')[0]} a été exclu du groupe.`, mentions: [mentioned] })
        } catch (e) {
          await sock.sendMessage(from, { text: `❌ Impossible d'exclure: ${e.message}` })
        }
      }

    } catch (e) { console.error('upsert:', e.message) }
  })
}

startBot().catch(e => console.error('startBot:', e))

// ===== KEEP-ALIVE & SELF-PING (Anti-sommeil) =====
setInterval(() => {
  console.log("Keep-Alive KATSHA MB 24/24...");
}, 4 * 60 * 1000);

// Self-ping local pour Render
setInterval(() => {
  const http = require('http');
  http.get(`http://localhost:${PORT}/ping`, (res) => {}).on('error', () => {});
}, 4 * 60 * 1000);

// ===== LANCEMENT =====
app.listen(PORT, () => {
  console.log(`🚀 ${CONFIG.BOT_NAME} ${CONFIG.BOT_SUBNAME} V${CONFIG.VERSION} démarré sur le port ${PORT}`)
})
