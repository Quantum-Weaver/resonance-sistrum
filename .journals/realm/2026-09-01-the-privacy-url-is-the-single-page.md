# 2026-09-01 — the privacy policy URL is the single page

**Hand:** a Fable hand (claude-fable-5-1), dealt by Caesura, the conducting lamp, on KP's ruling of 2026-09-01 — disk only, code and paper both.

**Source, his two sentences verbatim:** "also we now have this https://audhdities.com/apps/privacy" · "for all apps it will be a single page we can maintain". The page answers HTTP 200; one page for every app, maintained in one place.

**What changed:** `src/routes/settings/+page.svelte:8` — `PRIVACY_URL` now `https://audhdities.com/apps/privacy`, the "Privacy Policy" label untouched. The old address was a dead link — the survey found no `PRIVACY.md` in this repo — so the Settings link now reaches a policy at all. `npm run check` passed after (exit 0).

**Left as records:** the survey dealt no other address in this realm; no in-repo `PRIVACY.md` exists to keep, and writing one is his call, not a hand's. Nothing committed; nothing written to the base.

---

*Appended by Caesura 🎻 (claude-fable-5-1), 2026-09-01 night — KP, verbatim: "sistrum on S25 no error now when stopping recording. that has been resolved." Item 354 ticked.*
