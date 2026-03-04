// ===============================
// ⚡ HENRY-X LUXURY SERVER ⚡
// Render FREE Compatible
// Core logic unchanged
// ===============================

const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fca = require("fca-mafiya");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ---------------- MIDDLEWARE ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------- WEBSOCKET ----------------
const wss = new WebSocket.Server({ server });

function broadcast(data) {
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", ws => {
  ws.send(JSON.stringify({
    type: "status",
    message: "⚡ HENRY-X Connected",
  }));
});

// ---------------- SESSION STORE ----------------
const activeSessions = new Map();

// ---------------- SESSION SAVE / LOAD ----------------
function saveSession(id, api) {
  try {
    const file = path.join(__dirname, `session_${id}.json`);
    fs.writeFileSync(file, JSON.stringify(api.getAppState(), null, 2));
    console.log("💾 Session saved:", id);
  } catch (e) {
    console.log("❌ Save error:", e.message);
  }
}

function loadSession(id) {
  try {
    const file = path.join(__dirname, `session_${id}.json`);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {}
  return null;
}

// ---------------- LOGIN WITH COOKIES ----------------
function loginWithCookie(cookieString, cb) {
  const methods = [
    next => {
      try {
        const appState = JSON.parse(cookieString);
        fca.login({ appState }, (e, api) => next(api));
      } catch { next(null); }
    },
    next => fca.login({ appState: cookieString }, (e, api) => next(api)),
    next => fca.login(cookieString, {}, (e, api) => next(api)),
  ];

  let i = 0;
  (function run() {
    if (i >= methods.length) return cb(null);
    methods[i++](api => api ? cb(api) : setTimeout(run, 2000));
  })();
}

// ---------------- KEEP ALIVE ----------------
function keepAlive(id, api) {
  return setInterval(() => {
    api.getCurrentUserID((e, uid) => {
      if (!e) {
        console.log("💎 Alive:", uid);
        saveSession(id, api);
      }
    });
  }, 300000);
}

// ---------------- UI ----------------
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>HENRY-X LUXURY SERVER</title>
<style>
body{margin:0;background:#050510;color:#fff;font-family:Arial}
.box{max-width:900px;margin:40px auto;padding:20px;
background:rgba(255,255,255,.05);border-radius:20px;
border:1px solid #00ffe0}
h1{text-align:center;color:#00ffe0}
textarea,input{width:100%;margin:10px 0;padding:10px;
background:#000;color:#0f0;border:1px solid #00ffe0}
button{padding:12px 20px;background:#00ffe0;
border:none;border-radius:10px;font-weight:bold;cursor:pointer}
.logs{background:#000;height:300px;overflow:auto;
color:#00ff9c;padding:10px;font-family:monospace}
</style>
</head>
<body>
<div class="box">
<h1>⚡ HENRY-X ⚡</h1>
<textarea id="cookies" placeholder="Paste Facebook Cookies"></textarea>
<input id="group" placeholder="Group / Thread ID">
<input id="delay" placeholder="Delay (seconds)" value="10">
<button onclick="start()">START</button>
<div class="logs" id="logs"></div>
</div>

<script>
const logs = document.getElementById("logs");
const ws = new WebSocket(
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host
);

ws.onmessage = e => {
  logs.innerHTML += e.data + "<br>";
  logs.scrollTop = logs.scrollHeight;
};

function start(){
  fetch("/start",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      cookies: cookies.value,
      group: group.value,
      delay: delay.value,
      messages: ["🔥 HENRY-X POWER 🔥"]
    })
  }).then(r=>r.json()).then(d=>{
    logs.innerHTML += JSON.stringify(d)+"<br>";
  });
}
</script>
</body>
</html>
`);
});

// ---------------- START BOT ----------------
app.post("/start", (req, res) => {
  const { cookies, group, delay, messages } = req.body;
  const sessionId = "HX_" + Date.now();

  loginWithCookie(cookies, api => {
    if (!api) return res.json({ success: false, error: "Login failed" });

    const session = {
      api,
      group,
      delay: delay * 1000,
      messages,
      index: 0,
      sent: 0
    };

    session.interval = setInterval(() => {
      api.sendMessage(
        session.messages[session.index],
        session.group,
        () => {}
      );
      session.sent++;
      session.index = (session.index + 1) % session.messages.length;
    }, session.delay);

    session.keep = keepAlive(sessionId, api);
    activeSessions.set(sessionId, session);
    saveSession(sessionId, api);

    res.json({ success: true, sessionId });
  });
});

// ---------------- START SERVER ----------------
server.listen(PORT, "0.0.0.0", () => {
  console.log("⚡ HENRY-X running on port", PORT);
});
