# ZeroGlare Continuity System

ZeroGlare is a browser-native static site for Coupyn Labs. The repository now has two runtime surfaces:

- a static landing page in `index.html`
- a hidden React overlay mounted into `#root` for the Parity Pendulum workspace
- a separate `/galaxy/` page for the Milky Way Mapping Engine

The landing page and the overlay share the same canonical scale and formatter contract through browser-safe ES modules under `src/`.

## Runtime Shape

- Hosting: GitHub Pages from the repository root
- Entry point: `index.html`
- Shared logic: `src/shared/*`
- React overlay: `src/pendulum/*`
- Landing-page DOM glue: `src/landing/*`
- Galaxy map surface: `galaxy/index.html` with `src/galaxy/*`

## What The App Does

- the landing page explains the concept and exposes the activation button
- the pendulum button reveals the React workspace and switches it into engine mode
- the static scale section uses the same scale-naming implementation as the React side
- formatter checks stay visible in the React overlay
- the "Explore the Milky Way" button opens the `/galaxy/` map page
- the `/galaxy/` page renders anchor stars first and can reveal a measured catalog layer
- the `/galaxy/` page can also reveal a generated inferred layer that stays labeled as model output
- the `/galaxy/` page includes source, distance, and magnitude filters plus a trust legend

## Notes

- No bundler or build step is required
- The app runs directly from the repository root
- The runtime is still intentionally static, but the logic is now modular instead of embedded in one blob
