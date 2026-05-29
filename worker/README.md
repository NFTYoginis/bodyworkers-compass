# Live demo Worker — setup

A Cloudflare Worker that serves a free, no-signup chat surface for the Four-Map Body
Researcher. It loads the build's own instruction layer from the **public repo raw URLs**
as the system prompt, then proxies one conversation to the Anthropic Messages API
(Claude Sonnet 4.6). The API key lives only as a Worker secret — it is never committed.

> **Operator-run, one interactive step.** Everything below is operator-side. The single
> interactive step is `wrangler login` (opens a browser to authorize your Cloudflare
> account). specialist-builder cannot perform that login — it's flagged here as the one
> handoff. Best-effort: if login slips, the rest of the W6 launch ships without it and the
> Worker is a fast-follow.

## Prerequisites

- The repo is **pushed and public** (the Worker fetches `identity.md`, `rules.md`,
  `examples.md`, `anti-examples.md`, and `reference/*.md` from its raw URLs). If the repo
  is renamed at deploy, update `REPO_RAW` and `PAGES_BASE` in `wrangler.toml`.
- An Anthropic API key.
- Node 18+ (this machine has Node 24).

## Steps

```bash
cd builds/bodyworkers-compass/worker

# 1. Authorize Cloudflare (THE one interactive step — opens a browser).
npx wrangler login

# 2. Set the API key as a secret (prompts for the value; never written to disk/git).
npx wrangler secret put ANTHROPIC_API_KEY

# 3. (Optional) enable the rate-limiting binding for your account if prompted — the
#    Worker degrades to an in-isolate limiter if it isn't available.

# 4. Deploy.
npx wrangler deploy
```

`wrangler deploy` prints the live URL, of the form:

```
https://four-map-researcher.<your-account-subdomain>.workers.dev
```

## Wire the "try it live" button into the landing page

The deterministic part of the URL is the Worker name (`four-map-researcher`); the
`<your-account-subdomain>` piece is only known after `wrangler login`. Once deploy prints
the full URL, set it into `docs/index.html` (the `#setup` "try it live" button) before the
push. To make this a one-touch edit, the landing page carries the placeholder token
`__WORKER_URL__` at the button's `href` — replace it with the printed URL:

```bash
# from the repo root, after deploy prints the URL:
sed -i '' "s|__WORKER_URL__|https://four-map-researcher.<sub>.workers.dev|" docs/index.html
```

(The `__WORKER_URL__` token + button are added during the held design-integration pass,
so the button goes live the moment the Worker deploys.)

## Local dev / smoke test

```bash
npx wrangler dev
# then POST a turn:
curl -s localhost:8787/api/chat -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Is the Bladder meridian the same as the Superficial Back Line?"}]}'
```

`wrangler dev` needs the secret too — either run `wrangler secret put` first, or drop the
key in a local `.dev.vars` file (`ANTHROPIC_API_KEY=sk-ant-...`). **`.dev.vars` is
gitignored — never commit it.**

## Guardrails (already wired)

- **Per-IP rate limit** — 10 requests / 60s (native binding; in-isolate fallback).
- **Max-tokens cap** — `MAX_TOKENS` in `wrangler.toml` (default 1024, clamped 256–2048).
- **Input caps** — ≤14 messages and ≤6000 chars per conversation.
- **Prompt caching** — the ~17k-token instruction-layer system block is sent with
  `cache_control: ephemeral`, so repeat turns are cheap.

For a hard global spend ceiling beyond per-IP limiting, set a monthly usage cap on the
Anthropic key and/or add a Cloudflare KV daily counter.

## What it does NOT do

- No accounts, no storage of conversations, no logging of message content.
- No secrets in the repo. The key is a Worker secret only.
- The bundled diagrams (`docs/figures/*.svg`) display in the UI when present and hide
  gracefully until design delivers them.
