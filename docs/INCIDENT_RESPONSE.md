# If personal data is lost, leaked or seen by the wrong person

One page to follow when something goes wrong. **Do not wait until you are sure.** Start at step 1 as soon
as you suspect it. Examples: a lost laptop or phone that was signed in to the admin, a leaked password or
API key, an email sent to the wrong people, a stranger who could see enquiries, a supplier telling you they
were breached.

**Legal deadlines.** Malaysia's data protection law (PDPA, as amended in 2024) now expects a data breach
that is likely to cause significant harm to be reported to the Personal Data Protection Commissioner and to
the people affected, within short deadlines. The exact deadlines, and what counts as "significant harm",
must be confirmed with a lawyer or on the Commissioner's website (https://www.pdp.gov.my) before you rely
on them. Ask a lawyer to confirm this page once, and write the answer in the line at the end.

## 1. Stop it (first hour)
- Sign out everywhere and change the password of any affected account (admin, Supabase, Vercel, GitHub, Gmail). Turn on two-step login if it was off.
- If a key or password leaked: replace it in Supabase (Project Settings, API and Edge Function secrets) and in Vercel, then redeploy. The old key must stop working.
- If a laptop or phone is lost: sign out its sessions from the account security pages and change the passwords it knew.
- Do not delete anything yet. You will need it to find out what happened.

## 2. Write down the facts (same day)
Keep a dated note with: what happened, when you noticed, what data could be involved (enquiries, names, phone numbers, emails, marketing contacts), roughly how many people, whether the data was only exposed or also copied, and who has been told. Keep the evidence (screenshots, emails, the Supabase and Vercel logs).

## 3. Decide how serious it is
Ask: could this harm the people involved (for example scams, identity fraud, embarrassment or loss of money)? Business contact details alone are lower risk than IDs, passwords or financial details, but ask a lawyer if you are unsure. When in doubt, treat it as serious.

## 4. Tell the right people
- The other team member, right away.
- If it is serious: the Commissioner and the affected people, within the legal deadlines (see the top of this page). Say what happened, what data was involved, what you have done, and what they should do (for example change a password, watch for scam messages), and give a contact.
- Any provider involved (Supabase, Vercel, Google), through their support or security contact.

## 5. Fix it and learn (within a week)
Close the cause, run `npm run test:security`, note what you changed, and add the lesson to this file. If the privacy policy is no longer accurate, update it.

Lawyer-confirmed deadlines: _(fill in once confirmed)_
