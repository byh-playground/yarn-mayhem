# Dependencies and source notices

No new license is assigned to the imported game by this migration. Existing source comments are retained.

- Matter.js 0.20.0, Liam Brummitt, MIT: https://github.com/liabru/matter-js/blob/0.20.0/LICENSE . Its CDN bundle retains the upstream license banner.
- Bloom GameKit v0.41.3, byh-playground: https://github.com/byh-playground/bloom-gamekit/tree/bb3f59614c8d4da8188a3ffdc2eff43314fabe5f . Runtime modules are loaded unchanged from the pinned v0.41.3 distribution (dist `c819a0b48fb650ee8222f7d5ea90a63a2b9306d1`), including their bundled dependency notices. `scripts/vendor/gamekit/pwa-build.mjs` is an unchanged copy of that distribution's `pwa-build.mjs` (SHA-256 pinned in `docs/gamekit-manifest.json`). This repository does not assign a new license to GameKit.
- `assets/pwa/share.svg` contains text outlines from Noto Serif KR (title) and Noto Sans KR (subtitle, brand line), © Google / Adobe, SIL Open Font License 1.1: https://openfontlicense.org . No font file is shipped.
- Yarn figures and effects are drawn by the imported game code. No replacement image or audio asset pack was introduced.

The original Library copy and metadata are retained privately; conversation text and temporary download URLs are not included in this repository.
