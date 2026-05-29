# Bodyworker's Compass

You already work in two or three maps of the body. This reads one finding
across all four — at once.

**You bring one finding** — *"chronic low-back tightness, the SI feels stuck"*
(or a photo of the client standing). **It hands back one pass across four maps:**

| Map | Reading |
|---|---|
| Joint | SI restriction |
| Anatomy Trains | Superficial Back Line |
| TCM | Bladder channel |
| Sen | Sen Kalathari |
| **Confidence** | **Medium** — strongest on the Superficial Back Line, where the research is strong (Wilke 2016); the link across maps is a shared *location*, not a merger |

**One finding. Four maps. One pass.**

[**Try it free →**](https://bodyworkers-compass.gabeyoga.workers.dev)

---

Ever wondered how a Bladder meridian finding relates to the Superficial Back
Line? Or how a Sen line observation relates to joint anatomy? That's the whole
tool. You give it what you're seeing on the table, in a photo, or in the book
you're studying; it reads that one finding across **joint anatomy, Anatomy
Trains fascia, the meridians, and the Thai Sen lines** — naming the line, the
corridor, and the channel of the *same* finding side by side, and telling you
how far each reading can be trusted.

Built for bodyworkers — Thai massage, manual therapy, yoga, movement — by
**Gabe Yoga**, from thirty years inside all four lineages: Pattabhi Jois and
B.K.S. Iyengar in 2005, Pichest Boonthume's Thai tradition in Chiang Mai, and
the **Joint Dialogue Method** built to carry one finding across all of them.
That cross-lineage fluency is the rare thing this tool is made of — and the
reason one guide can read four maps without flattening them into one.

> The honesty is in the body of every answer: it tells you how sure to be, line
> by line. In one Anatomy Trains review the Superficial Back Line came back
> *confirmed* and its sibling the Superficial Front Line came back *unsupported*
> — and it says so in the same breath. A guide honest enough to do that is one
> you can stand behind in front of a client.

---

## What it does

You bring **one finding** — a symptom, a restriction, a pattern on the table or
the mat. The guide:

1. **Translates it across all four maps** using a shared, register-neutral
   vocabulary, so the finding stays *one* finding as it moves between systems.
2. **Tags every claim with its evidence tier** — established / location-correlation
   / unsupported / lineage-tradition / inquiry-only.
3. **Names convergence and divergence together** — never reports a shared
   *location* as a shared *mechanism*.
4. **Holds the credibility ceiling** at the weakest verifiable claim, and says so.

The distinctive skill is the **vocabulary bridge** (the Joint Dialogue Method's
Short/Long, Load/Capacity, the Four Words, the Tent) — *how* one finding gets
carried across four maps cleanly. The skill is the translation, not an anatomy
recital.

## The one worked region (v1)

This public version carries **one region fully worked at sampler depth: chronic
low-back / posterior chain.** It traces a single low-back finding across:

- **Joint anatomy** — lumbar spine / SI joint / hip *(Tier 1, established)*
- **Anatomy Trains** — the **Superficial Back Line** *(Wilke-2016 confirmed)*, with
  the honest contrast that the SFL is **not**
- **TCM / meridian** — the **Bladder meridian** *(Langevin location-correlation;
  Cooley's emotional layer offered as inquiry only)*
- **Thai Sen lines** — **Sen Kalathari** and the back-of-leg lines *(named as
  tradition; depth deferred to the lineage source)*

See [`reference/posterior-chain-slice.md`](reference/posterior-chain-slice.md) for
the full walkthrough, and [`examples.md`](examples.md) for it in conversation.

## What it won't do

- **Won't unify the maps** ("it's all one system" — the claim that sinks the rest).
- **Won't diagnose or prescribe** — it's a research/translation tool for
  practitioners, not a clinician.
- **Won't dress tradition up as science** — location overlap is not mechanism
  validation; qi and Sen energy are not "scientifically proven" here.
- **Won't author Thai Sen-lineage internals** — it names the lines and defers depth
  to the source.

The four refusal gates, with exact language, are in [`rules.md`](rules.md).

---

## See it run

- **[`transcripts/`](transcripts/)** — three real, unedited runs of the guide on
  its canonical questions (the worked-output gallery), captured on Claude Sonnet 4.6 and
  verified against the evidence floor.
- **[`anti-examples.md`](anti-examples.md)** — strong vs. shallow cross-system reading,
  side by side: the bar this tool is built to clear.
- **[`JUDGE_GUIDE.md`](JUDGE_GUIDE.md)** — a cold five-minute script to evaluate it
  yourself, by live link or as a Claude Project.

---

## The thinking behind it

- **[`THESIS.md`](THESIS.md)** — why a four-map guide with a real evidence floor needs to
  exist, and why this builder.
- **[`WRITEUP.md`](WRITEUP.md)** — the full design rationale: the four-map architecture, the
  vocabulary bridge, and the evidence layer as a trust feature.

---

## Setup (load it as a Claude Project, ~10 minutes)

1. **Create a new Claude Project** (claude.ai → Projects → New).
2. **Add these files to the project knowledge:** `identity.md`, `rules.md`,
   `examples.md`, `anti-examples.md`, and the whole `reference/` folder.
3. **Set the project's custom instructions** to: *"You are Bodyworker's Compass defined in identity.md. Follow rules.md exactly. Your forced first
   action, always: read reference/evidence-floor.md before answering anything
   about the body."*
4. **Do not add** anything under `_atlas/` — that's the gated/private layer and is
   not part of the public guide.
5. **First message** — try one of the first-run prompts below.

### First-run prompts

- *"Walk me through a chronic low-back client across all four maps — I want to see
  the method, not just facts."*
- *"Is the Bladder meridian the same as the Superficial Back Line?"*
- *"Which Anatomy Trains lines actually have evidence behind them?"*
- *"How would you translate a Short posterior chain into the Thai Sen map?"*

---

## The cards and books (where the depth lives)

This guide is the free demonstration of the method. The full multi-region
atlas, the lineage Sen teaching, and the clinical depth live in the products:

- **Card decks** — the visual bridge across all three energy systems:
  **[gabeyoga.com/cards](https://gabeyoga.com/cards)**
- **Books** — the Joint Dialogue Method and the teaching library:
  **[gabeyoga.com/books](https://gabeyoga.com/books)**

The low-back slice here rides entirely inside the free card sampler — SBL,
Bladder, and Sen-01/02 are already free sampler cards. Publishing this slice
exposes nothing beyond what's already free.

## Where it's headed (the partner tool)

The public slice is one entry into a frame built to grow. The larger **private
partner tool** — backed by the four books and support material for the bodyworker
world — extends the same six-lens shape region by region. The architecture is
documented in [`reference/architecture.md`](reference/architecture.md); the gated
`_atlas/` is where those regions are built. This repo demonstrates the method and
points to the products; it isn't the partner tool itself.

---

## Acknowledgments (the sources behind the evidence discipline)

This tool's credibility rests on naming its sources honestly:

- **Jan Wilke et al. (2016)** — the systematic review that confirms the SBL's
  myofascial continuity and finds the SFL unsupported. The reason this tool can
  tell them apart.
- **Helene Langevin & Jason Yandow (2002)** — the acupoint↔connective-tissue-plane
  location correlation. The reason "same neighborhood, different map" is honest.
- **Thomas Myers** — *Anatomy Trains*, and his own insistence that myofascial
  meridians are "lines of latitude and longitude," not acupuncture meridians. The
  governor of this whole tool.
- **Bob Cooley** — the meridian-circuit emotional framework, carried here strictly
  as inquiry, never as causation.
- **The Thai Sen-line lineage** — teacher **Pichest Boonthume's** tradition,
  carried by Gabe Yoga. Named with respect; depth deferred to the source.

The Joint Dialogue Method, which supplies the investigative spine and the bridging
vocabulary, is Gabe Yoga's synthesis of these lineages.

---

## License

MIT — see [`LICENSE`](LICENSE). The instruction files and landing page are free to
study and reuse. The cited research retains its authors' rights; the card decks
and books are commercial products and are not MIT-licensed.

*By Gabe Yoga · [gabeyoga.com](https://gabeyoga.com)*
