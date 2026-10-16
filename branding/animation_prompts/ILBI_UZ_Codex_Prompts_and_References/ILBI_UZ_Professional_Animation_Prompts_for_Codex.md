# ILBI.UZ — Four Production-Grade Logo Animation Prompts for Local Codex

**Purpose:** Turn four approved five-panel visual storyboards into **four distinct, real, production-quality logo animations**, using code—not a slideshow, image pan, or simulation of the storyboard sheets.

**Language:** English throughout the implementation prompts. The original Uzbek storyboard titles are preserved verbatim so each prompt can be matched unambiguously with its source image.

**Intended operator:** A local Codex coding agent with access to a frontend repository and the reference PNG files.

---

## 0. Exact reference identification — read this first

The reference image filenames below are **exact and authoritative**. Their numeric suffixes correspond to the animation concept numbers. Do not identify a reference by its upload order, by a vague description such as “first image,” or by a screenshot's UI position.

| Concept ID | Exact PNG filename | Full storyboard heading visible in the image | English concept name |
|---|---|---|---|
| **CONCEPT_01** | `ChatGPT Image Oct 15, 2026, 10_29_27 AM-1.png` | **1. CHIZIQ BO‘YLAB OCHILISH** | Line-Draw Reveal |
| **CONCEPT_02** | `ChatGPT Image Oct 15, 2026, 10_29_28 AM-2.png` | **2. BLOKMA-BLOK QURILISH** | Modular Assembly |
| **CONCEPT_03** | `ChatGPT Image Oct 15, 2026, 10_29_30 AM-3.png` | **3. NUQTA POP-UP VA SOFT BOUNCE** | Dot Pop-Up and Soft Bounce |
| **CONCEPT_04** | `ChatGPT Image Oct 15, 2026, 10_29_31 AM-4.png` | **4. YORUG‘LIK SWEEP VA PREMIUM FINISH** | Luminous Sweep and Premium Finish |

### Recommended local workspace layout

Place **this Markdown file** in your project root and place the four PNGs in a `references/` directory, retaining their filenames exactly:

```text
my-ilbi-motion-project/
├── ILBI_UZ_Professional_Animation_Prompts_for_Codex.md
├── references/
│   ├── ChatGPT Image Oct 15, 2026, 10_29_27 AM-1.png
│   ├── ChatGPT Image Oct 15, 2026, 10_29_28 AM-2.png
│   ├── ChatGPT Image Oct 15, 2026, 10_29_30 AM-3.png
│   └── ChatGPT Image Oct 15, 2026, 10_29_31 AM-4.png
└── [existing application files, or new ones created by Codex]
```

All four source sheets are 1672 × 941 pixels. Each is a **five-step storyboard**, not an animation frame strip to display to end users. The **rightmost fifth panel** in each sheet shows the intended completed ILBI.UZ logo lockup. Earlier panels are visual explanations of how to reach that final state.

### What the finished animation must look like

- Animate the **actual ILBI.UZ logo** against a clean white or extremely pale cool-white background. The logomark combines a dark, rounded lowercase-`i`-like left shape and its circular dot, a tall electric-blue curved central ribbon/stroke, and a dark rounded lowercase-`b`-like right shape. Below is the lowercase **`ilbi.uz`** wordmark with a **blue punctuation dot**. Treat these as identifiable brand components, not replaceable generic letters.
- **Use panel 5 of the corresponding reference as the final visual truth.** Preserve the logo proportions, spatial relationships, alignment, blue/ink color balance, relative wordmark size, and clean modern brand aesthetic. Inspect the source carefully; do not assume standard text glyphs will reproduce the custom monogram.
- **The animation itself must be the only exported content.** Do not include storyboard titles, arrows, numbered circles, explanatory cards, labels, lightbulb icons, UI controls, timeline lines, or five simultaneous panels in the final video.
- The four concepts are **alternatives**, each with its own reveal mechanism. They should share a consistent final branded logo but **must not collapse into one generic fade-and-scale animation**.

### How to direct Codex

For **one** animation, tell Codex:

> Read `ILBI_UZ_Professional_Animation_Prompts_for_Codex.md`, inspect the PNG identified as `CONCEPT_01` in `references/`, and implement only `CONCEPT_01` exactly as specified. Complete the code, run the build, and report the resulting paths. Do not implement the other concepts yet.

Replace `CONCEPT_01` with `CONCEPT_02`, `CONCEPT_03`, or `CONCEPT_04` as needed.

For **all four in one project**, tell Codex:

> Read the entire `ILBI_UZ_Professional_Animation_Prompts_for_Codex.md` file and inspect all four exact PNG references in `references/`. Implement `CONCEPT_01` through `CONCEPT_04` as four separate animation modules using one shared, accurate ILBI.UZ vector logo. Provide a gallery to select each concept, deterministic replay/seek controls, clean production captures and an MP4 export workflow if the environment supports it. Follow every concept's individual timeline and acceptance criteria. Do not turn the storyboards into slides or change the brand logo between concepts.

---

# CONCEPT_01 — LINE-DRAW REVEAL

**Reference identification (exact):**

- **Concept identifier:** `CONCEPT_01`
- **Original PNG filename:** `ChatGPT Image Oct 15, 2026, 10_29_27 AM-1.png`
- **Relative reference path:** `references/ChatGPT Image Oct 15, 2026, 10_29_27 AM-1.png`
- **Full visible storyboard title:** `1. CHIZIQ BO‘YLAB OCHILISH`
- **English name:** `Line-Draw Reveal — A Single Stroke Becomes the Complete ILBI.UZ Brand`
- **Final frame to match:** **Panel 5** of this exact PNG (fully assembled ILBI.UZ logo).

## COPY-PASTE CODEX PROMPT — CONCEPT_01

You are a **principal motion designer, SVG animation engineer, and senior frontend developer**. Build a fully functioning, premium, code-driven ILBI.UZ logo reveal based on the exact local reference image:

`references/ChatGPT Image Oct 15, 2026, 10_29_27 AM-1.png`

The corresponding storyboard heading is **“1. CHIZIQ BO‘YLAB OCHILISH” (Line-Draw Reveal)**. Visually inspect all five storyboard panels, especially the final panel, before writing animation code. Your job is to **implement the actual animation**—not to recreate the presentation sheet, arrange static frames, produce a descriptive animation plan, or animate the source PNG as one flattened layer.

### A. Creative direction and fidelity

Build a minimalist high-end product identity animation in which **one thin, luminous vertical blue line gradually develops into the signature curved blue monogram element, attracts/reveals the surrounding black geometric forms, and finally resolves into the exact ILBI.UZ logo and wordmark**.

The visual language must be precise, restrained, credible, modern, and suitable for a product-launch keynote, software product intro, ERP/POS commercial, mobile-app splash screen, or corporate presentation. Use a pure white or extremely light cool-white background. Build the logo as separate editable vectors/layers. Preserve the custom blue ribbon's curved lower tip and do not mistake it for a conventional sans-serif letter `l`. The target logo is the **ILBI.UZ logo in the screenshot**, not a generic `ib` text treatment.

First check the repository for an original ILBI.UZ SVG/logo asset. If it exists, use its official shapes. If none exists, accurately reconstruct a clean scalable SVG from the final storyboard panel, separating at minimum: dark `i` dot, dark `i` stem, electric-blue central ribbon, dark rounded `b` bowl, the individual `ilbi.uz` wordmark characters, and the small brand-blue punctuation dot. You may crop the screenshot for **analysis**, but **never use a flattened crop or the full source sheet as the visible animated logo**. Avoid approximate system-font substitutions for custom geometry; when necessary, create outlined SVG glyphs or carefully controlled vector paths. Match colors visually to the supplied PNG; a likely starting palette is dark ink `#111827`, vivid blue `#006BFF`, pale blue glow `#7BD6FF`, and warm white `#FFFFFF`, but the actual screenshot is the authority.

### B. Five-beat animation choreography — required

Set the **primary timeline to 5.2 seconds at a 60 fps design target**, including its final hold. Use named timeline labels for all five beats so they are easy to review. Exact timestamps may be shifted by no more than approximately 100 ms to maintain smooth overlaps, but preserve the order and storytelling.

| Time | Required animated event | Motion details |
|---|---|---|
| **0.00–0.30 s** | **Empty opening / visual anticipation** | Clean uncluttered white canvas. No logo, no captions, no navigation. Prepare stroke drawing without an abrupt pop. |
| **0.30–1.08 s** | **Beat 1 — Blue line appears** | A slender electric-blue vertical line is progressively drawn in the central logo position. Use a stroke reveal/animated SVG dash or clip mask. Smooth rounded stroke caps. The stroke should feel written into existence, not scaled from a blurry bitmap. |
| **1.08–1.85 s** | **Beat 2 — Line becomes the signature curved ribbon** | The straight stroke elegantly develops into the full tall blue brand ribbon, including the smoothly curved lower-right terminal. Use a coherent SVG path reveal, a matched fill mask, or actual shape interpolation; do not use distortive non-uniform scaling that changes the final geometry. Add a subtle highlight running along the ribbon as its shape completes. |
| **1.70–2.65 s** | **Beat 3 — Monogram construction** | The charcoal left stem, circular top dot, and right curved `b` shape emerge around the blue ribbon through short masked reveals and tiny position offsets (roughly 8–22 px in a 1080p composition). Elements become fully registered in their final positions. Any scale overshoot must stay under about 3%. |
| **2.55–3.65 s** | **Beat 4 — Wordmark entrance** | Reveal `ilbi.uz` just beneath the monogram, with a smooth upward text entrance and restrained per-glyph staggering (~55–85 ms). Its baseline and final kerning must align perfectly with panel 5. The small separator dot should visibly finish in brand blue, optionally with a subtle 120–180 ms micro-pop. |
| **3.65–5.20 s** | **Beat 5 — Final identity / premium hold** | Complete the final optical alignment; reduce transient glow until all shapes are crisp; keep the finished logo stable and clearly legible for at least the final 1.0 second. No repeated bounce or distracting ongoing movement. |

### C. Animation mechanics

- Use **vector path reveal and masks** as the main storytelling devices. The blue element should grow in shape with visible continuity from line to fully filled ribbon. A literal hard cut from a thin line to the full logo is unacceptable.
- Use smooth controlled curves: `power2.out`, `power3.out`, and gentle `sine.inOut`-class motion or visually equivalent cubic Bézier easing. Any overlap is intentional. No aggressive elastic bounce in this concept.
- Keep the composition optically centered. The final logo lockup must occupy an appropriate portion of the frame without being tiny or oversized; ensure that the monogram and wordmark are visually balanced.
- Optionally add a gentle shadow or minimal cool-blue aura while constructing the logo, but fade excessive effects away before the final hold. The end result must look **premium, not neon gaming UI**.
- The background should remain clean. No camera rotations, 3D spins, particle explosions, text captions, or unrelated brand slogans.
- Animating the actual logo components is mandatory. A CSS `clip-path` wipe across the **whole screenshot** does not meet the requirement.

### D. Engineering implementation

1. **Inspect the existing repository first** and preserve its framework/build structure. If no app is present, create a lightweight Vite + TypeScript frontend using SVG and GSAP (or an equally deterministic timeline engine already in the project). Use no paid/proprietary GSAP plugins and no CDN/runtime network requests.
2. Implement this as a self-contained module (suggested location `src/motions/concept-01-line-reveal/`) and name the reusable component/export `LineDrawReveal`. If other concepts are already in the project, do not overwrite or regress them.
3. Separate **logo geometry and colors** from **animation choreography**, so the exact final logo can be shared with other concepts. Use semantic SVG element/group IDs or component references rather than brittle `nth-child` selectors.
4. Provide `play`, `pause`, `restart`, and deterministic `seek` controls; a `seek(0)` must exactly reproduce the initial state, and `seek(duration)` must exactly show the final state without waiting for runtime side effects.
5. Provide a responsive stage with a **16:9 primary preview** and correct logo scaling for **1:1 and 9:16**. Keep generous safe margins; never crop the logo.
6. Implement `prefers-reduced-motion`: users requesting reduced motion should see the complete static final logo without flashing, bouncing, or an extended reveal.
7. Keep demo controls outside the clean export area. The actual animation frame must contain **only** the centered brand animation.
8. Include an accessible replay button and keyboard-accessible controls in the preview; cleanly dispose of the animation timeline/listeners when its component unmounts.
9. Provide a reproducible export path: a 1920×1080, 60 fps MP4/H.264 output **if local browser capture/FFmpeg tools are available**. If not, still implement and document a reliable frame-capture/export script or command; do not claim the MP4 exists when it does not.

### E. Required deliverables and verification

- A running implementation of **only CONCEPT_01**, plus its integration into the existing application or a standalone preview route.
- Maintainable source code, a brief README with launch commands, and deterministic replay/seek controls.
- A clear export filename if video rendering is supported: `ilbi-concept-01-line-draw-reveal.mp4`.
- Inspect at least five checkpoints: initial empty canvas, blue line fully drawn, blue curved ribbon constructed, complete monogram with rising wordmark, and final static logo. Create representative screenshot captures when browser automation is available.
- Run the existing project test/build commands (or create and run `npm run build` for a new Vite project). Fix errors rather than leaving a nonfunctional prototype.

**Acceptance criteria:** The animation begins as a thin vertical blue stroke, **continuously becomes** the correct curved blue logo form, reveals the surrounding dark monogram shapes, introduces the exact `ilbi.uz` wordmark, and ends with a sharp, stable logo visually consistent with **panel 5 of `ChatGPT Image Oct 15, 2026, 10_29_27 AM-1.png`**. No storyboard cards or explanatory typography may appear in the exported frame.

**END OF CONCEPT_01 PROMPT**

---

# CONCEPT_02 — MODULAR ASSEMBLY

**Reference identification (exact):**

- **Concept identifier:** `CONCEPT_02`
- **Original PNG filename:** `ChatGPT Image Oct 15, 2026, 10_29_28 AM-2.png`
- **Relative reference path:** `references/ChatGPT Image Oct 15, 2026, 10_29_28 AM-2.png`
- **Full visible storyboard title:** `2. BLOKMA-BLOK QURILISH`
- **English name:** `Modular Assembly — Independent Brand Elements Form One Precise Lockup`
- **Final frame to match:** **Panel 5** of this exact PNG (assembled monogram and `ilbi.uz` wordmark).

## COPY-PASTE CODEX PROMPT — CONCEPT_02

Act as a **lead brand-motion director, senior interaction engineer, and precision SVG compositor**. Produce a complete, professional, timeline-controlled ILBI.UZ logo animation corresponding to the exact screenshot:

`references/ChatGPT Image Oct 15, 2026, 10_29_28 AM-2.png`

The title printed on the source is **“2. BLOKMA-BLOK QURILISH” (Modular Assembly)**. Analyze the five reference panels individually. Implement a **real animation of separate geometric brand components moving into a single identity**. Do not merely fade in a finished logo. Do not show the sheet, its step numbers, arrows, captions, icons, or five static panels to the viewer.

### A. Creative concept

This is a **technology-brand construction sequence**, with precise kinetic alignment and a visual metaphor of modules forming a unified system. At first, the logo's parts are clearly separated: the dark circular `i` dot, the dark lowercase-`i` stem, the blue curved/tall central monogram stroke, the dark `b`-shaped right bowl, and the letterforms of `ilbi.uz` below. They move toward their exact destination positions, locking into one seamless geometric monogram. The wordmark then resolves character by character into its final compact typography.

The motion must feel **engineered, balanced, intelligent, and premium**, evoking organized systems, ERP software, infrastructure, or an enterprise platform. Use small controlled travel distances, precise timing, restrained easing, and a satisfying visual snap **without cartoony ricochets**.

Match the source brand faithfully. Inspect the original repo for official ILBI.UZ logo assets first. If none exist, reconstruct separate SVG paths from the fifth panel of the reference: the black `i` dot and stem, the blue ribbon with its smoothly curved bottom terminal, the black `b` component, and the custom wordmark. The blue ribbon must retain its brand-specific geometry. Preserve the dot in `ilbi.uz` as blue. Use a neutral white/light-cool background. Approximate palette only when needed: ink `#111827`, cobalt/electric blue near `#006BFF`–`#008FFF`, white `#FFFFFF`. Prefer actual sampled reference colors over guessed values.

### B. Mandatory five-stage timing

**Total production duration: approximately 5.1 seconds, including at least 1.0 second of final stillness.** Make a deterministic timeline with named stages and visible overlap rather than abrupt edits.

| Time | Stage from the supplied storyboard | Visual implementation requirement |
|---|---|---|
| **0.00–0.55 s** | **Beat 1 — Elementlar / Separated elements** | The monogram pieces become visible in a purposefully disassembled arrangement matching panel 1. Keep their orientations recognizable: dark dot above-left, dark stem left, blue tall curved component center-ish, dark rounded bowl to the right. Below, the wordmark's individual glyphs may be shown as subtly staged, widely spaced pieces. Avoid random scatter or chaos. |
| **0.55–1.65 s** | **Beat 2 — Yaqinlashish / Inward movement** | Draw components inward along short, controlled paths. The dark stem approaches its final x-position from slightly left, the dark bowl from right, and the blue ribbon settles precisely between/over the relevant dark forms. The dot approaches its circular `i` position. Stagger by ~70–130 ms. Use mild acceleration followed by graceful deceleration, with *no visible collision artifacts*. |
| **1.60–2.25 s** | **Beat 3 — Monogram yig‘ilishi / Monogram lock** | All upper logo components finish aligning and read instantly as the recognizable `ib` brand mark. A subtle 2–3 px last adjustment or micro-scale settle is acceptable; actual gaps/overlap edges must match panel 5 exactly. The monogram itself should now remain stable. |
| **2.25–3.65 s** | **Beat 4 — Matn terilishi / Sequential wordmark build** | Resolve `ilbi.uz` beneath the monogram from individual vector letters. Reveal them **left to right**, 65–110 ms apart, with 14–26 px upward movement and opacity transition. If a widely spaced ghost wordmark was visible earlier, smoothly transition its glyphs into their final kerning rather than creating a duplicate row of text. The punctuation dot resolves in brand blue. |
| **3.65–5.10 s** | **Beat 5 — Yakun / Final logo** | All components lock into a single crisp, final brand composition. Remove assembly aids, arrows, guide lines, stray silhouettes, and transient glow. Hold still long enough to read the brand comfortably. |

### C. Physical motion principles

1. **Use true independent elements**, not a single bitmap with an opacity tween. Each major monogram part should have its own transform and opacity/clip control. Letter-by-letter text should be independently controllable or revealed by an equivalent glyph mask.
2. Avoid arbitrary random motion. Origins should be derived from the first storyboard panel and all destination coordinates should come from the fifth panel.
3. Use intentional dynamic hierarchy: blue ribbon is the most visually salient module; black modules arrive with measured stagger; the wordmark arrives after the monogram's geometry is complete.
4. Apply soft `power3.out` / smooth cubic-Bezier easing on assembly travel. If adding overshoot, cap it to a tiny, almost imperceptible final positional correction (2–4 px at 1080p). Do not apply large-scale spring wobble, shake, elastic snapping, 3D tumbles, or explosions.
5. The black dot is part of the monogram; the small blue dot in the lower wordmark is a separate brand detail. Keep these roles visually distinct.
6. The final silhouette and kerning must be **pixel-consistent** with the reference. Do not leave components slightly misaligned for the sake of motion dynamics.
7. Maintain a quiet, bright studio aesthetic. Shadows may provide minimal separation, but there must be no dark background, metallic chrome effect, particle field, or novelty transition.

### D. Implementation requirements

- Inspect the existing codebase and reuse its framework. If starting from an empty directory, build a small Vite + TypeScript application with SVG + GSAP or an existing timeline engine with equivalent capabilities; avoid proprietary plugins, external image-fetching APIs, and CDN-only runtime dependencies.
- Implement a distinct animation component/module, preferably `src/motions/concept-02-modular-assembly/`, exported as `ModularAssembly`. Do not overwrite concept 01 or any other existing implementation.
- Use one source of truth for **final logo geometry** and component destination transforms. When multiple concepts share a project, reuse the exact same logo proportions and vector asset rather than approximating it differently each time.
- Define timeline labels such as `parts`, `approach`, `monogramLocked`, `wordmark`, and `finalHold` and expose `play()`, `pause()`, `restart()`, and deterministic `seek(timeOrNormalizedProgress)`.
- Work in a fixed SVG viewBox / logical coordinate system, scaling proportionally to responsive 16:9, 1:1, and 9:16 layouts without deforming the monogram or cropping the wordmark.
- Keep player UI outside the export composition. Final video frames must display the **logo only**.
- Support `prefers-reduced-motion`: skip motion and show the completed logo immediately.
- Use stable local assets and no external network calls during playback; ensure graceful unmount cleanup and no duplicated timeline on replay.
- Offer a clean, reproducible 1920×1080 / 60 fps MP4 rendering/export method if supported by local Chromium/Playwright and FFmpeg; otherwise implement/document frame export without pretending a video already exists.

### E. Verification and output

1. Build/run the project and fix actual errors.
2. Verify that the initial separated parts match **panel 1**, the inward motion resembles **panel 2**, the assembled logo structure resembles **panel 3**, the wordmark enters as in **panel 4**, and the **final pixels/proportions match panel 5**.
3. Inspect midpoint screenshots for unintended overlaps, disappearing shapes, unstable kerning, cloned text, and unwanted motion outside the frame.
4. Deliver organized code, preview integration/route, controls, and concise launch/export instructions.
5. If MP4 export is available, use filename `ilbi-concept-02-modular-assembly.mp4`.

**Acceptance criteria:** A distinctly modular animation that starts with separate ILBI.UZ parts, brings them together in physically consistent motion, assembles a crisp black-and-blue monogram, resolves the wordmark one glyph at a time, and finishes on the precise identity shown in **panel 5 of `ChatGPT Image Oct 15, 2026, 10_29_28 AM-2.png`**. It must not be visually interchangeable with the line-draw, dot-bounce, or light-sweep concepts.

**END OF CONCEPT_02 PROMPT**

---

# CONCEPT_03 — DOT POP-UP AND SOFT BOUNCE

**Reference identification (exact):**

- **Concept identifier:** `CONCEPT_03`
- **Original PNG filename:** `ChatGPT Image Oct 15, 2026, 10_29_30 AM-3.png`
- **Relative reference path:** `references/ChatGPT Image Oct 15, 2026, 10_29_30 AM-3.png`
- **Full visible storyboard title:** `3. NUQTA POP-UP VA SOFT BOUNCE`
- **English name:** `Dot Pop-Up & Soft Bounce — From One Blue Point to a Full Brand`
- **Final frame to match:** **Panel 5** of this exact PNG (complete logo, subtle transient bounce-wave suggestion).

## COPY-PASTE CODEX PROMPT — CONCEPT_03

Work as a **senior character-motion animator, interaction designer, frontend animation specialist, and SVG engineer**. Create a **finished, production-ready**, digitally rendered ILBI.UZ logo animation from this exact screenshot:

`references/ChatGPT Image Oct 15, 2026, 10_29_30 AM-3.png`

Its storyboard title is **“3. NUQTA POP-UP VA SOFT BOUNCE” (Dot Pop-Up & Soft Bounce)**. Follow its five visual beats faithfully. This concept is **friendly, lively, polished, and memorable**, with a small blue dot as the main protagonist. It must remain appropriate for a modern SaaS platform, mobile application splash, or short logo bumper, so the animation should be expressive without looking childish.

**Do not animate the entire screenshot, simulate a presentation slide, or simply crossfade five pre-rendered panels.** Build a true component-based logo reveal with an animated blue dot, independent monogram components, and a separately animated wordmark.

### A. Core visual narrative

Start on a pure white/light-cool canvas. A saturated electric-blue circular dot appears close to the bottom center with a soft oval contact shadow. The dot performs **one playful, physically coherent upward jump**, accompanied by a restrained squash-and-stretch and subtle motion-trail echoes. At the top of its arc, its energy initiates/reveals the brand's black-and-blue monogram. The `ilbi.uz` wordmark rises from below into its exact position. The whole lockup settles with a **soft, damped micro-bounce** and extremely subtle ripple accents that fade out before the last steady brand hold.

The initial blue dot is a visual **seed of the identity**: connect the jump to the activation of the blue ribbon and the eventual blue punctuation dot in the wordmark. Do not leave an unexplained extra blue ball floating beside the final logo. The black dot over the left monogram stem is a separate black brand element; do not arbitrarily recolor it blue in the completed logo.

Reconstruct/obtain the actual logo geometry first: dark left circle + stem, tall curved blue central ribbon, dark right bowl, and `ilbi.uz` in the custom compact wordmark with its small blue punctuation dot. Search for existing official SVG/transparent logo assets in the repo before recreating vectors. If none exist, reproduce the fifth reference panel as scalable SVG groups. The final product is **not** a screenshot crop. Match the screenshot colors, placement, curves, letterforms, and vertical gap between monogram and wordmark.

### B. Five-beat animation timing

Use an explicit **5.1-second deterministic timeline**, targeting 60 fps. Time progression must be designed and seekable, not driven by uncontrolled CSS loops or random intervals.

| Time | Reference beat | Exact required behavior |
|---|---|---|
| **0.00–0.55 s** | **Beat 1 — Nuqta chiqishi / Dot emergence** | A blue circle approximately proportional to the screenshot pops in near the lower center. Fade/scale it from ~0.55 to 1.0 in about 200–300 ms. Add a small diffuse elliptical ground shadow directly below it; keep the canvas otherwise empty. |
| **0.55–1.45 s** | **Beat 2 — Sakrash / Jump** | The dot jumps vertically in a smooth arc. Create a brief anticipation squash (~scaleX 1.15, scaleY 0.85), rapid lift, slight stretch while rising, deceleration near apex, and a tiny settling action. Show at most one or two very faint transient dot echoes/motion trails as in panel 2—**not** three permanent dots. Shadow softens and narrows/changes opacity consistently with jump height. |
| **1.35–2.50 s** | **Beat 3 — Belgi paydo bo‘lishi / Brand-mark reveal** | At or just after the apex, the dot releases a restrained blue energy cue that activates the tall curved blue ribbon. Reveal the dark `i` dot/stem and dark `b` bowl with elegant masks and subtle opacity/scale. The upper monogram must coalesce into the exact final geometry and not look like randomly spawned letters. The initial solo dot disappears/morphs/rejoins the brand in a visibly motivated way; no extra object remains. |
| **2.45–3.40 s** | **Beat 4 — Matn ko‘tarilishi / Wordmark rises** | Bring the `ilbi.uz` wordmark upward from ~20–35 px below its destination, with a controlled opacity transition and **one small spring-like overshoot** (~3–7 px). The blue punctuation dot may finish a fraction later with a pleasant micro-pop. Use the exact final letter spacing, size, and baseline of panel 5. |
| **3.40–5.10 s** | **Beat 5 — Yakuniy lockup / Soft bounce + settled hold** | Finish with a brief damped 1–2-cycle micro-settle of the entire lockup (roughly 3–6 px maximum displacement in a 1080p frame). Optionally create very thin, low-opacity blue side arcs/ripples around the logo, matching the idea shown in panel 5; these must fade in under ~400 ms. Hold the logo perfectly still and fully readable for the final ~1.0 s. |

### C. High-level motion craft

- The jump must have perceptible **weight and gravity**. Distinguish the impulse, fast upward travel, easing near the apex, and soft settlement. Use meaningful easing curves and velocity continuity rather than linear vertical translation.
- Carefully synchronize squash-and-stretch with the dot's motion; never turn the circle into a long cartoon capsule. Keep the dot geometrically circular at rest and at the end.
- Keep bounce amplitude small and rapidly damped. A single deliberate bounce is preferable to endless repetition. The animation should feel polished at both 24 fps and 60 fps.
- Use the blue dot as the only initially visible brand object. Black monogram parts should appear **after** the jump initiates the reveal, not prematurely at the start.
- Avoid glowing particle clouds, spark explosions, repeated spring oscillations, screen shakes, strobe effects, and large cinematic flares. The screenshot communicates **playful sophistication**, not arcade-style animation.
- Use a small coherent soft shadow under the dot during the first two beats, and remove it or convert it gracefully to an optional subtle logo shadow when the full brand lockup forms. No “floor” line is required.
- Avoid accidental color drift: dark elements stay dark, the central ribbon stays vivid blue, and the final small dot in `ilbi.uz` is blue.
- The exact final logo needs sufficient still time to be easily read. Never leave perpetual bouncing or perpetual pulsation on by default.

### D. Production implementation

1. Inspect the current repo before changing files. Preserve its existing stack; if new, create a lean Vite + TypeScript project with scalable SVG graphics and GSAP or another deterministic timeline animation solution.
2. Create an isolated module, preferably `src/motions/concept-03-dot-soft-bounce/`, exporting `DotSoftBounce`. Keep existing concepts and shared components intact.
3. Construct the central logo from separately addressable vectors/components. Use a named `seedDot` instance, separate monogram elements, separate punctuation dot, a controlled shadow layer, and short-lived bounce/ripple layers. Do not duplicate visible dots in the last frame.
4. Implement independently seekable labeled animation phases: `dotAppear`, `jump`, `brandReveal`, `wordmarkLift`, and `softLockup`.
5. Support play, pause, replay, deterministic time seek (including scrubbing backwards), and stable restart without broken shadow opacity or orphaned ripple nodes.
6. Provide a clean export target with centered composition, primary 1920×1080 landscape rendering, and responsive 1:1/9:16 layouts. Ensure no logo cropping and preserve the exact monogram-to-wordmark proportions.
7. Respect `prefers-reduced-motion` with an immediate static completed logo; disable bounce and ripple in that mode.
8. Keep player controls and labels out of rendered video output. No source-sheet decorations should be visible.
9. Implement a reproducible MP4 export pipeline at 60 fps using available local screenshot capture and FFmpeg tools where possible. If tools are not present, provide working instructions/scripts rather than promising a nonexistent file.
10. Avoid paid plugins, CDN dependencies, runtime network loading, or any reliance on server-based video generation. Everything should run locally in a browser.

### E. QA checklist and expected output

- At 0.4 s, there should be **only one primary blue dot and its soft shadow**.
- At 1.0 s, the dot should visibly be mid-jump, not simply fading or teleporting.
- Around 2.1 s, the recognizable black-and-blue monogram should be forming in direct response to the dot's motion.
- Around 3.0 s, the lowercase wordmark should be **rising into position**, not abruptly appearing fully formed.
- At the final timestamp, there must be **one exact, clear ILBI.UZ lockup**, no leftover standalone dot/trail/arcs, no shadow glitch, and no ongoing bounce.
- Run the build, review screenshots/keyframes when practical, and repair all visible and technical failures.
- Report source path, preview command/route, and export workflow. Preferred video name: `ilbi-concept-03-dot-pop-up-soft-bounce.mp4`.

**Acceptance criteria:** The viewer first sees a single blue dot, then a believable lighthearted jump, then the emergence of the monogram, followed by the upward settling `ilbi.uz` wordmark, and finally a pleasant, steady final logo reflecting **panel 5 of `ChatGPT Image Oct 15, 2026, 10_29_30 AM-3.png`**. This must be the distinctly **playful** alternative among the four concepts, while preserving brand sophistication.

**END OF CONCEPT_03 PROMPT**

---

# CONCEPT_04 — LUMINOUS SWEEP AND PREMIUM FINISH

**Reference identification (exact):**

- **Concept identifier:** `CONCEPT_04`
- **Original PNG filename:** `ChatGPT Image Oct 15, 2026, 10_29_31 AM-4.png`
- **Relative reference path:** `references/ChatGPT Image Oct 15, 2026, 10_29_31 AM-4.png`
- **Full visible storyboard title:** `4. YORUG‘LIK SWEEP VA PREMIUM FINISH`
- **English name:** `Luminous Sweep & Premium Finish — A Single Light Pass Polishes the Logo`
- **Final frame to match:** **Panel 5** of this exact PNG (fully lit, clean, high-contrast ILBI.UZ logo with subtle blue finish).

## COPY-PASTE CODEX PROMPT — CONCEPT_04

Take the role of an **award-level brand-motion artist, high-end lighting/compositing engineer, and senior SVG/Canvas frontend developer**. Implement a **real, polished, deterministic logo animation** based precisely on this local visual reference:

`references/ChatGPT Image Oct 15, 2026, 10_29_31 AM-4.png`

The screenshot heading is **“4. YORUG‘LIK SWEEP VA PREMIUM FINISH” (Luminous Sweep and Premium Finish)**. Review the five storyboard panels and use the final one as the finishing target. This is a **lighting-driven premium reveal**: unlike the other three concepts, the ILBI.UZ logo is present from the outset, but initially appears slightly subdued; an elegant blue-white lighting sweep enters from the left, passes across the logo, reveals/richly saturates the blue ribbon, and leaves the lockup perfectly clear and confident.

**Produce the actual logo animation, not a slide show or horizontal movement of the original reference image.** Do not include title text, numbered story cards, directional arrows, or extra branding outside of `ilbi.uz` in the clean output.

### A. Visual/art-direction requirements

Make the sequence feel like a **precision studio product shot** with the restraint of a premium global technology brand. Keep the background pure white to extremely pale ice-white, with only a controlled, diffuse blue illumination near the logo. The dark logo elements should be deep charcoal/near-black, with a rich cobalt-to-electric-blue curved central element. The wordmark `ilbi.uz` sits immediately below as shown in the source, including its small blue dot.

A crucial technical distinction: the light sweep must **interact with the actual SVG silhouette of the logo**. Use a moving gradient mask, custom clip path, overlay, or equivalent compositing approach to create realistic specular illumination on the blue ribbon and subtle edge highlights on the dark forms. There may also be a soft external glow, but a broad transparent blue rectangle passing over a static screenshot is **not enough**. The logo needs an identifiable before/after difference in contrast, blue richness, clarity, and premium finish.

Search for existing official logo vector assets in the repository; if found, reuse them. Otherwise reconstruct the component vectors carefully from the fifth reference panel (dark `i` dot and stem, signature blue ribbon with curved lower tip, dark `b` bowl, and custom wordmark). Do not rebuild with plain `ib` text or animate a crop of the story sheet. Use raster imagery only as a comparison reference. Start with sampled reference colors, using approximate fallback ink `#111827`, luminous blue `#006BFF` to `#00A2FF`, ice highlight `#B8EEFF`, and white `#FFFFFF` if needed.

### B. Mandatory five-beat sweep timeline

Produce a **5.0-second** sequence targeting **60 fps** with at least **1.0 second of final clean brand hold**. Use a single clearly readable primary sweep: left to right, consistent speed profile, no gratuitous flashes or back-and-forth loop.

| Time | Reference stage | Detailed production choreography |
|---|---|---|
| **0.00–0.60 s** | **Beat 1 — Xira boshlanish / Soft initial state** | Display the complete ILBI.UZ logo from the beginning, but slightly muted: about 70–85% of its final perceived contrast/saturation. It must still be readable and correctly positioned. Avoid heavy blur or opacity so low that it appears absent. |
| **0.60–1.40 s** | **Beat 2 — Yorug‘lik kirishi / Light enters from left** | A crisp, narrow cool-blue/white highlight enters from offscreen left, accompanied by a much wider soft blue glow. The luminous core starts sweeping across the `ilbi.uz` logo composition. A subtle diffused reflection may appear in the background but should never obscure the wordmark. |
| **1.40–2.45 s** | **Beat 3 — Sweep effekti / Sweep crosses the logo** | The brilliant focal point travels across the black left element, then the signature blue ribbon (the brightest premium moment), and across the dark right bowl. Use vector-masked highlights to respect the exact boundaries of logo shapes. Allow transient blue bloom/glow on the curved ribbon and a soft horizontal streak aligned with the sweeping light. Retain enough detail to read all letters. |
| **2.45–3.35 s** | **Beat 4 — To‘liq ochilish / Light exits right** | The light core moves out beyond the right edge of the logo. Its trailing blue haze decays smoothly over ~250–450 ms. All parts settle into their final dark/blue values; the monogram and wordmark are now bright, clear, and high contrast. No hard cut should mark the exit. |
| **3.35–5.00 s** | **Beat 5 — Premium hold / Final brand** | Hold the finished logo with excellent sharpness and optical balance. If useful, execute only **one tiny blue punctuation-dot pulse** or a barely perceptible soft-underlight breathing effect early in this phase; it must resolve completely, and the final ~1.0 second must be still. No perpetual glow loop or flicker. |

### C. Lighting and compositing specification

- Create at least two coordinated sweep layers: **(1) a tight specular highlight core** and **(2) a broad, low-opacity luminous falloff**. Tie them to the same deterministic sweep position.
- Mask part of the highlight by the exact logo contours so the illumination appears to **travel across the surface of the brand**, not merely across empty background. Keep any environmental glow extremely soft.
- Use gradients and/or Gaussian blurs moderately. Avoid excessive SVG filter regions, poor GPU behavior, huge drop shadows, heavy chromatic aberration, lens dirt, film noise, or overexposure.
- The strongest brightness should occur over the middle blue ribbon while still preserving its lower curved terminal. Black shapes may show a tasteful blue rim highlight during the sweep but must **return to charcoal** in the final frame.
- Keep the sweep primarily horizontal from left to right, with the bright leading edge moving cleanly across the composition. Very slight vertical shaping of the streak is acceptable; diagonal dramatic laser beams are not.
- Use smooth `sine.inOut` / `power2.inOut`-quality easing, allowing the sweep to enter confidently, move at visually stable speed through the logo, and decelerate imperceptibly as it exits.
- Avoid strobe-like flashing: no full-frame white flashes, no abrupt brightness inversion, no multiple high-frequency pulses, no infinite glowing/rotating effects.
- The finished logo's baseline, wordmark width, and internal spacing must match **panel 5 exactly**. Lighting must never distort or reflow the geometry.

### D. Implementation and reproducibility

1. Inspect current code and use its existing framework. If no project exists, create a maintainable Vite + TypeScript frontend. Use layered SVG gradients/masks/filters plus GSAP or an equally deterministic engine; Canvas/WebGL is permitted only if it improves compositing and still supports frame-exact seek/export.
2. Add a separate concept module (suggested `src/motions/concept-04-luminous-sweep/`) exported as `LuminousSweep`. Preserve existing concept modules and keep a shared final logo asset/component.
3. Make the sweep position, intensity, glow spread, and base-to-final saturation explicit named parameters rather than hidden magic values. Avoid directly manipulating one giant flattened raster.
4. Provide a single seekable timeline with labeled stages `dimStart`, `sweepEnter`, `crossLogo`, `sweepExit`, and `premiumHold` and expose play, pause, replay, restart, and reliable time/progress seeking.
5. Ensure that `seek(0)` displays the subdued but full logo, and `seek(end)` displays a sharp fully lit final logo **without** lingering transient flare or filter residue.
6. Present the animation in a responsive centered composition at 16:9, 1:1, and 9:16. Prefer 1920×1080, 60 fps for initial video export. Fit the whole logo into safe margins; no stretched SVG or cropped wordmark.
7. Implement `prefers-reduced-motion` by showing the completely lit static logo immediately, with no moving beam or pulsing effect.
8. Make animation rendering deterministic across replay and frame capture. Clean up requestAnimationFrame hooks/GSAP timelines and avoid rerender flicker when resizing.
9. Keep preview controls out of the export-only canvas. Avoid all runtime CDN/API fetching; local setup must be sufficient.
10. Supply a reproducible export method using local browser frame capture and FFmpeg to make H.264 MP4 if those tools are available. If not, document exactly how to export and do not falsely report a rendered file.

### E. Required validation

- Compare the **start** with panel 1: logo already present, muted but visible.
- Compare **left entry** with panel 2: blue-white light approaching from the left.
- Compare **middle sweep** with panel 3: peak luminous activation across the blue central curve.
- Compare **right exit** with panel 4: light departs and the logo resolves into full contrast.
- Compare **final hold** with panel 5: accurate dark+blue logo, clear `ilbi.uz` wordmark, clean white/light background, no residual streak across the text.
- Test 60 fps playback and deterministic seeking. Ensure that soft filters do not cause unintended clipping at the SVG bounds, especially around the blue curve.
- Build successfully; deliver source paths, preview instructions, and export instructions. If export succeeds, name it `ilbi-concept-04-luminous-sweep-premium-finish.mp4`.

**Acceptance criteria:** One sophisticated blue-white light pass travels left to right across an initially subdued but already assembled ILBI.UZ logo, transiently enriches the central blue element, exits cleanly, and leaves the **exact bright final logo from panel 5 of `ChatGPT Image Oct 15, 2026, 10_29_31 AM-4.png`**. This concept must feel more restrained and luxurious than the other three.

**END OF CONCEPT_04 PROMPT**

---

## Shared acceptance checklist when implementing all four together

The following is a **final quality gate**, not a fifth animation prompt.

| Test | CONCEPT_01 | CONCEPT_02 | CONCEPT_03 | CONCEPT_04 |
|---|---|---|---|---|
| Exact screenshot identified | `...10_29_27 AM-1.png` | `...10_29_28 AM-2.png` | `...10_29_30 AM-3.png` | `...10_29_31 AM-4.png` |
| Clearly different motion mechanism | Draw → form → text | Separate parts → assemble → text | Dot jump → mark → bounce | Dim logo → light sweep → bright logo |
| Initial state | Empty canvas | Separated logo modules | One blue dot | Full, muted logo |
| Final state | Exact ILBI.UZ logo | Same exact ILBI.UZ logo | Same exact ILBI.UZ logo | Same exact ILBI.UZ logo |
| No storyboard UI in output | Required | Required | Required | Required |
| Locally replayable and seekable | Required | Required | Required | Required |
| Build and final-frame QA | Required | Required | Required | Required |

### Strong recommendations for a combined project

- Create **one accurate shared `IlbiLogo` vector component** whose subparts are accessible to all four animations. Each concept may animate those parts differently, but the appearance at `seek(end)` must be equivalent across all variants.
- Provide four preview routes, tabs, or a gallery with the stable labels **01 Line-Draw**, **02 Modular Assembly**, **03 Dot Pop-Up**, and **04 Luminous Sweep**.
- Prefer a single `MotionPlayer` interface with consistent controls for pause, play, replay, progress scrub, and a clean export-only view. Maintain separate timing definitions so selecting one concept does not reset or contaminate another.
- If the logo asset is not available at sufficient vector fidelity, **state that limitation in the final report and explain whether it was reconstructed from the provided PNG**. Do not claim an exact official vector was recovered if it was not.
- Do not mark a task complete until you have actually executed an available build command and verified that the final lockup is correctly rendered with no console/runtime error.
- A successful source-code implementation is the minimum deliverable; MP4 exports are an additional deliverable **only if they were actually produced**.

**End of file.**
