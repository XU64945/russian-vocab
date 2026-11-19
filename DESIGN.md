# СЛОВО Design System

## Overview

СЛОВО is a focused Russian vocabulary study room. The product should feel
calmer than a game and more alive than an admin dashboard: generous editorial
space, one commanding action per screen, and the Cyrillic word itself as the
primary visual object.

The core memory point is **“a Russian word on a clean study desk”**. A large
Literata word, precise transliteration, a quiet navy surface, and restrained
blue motion repeat across Today, learning, review and dictionary views.

Design mode: B, reference-creation. Babbel, Duolingo, LingQ, Memrise and Busuu
were studied for information hierarchy and learning-product patterns. Their
visual assets, layouts, copy and brand identities were not copied.

## Colors

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#f3f7fc` | App background |
| Surface | `#ffffff` | Primary cards and sheets |
| Mist | `#eff4f9` | Secondary controls and quiet grouping |
| Ink | `#10213a` | Primary text |
| Ink soft | `#536983` | Supporting text |
| Blue | `#2f6fdf` | Active controls and progress |
| Blue deep | `#174a8a` | Primary buttons and focus surfaces |
| Navy | `#103a6d` | Word-first learning surfaces |
| Blue soft | `#e7f0ff` | Selected states and quiet accents |
| Line | `#dfe8f3` | Dividers and control boundaries |
| Danger | `#d55a67` | Incorrect answers only |

Blue is a functional hierarchy color, not a decorative wash. Gradients are
limited to subtle depth cues; primary surfaces use flat, intentional color.

## Typography

- UI and Chinese display: Manrope Variable with CJK sans-serif fallback.
- Russian words and Russian editorial labels: Literata Variable.
- Cyrillic words use optical sizing, tabular numerals for metrics, and generous
  line height. CSS preserves Unicode combining accents such as `U+0301` even
  when the current corpus does not contain them.
- Body text uses 12–14px at normal density; secondary labels are no smaller
  than 9px in primary workflows.

## Layout

- Desktop: 236px rounded navy rail, 1180px maximum content width, 18–32px card
  gaps.
- Tablet: icon-only rail, one-column learning hierarchy and scrollable topic
  strips.
- Mobile: 16px page gutters, five-item bottom navigation with a slide-over More
  panel, 44px minimum touch controls and single-column learning content.
- The dashboard uses a dominant today-word surface and one secondary daily
  rhythm panel. Metric repetition is minimized.

## Elevation & Depth

- Cards use 1px blue-gray borders plus broad, low-opacity shadows.
- The today-word and learning pages may use a solid navy surface to increase
  word hierarchy without ornamental gradients.
- Drawers and dialogs use a blurred navy scrim and deep but soft shadow.
- Focus states use a three-pixel translucent blue ring.

## Shapes

- Cards: 18–28px radii.
- Controls: 12px for utility buttons, pill radii for filters and compact actions.
- Cyrillic word plates are allowed to use larger radii when they are the main
  subject of a page.
- Brand mark: asymmetric rounded square with the Cyrillic “С”.

## Components

### Navigation

Desktop navigation keeps all existing sections. Mobile exposes Today, Practice,
Library and Review directly; Favorites, Mistakes, Progress, Admin and Settings
live in the More slide-over. Active state is shape + contrast, not color alone.

### Word surface

The word is the largest element. Audio remains adjacent. Meaning, part of speech,
example translation, forms, synonyms and phrases follow in descending hierarchy.
Unicode stress marks render through the same Cyrillic font stack.

The Today word surface is a three-layer CSS coverflow deck rather than one card
whose copy changes in place. The active card stays in front while real previous
and next word cards remain visible as scaled, dimmed back layers. A successful
gesture promotes the adjacent card and demotes the former active card, so both
depth and content orientation match the direction of travel. The deck uses a
persistent React list keyed by word ID, transforms driven by CSS, and no extra
animation dependency. Pointer, touch, keyboard and button navigation share the
same active-index state.

### Answer controls

Choice cards never move on hover. Wrong selections remain visible in sequence,
turn into a readable error state and can be tapped to open their word detail.
Correct answers transition into the full learning page. Selection, error and
progress changes use short transform/opacity transitions and are disabled under
`prefers-reduced-motion`.

### Disclosure and metrics

Count-up metrics trigger once when visible. Review-method disclosures use
accessible `aria-expanded`/`aria-controls` relationships. Wordbook switching
uses a compact morphing surface with Escape and outside-click dismissal.

## Motion

- Page entry: 460ms fade/translate with a short blur clearance.
- Question entry: 400ms lateral reveal.
- Progress: numeric easing and width transitions, not looping decoration.
- Today-word border: one slow perimeter highlight, hidden for reduced motion.
- Today-word deck: 540–620ms coverflow promotion with opacity and depth changes;
  drag direction locks horizontally while vertical scrolling remains native.
- Drawers: 280–360ms cubic-bezier transitions; no hover lift on buttons.

## Do's and Don'ts

- Do protect reading space around Russian words and Chinese explanations.
- Do use one primary CTA per viewport.
- Do retain existing learning, synchronization, review and admin behaviors.
- Do keep incorrect feedback clearly accessible without inserting a separate
  parsing screen.
- Do not add decorative cards, charts, gradients or motion without a learning
  or navigation purpose.
- Do not translate or invent Cyrillic stress marks in vocabulary data.
- Do not change API contracts or storage shape for visual work.
