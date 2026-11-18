# Crash Course: The Aviator Trap

A mobile-first, tap-to-play simulation of a crash game. It uses fake rands and no account. It is built to show how these games drain a balance and how the presentation keeps people tapping.

The banner on every screen says: **Simulation only. Fake money. Built to show how crash games trick you.**

This project is not a gambling product. It does not take deposits, and it does not link to betting sites. It is not affiliated with any crash-game operator.

## Run it

```bash
npm install
npm run dev
```

Open the URL printed by Next.js. Sound is synthesized in the browser. It stays silent until the first tap, and the Sound / Muted button remembers your choice on this device.

```bash
npm test
npm run lint
npm run build
```

`npm run build` writes a static site to `out/` for local hosting at the domain root.

## GitHub Pages

Project pages for a repository named `aviator-trap` are served from `/aviator-trap`.

```bash
npm run build:pages
```

`next build` always writes a static export (`output: "export"`, unoptimized images, `trailingSlash: true`). `npm run build:pages` also sets `GITHUB_PAGES=true`, which adds:

- `basePath` and `assetPrefix` of `/aviator-trap`

Pushing `main` runs `.github/workflows/deploy-pages.yml`, which builds with `npm run build:pages` and deploys the `out/` folder. In the repository settings, set Pages to deploy from GitHub Actions.

## What the simulation does

You start with R500 of fake money. Tap **BET**. A chart climbs and a multiplier rises. Tap **CASH OUT** before the crash. The crash point is chosen when you bet:

```text
crash = 0.97 / (1 − U)
```

`U` is a random number between 0 and 1. If the result is below 1.00x, the flight dies instantly. About 3 flights in 100 do that. Cashing out at any fixed multiplier returns about 97 cents per rand. The missing 3 cents is the house edge. Timing does not remove it.

**X-ray mode** (on by default) labels the machinery:

1. A house-edge meter: expected value of the current bet, the balance the formula wants, and the balance you actually have.
2. A fake feed of other players' big wins. X-ray stamps each row as fake and counts the losses the feed hides.
3. Near-miss callouts when a crash lands just after a cash-out you would have taken.
4. A loss-chasing detector. Raise the stake after a loss and it says: "You're chasing losses."
5. The illusion of control: the crash is already chosen, and the history strip does not predict the next flight.
6. Optional rigged onboarding: the first 8 flights are easier, then the real formula returns. That is a variable reward hook.
7. Session stats: time, rounds, total wagered, net result, and peak versus now.
8. Auto-simulate: 1,000 or 10,000 rounds at 1.50x, 2x, 10x, or martingale, with the balance charted toward zero.

When the fake bankroll is gone, or when you tap **What happened**, the page opens **What just happened to your mind**.

## Help

If gambling is hurting you or someone you know, the South African Responsible Gambling Foundation runs a free, confidential counselling line, 24 hours a day: **0800 006 008**.

https://responsiblegambling.org.za/contact-us-sargf/
