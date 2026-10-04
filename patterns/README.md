# Scam pattern database

Every file in `in/` describes one scam that is common in India: the words scammers use,
how much those words should count, and what the person should do next.
The app downloads this folder from GitHub, so a merged pull request reaches users
without an app update.

## Add or improve a pattern

1. Copy an existing file, e.g. `in/kyc-update.yaml`, and give it a new `id` (same as the file name).
2. Fill in `phrases`. Use phrases scammers actually say or write, in any language or script.
   - `strong`: one of these alone is enough to match (very specific wording).
   - `weak`: common words that only count when `min_weak` of them appear together.
3. Write `advice` for someone who is scared right now: short, calm, specific.
4. Link at least one public source (police, RBI, PIB, CERT-In, a news report) in `sources`.
5. Run `npm test` from the repo root. It checks every file against the schema.

## Fields

| Field | Meaning |
|---|---|
| `id` | Kebab-case, matches the file name |
| `name` | Short name shown in the app ("Digital arrest") |
| `summary` | One sentence describing how the scam works |
| `points` | How much a match adds to the risk score (10–40) |
| `phrases.strong` | Any one of these matches the pattern |
| `phrases.weak` / `min_weak` | At least `min_weak` of these must appear |
| `news_query` | Search used to find fresh reports of this scam |
| `advice.verdict` | One line shown under the verdict |
| `advice.steps` | What to do next, in order |
| `advice.helplines` | Numbers to call (`1930` is the national cyber crime helpline) |
| `sources` | Public pages that document this scam |

Matching ignores case and extra spaces. Keep phrases short (2–5 words) so they survive small
wording changes.
