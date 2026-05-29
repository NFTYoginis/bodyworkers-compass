/**
 * Four-Map Body Researcher — live no-signup demo Worker.
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
    "You are the Four-Map Body Researcher. The files below ARE your instruction layer — " +
    "identity, rules, worked examples, anti-examples, and the reference knowledge. Follow " +
    "them exactly. Your forced first action, every time, is to reason from reference/" +
    "evidence-floor.md: tier-tag every cross-map claim, name convergence and divergence " +
    "together, hold the ceiling at the weakest verifiable claim, and never assert the four " +
    "maps are one system. You can also read images the practitioner shows you (posture " +
    "photos, anatomy or meridian charts) and map what you see across the four maps, with the " +
    "same evidence discipline. Sign public-facing as Gabe Yoga.\n\n";
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
<title>The Four-Map Body Researcher · live demo · by Gabe Yoga</title>
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
</head>
<body>
<div class="wrap">
  <header>
    <div class="eyebrow">Joint anatomy · Anatomy Trains · Meridians · Thai Sen</div>
    <h1>The Four-Map Body Researcher</h1>
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
    The Four-Map Body Researcher — live demo. <span class="by">By Gabe Yoga.</span> It connects the maps; it never collapses them. Evidence discipline rests on Wilke (2016), Langevin &amp; Yandow (2002), Thomas Myers, and the Thai Sen lineage of teacher Pichest Boonthume. MIT-licensed.
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
