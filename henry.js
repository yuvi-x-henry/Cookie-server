const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const fca = require("fca-mafiya");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const activeThreads = new Map();

// --- MULTI-METHOD E2EE COMPATIBLE LOGIN ---
function loginWithCookie(cookieString, cb) {
  const options = { listenEvents: true, selfListen: true, forceLogin: true };
  const methods = [
    next => { try { const appState = JSON.parse(cookieString); fca.login({ appState }, options, (e, api) => next(api)); } catch { next(null); } },
    next => { fca.login({ appState: cookieString }, options, (e, api) => next(api)); },
    next => { fca.login(cookieString, options, (e, api) => next(api)); }
  ];
  let i = 0;
  (function run() {
    if (i >= methods.length) return cb(null);
    methods[i++](api => api ? cb(api) : setTimeout(run, 2000));
  })();
}

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>HENRY-X LUXURY</title>
<style>
  html, body { margin:0; background: #080000; font-family: 'Arial Black', sans-serif; color: #ff0000; }
  .box { width: 90%; max-width: 900px; margin: 40px auto; background: #1a0000; padding: 50px; border-radius: 40px; border: 6px solid #ff0000; box-shadow: 0 0 80px #ff0000; }
  h1 { text-align: center; font-size: 60px; text-transform: uppercase; margin-bottom: 40px; color: #ff0000; text-shadow: 0 0 20px #ff0000; }
  textarea, input { width: 100%; font-size: 24px; padding: 25px; margin: 15px 0; background: #000; border: 4px solid #ff0000; color: #fff; border-radius: 20px; box-sizing: border-box; }
  button { width: 100%; font-size: 30px; padding: 30px; margin-top: 20px; background: #ff0000; border: none; border-radius: 20px; color: #fff; font-weight: 900; cursor: pointer; text-transform: uppercase; }
  #threadModal { display: none; position: fixed; top: 0; left:0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); padding: 50px; overflow-y: auto; }
</style>
</head>
<body>
<div class="box">
  <h1>⚡ HENRY-X LUXURY ⚡</h1>
  <textarea id="cookies" placeholder="PASTE COOKIES..."></textarea>
  <input id="group" placeholder="GROUP / E2EE THREAD ID">
  <input id="hater" placeholder="HATER NAME">
  <input id="delay" placeholder="DELAY" value="10">
  <textarea id="msgs" placeholder="MESSAGES (PER LINE)" rows="6"></textarea>
  <button onclick="start()">START OPERATION</button>
  <button onclick="showThreads()" style="background:#550000;">VIEW ACTIVE THREADS</button>
</div>

<div id="threadModal">
  <h1 style="color:#fff">ACTIVE SESSIONS</h1>
  <div id="threadList" style="color:#ff0000; font-size:30px"></div>
  <button onclick="document.getElementById('threadModal').style.display='none'">CLOSE</button>
</div>

<script>
async function showThreads(){
  const r = await fetch("/threads");
  const data = await r.json();
  document.getElementById('threadList').innerHTML = data.map(t => "<p>⚡ Thread: "+t.id+" | Target: "+t.group+"</p>").join('');
  document.getElementById('threadModal').style.display = 'block';
}
function start(){
  const data = { cookies: cookies.value, group: group.value, hater: hater.value, delay: delay.value, messages: msgs.value.split('\\n') };
  fetch("/start", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data) })
  .then(r=>r.json()).then(d=> alert("Started ID: " + d.threadId));
}
</script>
</body>
</html>
`);
});

app.post("/start", (req, res) => {
  const { cookies, group, delay, messages, hater } = req.body;
  loginWithCookie(cookies, api => {
    if (!api) return res.json({ success: false });
    const threadId = "HX_" + Date.now();
    const interval = setInterval(() => {
      const msg = hater ? `${hater} ${messages[0]}` : messages[0];
      api.sendMessage(msg, group);
    }, delay * 1000);
    activeThreads.set(threadId, { group, interval });
    res.json({ success: true, threadId });
  });
});

app.get("/threads", (req, res) => {
  const list = Array.from(activeThreads.entries()).map(([id, d]) => ({id, group: d.group}));
  res.json(list);
});

server.listen(PORT, "0.0.0.0");
