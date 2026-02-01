# Fonts

Font configuration lives in **`frontend/app/assets/fonts.ts`**.

- **Geist Sans** (Vercel-style UI) and **Geist Mono** are loaded via `next/font/google` there.
- **Playfair Display** (serif) is used for hero/display text.
- **Cursive** (navbar “Sentinel”) uses the system cursive stack; no file needed.

After pull, run `npm install` and `npm run build` — fonts are fetched at build time from Google. No local files required unless you want offline/self-hosted fonts.

To use local `.woff2` files instead: add them here and update `app/assets/fonts.ts` to use `next/font/local` with paths to `/assets/fonts/YourFont.woff2`.
