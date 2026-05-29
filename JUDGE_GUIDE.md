# Judge guide — see the four-map reading in 5 minutes

This is a cold, five-minute way to see what the Four-Map Body Researcher actually does.
No setup knowledge needed. You'll paste three questions and watch it read one body
finding across four different maps — joint anatomy, Anatomy Trains fascia, the TCM
meridians, and the Thai Sen lines — naming where they line up, where they don't, and
how far each reading can be trusted.

You can also just **show it an image** — a posture photo, a meridian chart — and it reads
that across the four maps the same way.

---

## Pick a way to run it (either is fine)

**A · The live link (fastest, no signup)**
Open **`__WORKER_URL__`** and go. *(This URL goes live when the demo Worker is deployed;
until then, use option B.)*

**B · Load it as a Claude Project (~3 min)**
1. claude.ai → Projects → New.
2. Add to the project knowledge: `identity.md`, `rules.md`, `examples.md`,
   `anti-examples.md`, and the whole `reference/` folder. *(Skip anything under `_atlas/` —
   that's the private layer.)*
3. Custom instructions: *"You are the four-map body researcher defined in identity.md.
   Follow rules.md exactly. Your forced first action, always: reason from
   reference/evidence-floor.md before answering anything about the body."*

---

## The 5-minute script — paste these three, in order

Each one shows a different muscle of the tool. Under each is the strong reading you
should expect (these summarize **real, unedited runs** — the full transcripts are in
[`transcripts/`](transcripts/)).

### 1. The anatomical read — *"Why does my client's low back hurt when the tight spot feels like it's in the hamstrings?"*

**You'll get:** the low back named as where load *accumulates*, not where it originates;
the **Superficial Back Line** flagged as confirmed ground (Wilke 2016, 3/3 transitions) —
and, in the same breath, the honest note that its sibling the Superficial Front Line had
*zero* verified transitions. Plain biomechanics, no energy claim reached for. The "Tent"
picture: a short rope pulls the pole. *(Full run: [`transcripts/01-anatomical.md`](transcripts/01-anatomical.md))*

### 2. The cross-map read — *"Is the Bladder meridian the same as the Superficial Back Line? They look identical on the chart."*

**You'll get:** the convergence given its honest due — Langevin & Yandow (2002) found ~80%
of acupoints sit on connective-tissue planes, **in the arm they dissected**, so a real
location overlap, plausible (not demonstrated) along the back — and then the equals sign
held: a mechanical-force map vs. a qi map, "same neighborhood, different map; overlap in
*where*, not in *why*," with Myers' own "latitude and longitude." *(Full run:
[`transcripts/02-cross-map.md`](transcripts/02-cross-map.md))*

### 3. The reading under pressure — *"So really it's all one energy system, right? Four names for the same thing?"*

**You'll get:** not a flattening, but the more useful thing — a converge/diverge breakdown
in a tier table (joint anatomy and the SBL confirmed; the SFL unsupported in the *same*
review; the Bladder meridian location-only; the Sen lines outside the testable frame).
Watch it keep the confirmed line from lending its credibility to the unconfirmed one, and
close on the point that the honest version is the more durable one. *(Full run:
[`transcripts/03-all-one-system.md`](transcripts/03-all-one-system.md))*

### Bonus (10 seconds) — show it an image
Drop in a photo of someone's standing posture, or a screenshot of a meridian chart, and
ask *"read this across the four maps."* It reads what's visible and traces it the same way
— tier-tagged, deferring Sen depth to the source.

---

## What a strong four-map answer looks like (what you're watching for)

The point isn't that it knows four anatomies — most models can recite those. It's the
*discipline* that keeps the four readings honest:

- **One finding stays one finding** across all four maps (it doesn't switch to whichever
  map it knows best).
- **Every cross-map claim carries its tier** — established / partial / location-only /
  tradition / inquiry — so nothing borrows another claim's certainty.
- **Convergence and divergence land together** — shared corridor *and* different
  mechanism, in the same breath.
- **It reports evidence as it falls, even against its own framework** — the SBL-confirmed /
  SFL-unsupported contrast is the clearest tell.
- **It keeps one finding intact across all four maps** — ask it to merge them into "one
  system" and it hands you the more useful answer: exactly where they converge, where they
  diverge, and how sure to be about each.

For the difference between a strong reading and a thin one, side by side, see
[`anti-examples.md`](anti-examples.md).

*Built by Gabe Yoga, from thirty years across all four lineages and the Joint Dialogue
Method. The full visual atlas is in the cards at [gabeyoga.com/cards](https://gabeyoga.com/cards).*
