<h1 align="center"> 🚀 KATSHA MB - MD BOT V2 </h1>

<p align="center">
<img src="https://img.shields.io/badge/KATSHA%20MB-V2-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" />
<img src="https://img.shields.io/badge/MULTI%20DEVICE-ON-blue?style=for-the-badge" />
<img src="https://img.shields.io/badge/PAIR%20CODE-8%20Digits-orange?style=for-the-badge" />
<img src="https://img.shields.io/badge/DASHBOARD-REAL%20TIME-green?style=for-the-badge" />
</p>

<p align="center">
<img src="https://img.shields.io/badge/Version-2.0.0-success?style=flat-square" />
<img src="https://img.shields.io/badge/NodeJS-20.x-blue?style=flat-square&logo=node.js" />
<img src="https://img.shields.io/badge/Baileys-6.7.x-red?style=flat-square" />
<img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

<p align="center">
<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=22&duration=3000&pause=1000&color=25D366&center=true&vCenter=true&width=600&lines=Bot+WhatsApp+Multi-Appareil;Pair+Code+8+Chiffres;Dashboard+Temps+R%C3%A9el;Made+in+DRC+%F0%9F%87%A8%F0%9F%87%A9" />
</p>

---

## 🚀 KATSHA MB - C'EST QUOI ?

> 🤖 Bot WhatsApp **100% Multi-Appareil**
> 🔐 Connexion par **Pair Code 8 Chiffres** (pas de QR)
> 📊 **Dashboard** en temps réel avec statistiques
> ⚡ Rapide, Stable, Sécurisé

**KATSHA MB** est un bot WhatsApp original développé à **Lubumbashi, RDC 🇨🇩**, basé sur **Baileys MD**. Conçu pour être simple à déployer, facile à configurer, et puissant en fonctionnalités.

---

## ✨ FONCTIONNALITÉS

| Fonctionnalité | Statut | Description |
|----------------|:------:|-------------|
| 👁️ Auto View Status | ✅ | Voir automatiquement les statuts |
| ❤️ Auto Like Status | ✅ | Réagir aux statuts avec des emojis aléatoires |
| 📵 Anti-Call | ✅ | Rejeter tous les appels vocaux/vidéo |
| 🔗 Anti-Link | ✅ | Supprimer les liens dans les groupes |
| 🏷️ Tag All | ✅ | Mentionner tous les membres d'un groupe |
| 📊 Dashboard Live | ✅ | Statistiques en temps réel |
| 🔐 Pair Code | ✅ | Connexion par code 8 chiffres |
| 👋 Welcome Message | 🔄 | Bientôt disponible |
| 🎨 Sticker Maker | 🔄 | Bientôt disponible |
| ⬇️ Media Downloader | 🔄 | Bientôt disponible |

---

## ⚡ DÉPLOIEMENT RAILWAY (1 minute)

### 1️⃣ Fork ce repo
Clique sur le bouton **`Fork`** en haut à droite de cette page.

### 2️⃣ Va sur Railway
- Ouvre [railway.app](https://railway.app)
- Connecte-toi avec **GitHub**
- Clique sur **`New Project`** → **`Deploy from GitHub repo`**
- Choisis ton fork **`KATSHA-MB`**

### 3️⃣ Configure les variables
Dans Railway → onglet **`Variables`** → ajoute :

| Variable | Valeur | Requis |
|----------|--------|:------:|
| `OWNER_NUMBER` | `243810140264` | ✅ |
| `PREFIX` | `.` | ❌ |
| `AUTO_VIEW_STATUS` | `true` | ❌ |
| `AUTO_LIKE_STATUS` | `true` | ❌ |
| `ANTI_CALL` | `true` | ❌ |
| `ANTI_LINK` | `true` | ❌ |

⚠️ **Format du numéro** : international **sans `+`, sans espace, sans tiret** (ex: `243810140264`)

### 4️⃣ Attends le build
Railway build automatiquement. Statut `✅ Active` = prêt.

### 5️⃣ Obtiens ton Pair Code
- Ouvre l'URL générée (ex: `https://katsha-mb.up.railway.app`)
- Clique sur **`📱 OBTENIR CODE PAIR`**
- Ou direct : `https://ton-url.up.railway.app/pair?number=TON_NUMERO`
- Copie le **code à 8 chiffres**
- Ouvre **WhatsApp** → **`Paramètres`** → **`Appareils liés`** → **`Lier avec numéro`**
- Colle le code en **moins de 20 secondes**

### ⚠️ IMPORTANT — Persistance Railway
Railway **efface le dossier `auth/`** à chaque redémarrage → tu devras **re-scanner** à chaque deploy.

**Solutions** (voir section [Persistance Session](#-persistance-de-session)) :
- ✅ Volume Railway (payant)
- ✅ MongoDB Atlas (gratuit)
- ✅ Variable `SESSION_ID` en base64

---

## 🖥️ DÉPLOIEMENT VPS (recommandé)

### Prérequis
```bash
# Ubuntu 22.04 LTS
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # doit afficher v20.x
