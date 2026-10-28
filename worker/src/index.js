/**
 * Bodyworker's Compass — live no-signup demo Worker.
 *
 * GET  /            → self-contained chat UI (Field Atlas palette, inline CSS/JS).
 * POST /api/chat    → proxy ONE conversation to the Anthropic Messages API.
 * GET  /healthz      → liveness.
 *
 * The system prompt is the build's own instruction layer, fetched live from the
 * PUBLIC repo raw URLs and cached per-isolate (so the deployed Worker always
 * mirrors the published files). The Anthropic key is read from the
 * ANTHROPIC_API_KEY secret — it is never committed and never sent to the client.
 *
 * Guardrails (LIVE-DEMO-PROBE): per-IP rate limit + max-tokens cap + input-size cap.
 */

const SYSTEM_FILES = [
  "identity.md",
  "rules.md",
  "examples.md",
  "anti-examples.md",
  "reference/evidence-floor.md",
  "reference/the-four-maps.md",
  "reference/vocabulary-bridge.md",
  "reference/register-discipline.md",
  "reference/posterior-chain-slice.md",
  "reference/architecture.md",
];

// Per-isolate caches.
let SYSTEM_CACHE = null; // { text, at }
const SYSTEM_TTL_MS = 60 * 60 * 1000; // 1h — edits to the repo propagate within the hour.
const IP_HITS = new Map(); // fallback limiter: ip -> number[] (ms timestamps)

// Input caps.
const MAX_MESSAGES = 14;
const MAX_TOTAL_CHARS = 6000;

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return new Response("ok", { status: 200 });
    }
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(renderUI(env), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (request.method === "POST" && url.pathname === "/api/chat") {
      return handleChat(request, env);
    }
    return new Response("Not found", { status: 404 });
  },
};

async function handleChat(request, env) {
  // 1) API key present?
  if (!env.ANTHROPIC_API_KEY) {
    return jsonError(500, "Server is not configured yet — the ANTHROPIC_API_KEY secret is missing.");
  }

  // 2) Rate limit (native binding if available; in-isolate fallback otherwise).
  const ip = request.headers.get("cf-connecting-ip") || "anon";
  const limited = await isRateLimited(env, ip);
  if (limited) {
    return jsonError(429, "You're going a little fast for a free demo — give it a few seconds and try again.");
  }

  // 3) Parse + validate input.
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Could not read the request.");
  }
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return jsonError(400, "Send at least one message.");
  }
  if (messages.length > MAX_MESSAGES) {
    return jsonError(400, "This free demo keeps conversations short — start a fresh thread to continue.");
  }
  let total = 0;
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return jsonError(400, "Malformed message.");
    }
    total += m.content.length;
  }
  if (total > MAX_TOTAL_CHARS) {
    return jsonError(400, "That's longer than the free demo accepts — try a tighter question.");
  }

  // 4) Assemble the system prompt from the published instruction layer.
  let systemText;
  try {
    systemText = await getSystemPrompt(env);
  } catch (e) {
    return jsonError(502, "Couldn't load the researcher's instruction files from the repo. Is the repo public yet?");
  }

  // 5) Call Anthropic (Sonnet 4.6), with prompt caching on the large system block.
  const model = env.MODEL || "claude-sonnet-4-6";
  const maxTokens = clampInt(env.MAX_TOKENS, 1024, 256, 2048);
  let apiRes;
  try {
    apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
        messages,
      }),
    });
  } catch {
    return jsonError(502, "The model is unreachable right now — try again in a moment.");
  }

  if (!apiRes.ok) {
    const detail = await safeText(apiRes);
    return jsonError(502, "The model returned an error.", detail.slice(0, 300));
  }

  const data = await apiRes.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return new Response(JSON.stringify({ text }), { headers: JSON_HEADERS });
}

async function getSystemPrompt(env) {
  const now = Date.now();
  if (SYSTEM_CACHE && now - SYSTEM_CACHE.at < SYSTEM_TTL_MS) {
    return SYSTEM_CACHE.text;
  }
  const base = (env.REPO_RAW || "").replace(/\/$/, "");
  if (!base) throw new Error("REPO_RAW not set");
  const parts = await Promise.all(
    SYSTEM_FILES.map(async (f) => {
      const r = await fetch(`${base}/${f}`, { cf: { cacheTtl: 1800, cacheEverything: true } });
      if (!r.ok) throw new Error(`fetch ${f} -> ${r.status}`);
      const t = await r.text();
      return `===== FILE: ${f} =====\n${t}`;
    })
  );
  const preamble =
    "You are Bodyworker's Compass. The files below ARE your instruction layer — " +
    "identity, rules, worked examples, anti-examples, and the reference knowledge. Follow " +
    "them exactly. Your forced first action, every time, is to reason from reference/" +
    "evidence-floor.md: tier-tag every cross-map claim, name convergence and divergence " +
    "together, hold the ceiling at the weakest verifiable claim, and never assert the four " +
    "maps are one system. You can also read images the practitioner shows you (posture " +
    "photos, anatomy or meridian charts) and map what you see across the four maps, with the " +
    "same evidence discipline. Your name is Bodyworker's Compass — if asked what you are " +
    "called or your name, answer Bodyworker's Compass. 'Gabe Yoga' is only the byline you " +
    "sign public-facing answers with, not your name.\n\n";
  const text = preamble + parts.join("\n\n");
  SYSTEM_CACHE = { text, at: now };
  return text;
}

async function isRateLimited(env, ip) {
  if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === "function") {
    try {
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      return !success;
    } catch {
      // fall through to in-isolate limiter
    }
  }
  // Fallback: best-effort per-isolate sliding window (10 / 60s).
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 10;
  const hits = (IP_HITS.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    IP_HITS.set(ip, hits);
    return true;
  }
  hits.push(now);
  IP_HITS.set(ip, hits);
  return false;
}

function clampInt(v, dflt, lo, hi) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}

function jsonError(status, message, detail) {
  const payload = detail ? { error: message, detail } : { error: message };
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function renderUI(env) {
  const pages = (env.PAGES_BASE || "https://nftyoginis.github.io/four-map-anatomy-researcher").replace(/\/$/, "");
  // Bundled diagrams live on the Pages origin; they lazy-load and hide gracefully
  // if absent.
  const figOverlay = `${pages}/figures/fig-four-map-overlay.png`;
  const figLowBack = `${pages}/figures/fig-low-back-four-systems.png`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bodyworker's Compass · live demo · by Gabe Yoga</title>
<style>
  :root{
    --paper:#f4efe4; --paper-2:#faf6ec; --ink:#20242a; --body:#36383c; --soft:#6a6357;
    --line:#d9cfb8; --plot:#9c3a2e; --plot-deep:#722a20;
    --m-joint:#3f5a6b; --m-trains:#6b6233; --m-tcm:#7a5a2e; --m-sen:#6a4156;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    background:var(--paper);
    background-image:linear-gradient(to right,rgba(124,110,80,.06) 1px,transparent 1px),
                     linear-gradient(to bottom,rgba(124,110,80,.06) 1px,transparent 1px);
    background-size:46px 46px;
    color:var(--body);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;
    line-height:1.6;font-size:16px;-webkit-font-smoothing:antialiased;
  }
  .wrap{max-width:820px;margin:0 auto;padding:0 20px}
  header{padding:34px 0 18px;border-bottom:1px solid var(--line)}
  .serif{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
  h1{font-family:"Iowan Old Style",Palatino,Georgia,serif;color:var(--ink);font-size:28px;letter-spacing:-.01em;line-height:1.1;margin-bottom:8px}
  .eyebrow{font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:var(--plot);margin-bottom:12px}
  .sub{font-size:15px;color:var(--soft);max-width:640px}
  .figs{display:flex;gap:12px;margin:16px 0 0;flex-wrap:wrap}
  .figs figure{flex:1 1 220px;background:var(--paper-2);border:1px solid var(--line);border-radius:9px;padding:10px;margin:0}
  .figs img{width:100%;height:auto;display:block;border-radius:5px}
  .figs figcaption{font-size:12px;color:var(--soft);margin-top:6px}
  .chat{padding:22px 0 8px;min-height:180px}
  .msg{padding:14px 16px;border-radius:10px;margin-bottom:12px;font-size:15px;max-width:92%}
  .msg.user{background:var(--ink);color:var(--paper-2);margin-left:auto}
  .msg.bot{background:var(--paper-2);border:1px solid var(--line);color:var(--body);white-space:pre-wrap}
  .msg.err{background:#f0e4e0;border:1px solid #ddc3bb;color:var(--plot-deep);font-size:14px}
  .prompts{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 16px}
  .chip{background:var(--paper-2);border:1px solid var(--line);border-radius:20px;padding:7px 13px;font-size:13px;color:var(--ink);cursor:pointer}
  .chip:hover{border-color:var(--plot);color:var(--plot)}
  .composer{position:sticky;bottom:0;background:var(--paper);padding:12px 0 20px;border-top:1px solid var(--line)}
  textarea{width:100%;resize:vertical;min-height:64px;padding:12px 14px;border:1.5px solid var(--line);border-radius:8px;font:inherit;font-size:15px;background:var(--paper-2);color:var(--ink)}
  textarea:focus{outline:none;border-color:var(--plot)}
  .row{display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap}
  button{background:var(--plot);color:var(--paper-2);border:none;border-radius:7px;padding:11px 22px;font-weight:700;font-size:14px;cursor:pointer}
  button:hover{background:var(--plot-deep)}
  button:disabled{opacity:.5;cursor:default}
  .note{font-size:12.5px;color:var(--soft)}
  .note a{color:var(--plot);text-decoration:none}
  footer{padding:22px 0 40px;font-size:12.5px;color:var(--soft);border-top:1px solid var(--line);margin-top:12px}
  footer .by{color:var(--ink);font-weight:700}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@500&display=swap" rel="stylesheet">
<style id="qs-bar">
  :root{--qs-ink:#1A2738;--qs-amber:#B5731A;--qs-cream:#FEFAF3;--qs-gold:#C8A96E;--qs-display:"Fraunces",Georgia,serif;--qs-body:"Inter",system-ui,sans-serif}
  .qs-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 16px;background:var(--qs-cream);color:var(--qs-ink);font:500 13px/1.4 var(--qs-body);border-bottom:1px solid var(--qs-gold);text-align:left}
  .qs-bar img{border-radius:50%;background:var(--qs-cream)}
  .qs-bar a{color:var(--qs-amber);text-decoration:none}.qs-bar a:hover{text-decoration:underline}
  .qs-bar .qs-by a{font-family:var(--qs-display);font-weight:600;color:var(--qs-ink)}
  .qs-bar .qs-sep{color:var(--qs-gold)}.qs-bar .qs-icm{margin-left:auto;color:#4a5566}
  @media(max-width:560px){.qs-bar .qs-icm{margin-left:0;flex-basis:100%}}
</style>
</head>
<body>
<div class="qs-bar">
  <img src="data:image/png;base64,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" alt="" width="28" height="28">
  <span class="qs-by">Created by <a href="https://thequietscribe.com">The Quiet Scribe</a></span>
  <span class="qs-sep">·</span><a href="https://github.com/NFTYoginis/bodyworkers-compass">bodyworkers-compass on GitHub</a>
  <span class="qs-icm">ICM: Jake Van Clief · <a href="https://www.skool.com/cliefnotes">Clief Notes</a></span>
</div>
<div class="wrap">
  <header>
    <div class="eyebrow">Joint anatomy · Anatomy Trains · Meridians · Thai Sen</div>
    <h1>Bodyworker's Compass</h1>
    <p class="sub">Bring one finding — a restriction, a posture, a pattern. It reads it across all four maps and tells you where they converge, where they diverge, and how far each reading can be trusted. A free, no-signup demo of the researcher.</p>
    <div class="figs">
      <figure><img src="${figOverlay}" alt="One posterior body with four map-register lines — joint anatomy (slate), Superficial Back Line (olive), Bladder meridian (ochre), and Sen Kalathari (plum) — sharing the back corridor without merging." loading="lazy" onerror="this.closest('figure').style.display='none'"><figcaption>Four maps, one corridor — never one line.</figcaption></figure>
      <figure><img src="${figLowBack}" alt="Four panels reading one chronic-low-back finding across joint anatomy, the SBL, the Bladder meridian, and Sen Kalathari, each tier-tagged." loading="lazy" onerror="this.closest('figure').style.display='none'"><figcaption>One finding, read across all four maps.</figcaption></figure>
    </div>
  </header>

  <div class="prompts" id="prompts">
    <span class="chip">Walk me through a chronic low-back client across all four maps.</span>
    <span class="chip">Is the Bladder meridian the same as the Superficial Back Line?</span>
    <span class="chip">Which Anatomy Trains lines actually have evidence behind them?</span>
  </div>

  <div class="chat" id="chat"></div>

  <div class="composer">
    <textarea id="input" placeholder="Describe one finding — or paste a question…"></textarea>
    <div class="row">
      <button id="send">Ask the researcher</button>
      <span class="note">Free demo · runs on Claude Sonnet 4.6 · the full visual atlas is in <a href="https://gabeyoga.com/cards">the cards</a>.</span>
    </div>
  </div>

  <footer>
    Bodyworker's Compass — live demo. <span class="by">By Gabe Yoga.</span> Evidence discipline rests on Wilke (2016), Langevin &amp; Yandow (2002), Thomas Myers, and the Thai Sen lineage of teacher Pichest Boonthumme. MIT-licensed.
  </footer>
</div>

<script>
  const chat = document.getElementById('chat');
  const input = document.getElementById('input');
  const send = document.getElementById('send');
  const messages = [];

  function add(role, text){
    const d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'user' : role === 'error' ? 'err' : 'bot');
    d.textContent = text;
    chat.appendChild(d);
    d.scrollIntoView({behavior:'smooth', block:'end'});
    return d;
  }

  async function ask(text){
    if(!text.trim()) return;
    add('user', text);
    messages.push({role:'user', content:text});
    input.value=''; send.disabled=true;
    const thinking = add('bot', '…reading across the four maps');
    try{
      const r = await fetch('/api/chat', {
        method:'POST', headers:{'content-type':'application/json'},
        body: JSON.stringify({messages})
      });
      const data = await r.json();
      if(!r.ok){ thinking.remove(); add('error', data.error || 'Something went wrong.'); }
      else{
        thinking.textContent = data.text || '(no answer)';
        messages.push({role:'assistant', content:data.text || ''});
      }
    }catch(e){
      thinking.remove(); add('error', 'Network error — try again.');
    }finally{ send.disabled=false; input.focus(); }
  }

  send.addEventListener('click', ()=>ask(input.value));
  input.addEventListener('keydown', e=>{ if(e.key==='Enter' && (e.metaKey||e.ctrlKey)) ask(input.value); });
  document.getElementById('prompts').addEventListener('click', e=>{
    if(e.target.classList.contains('chip')) ask(e.target.textContent);
  });
</script>
</body>
</html>`;
}
