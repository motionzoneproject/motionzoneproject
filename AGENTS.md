<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Bibliotek: läs dokumentationen först

När ett fel rör ett bibliotek (better-auth, Prisma, Next m.fl.): läs bibliotekets dokumentation och changelog för den installerade versionen, och fråga varför biblioteket självt inte hindrar felet, innan du bygger en lösning runt det. Behöver koden städa upp efter ett bibliotek är det ofta ett tecken på att biblioteket är felkonfigurerat.

Exempel: när registreringen lämnade användare utan kontorad (#439, #440) var den egentliga orsaken att better-auths Prisma-adapter inte körde transaktioner (`transaction: true` saknades), inte att städning saknades i appen.
