-- States: block Nebraska and Illinois; flag the rest; per-state reporting and 1099 notes for the owner.
alter table public.nl_contractor_states add column if not exists report_note text, add column if not exists tax_note text;

update public.nl_contractor_states set allowed = false, note = 'Nebraska wage law treats a commission seller of services as an employee unless all three ABC tests are met. Don''t hire as a contractor.' where state_code = 'NE';
update public.nl_contractor_states set allowed = false, note = 'ABC test for wage law and unemployment, a Freelance Worker Protection Act, and treble damages for sales reps. Don''t hire as a contractor.' where state_code = 'IL';
update public.nl_contractor_states set note = 'ABC test for unemployment insurance (and wage law in Vermont). Ask the attorney before hiring here.' where state_code in ('CT','VT');
update public.nl_contractor_states set note = 'Iowa wage law treats commission salespeople as employees for pay timing and limits taking back commissions. Ask the attorney before hiring here.' where state_code = 'IA';
update public.nl_contractor_states set note = 'Colorado presumes workers are employees. A signed contractor disclosure helps; ask the attorney before hiring here.' where state_code = 'CO';
update public.nl_contractor_states set note = 'Minnesota: commissions owed when the agreement ends must be paid within 3 working days. The app''s 3-business-day rule meets this.' where state_code = 'MN';
update public.nl_contractor_states set note = 'Arizona: the rep must get a signed copy of the agreement (the app gives them one). Unpaid commissions can cost 3x.' where state_code = 'AZ';

-- Report the contractor to the state (needs their SSN: do it on the state's website, never in this app)
update public.nl_contractor_states set report_note = v.n from (values
 ('CO','Report to Colorado''s new-hire directory within 20 days.'),
 ('CT','Report to Connecticut''s new-hire directory within 20 days once you expect to pay them $5,000+.'),
 ('FL','Report to Florida''s new-hire directory within 20 days.'),
 ('IA','Report to Iowa''s new-hire directory within 15 days once you expect to pay them $600+.'),
 ('ME','Report to Maine''s new-hire directory within 7 days once you expect to pay them $2,500+.'),
 ('NH','Report to New Hampshire''s new-hire directory within 20 days once you expect to pay them $2,500+.'),
 ('NY','Report to New York''s new-hire directory within 20 days once the contract is over $2,500.'),
 ('OH','Report to Ohio''s new-hire directory within 20 days.'),
 ('OR','Report to Oregon''s new-hire directory within 20 days.'),
 ('TX','Report to Texas''s new-hire directory within 20 days.'),
 ('VA','Report to Virginia''s new-hire directory within 20 days.'),
 ('WV','Report to West Virginia''s new-hire directory within 14 days once you expect to pay them $2,500+.'),
 ('MS','Report to Mississippi''s new-hire directory within 15 days.')
) v(c, n) where state_code = v.c;

-- Year-end: state copy of the 1099-NEC
update public.nl_contractor_states set tax_note = 'No state income tax: federal 1099-NEC only.' where state_code in ('AK','FL','NV','NH','SD','TN','TX','WA','WY');
update public.nl_contractor_states set tax_note = v.n from (values
 ('PA','File a Pennsylvania 1099 copy yourself (myPATH), even below the federal $2,000.'),
 ('OR','File an Oregon 1099 copy yourself (iWire), from $600.'),
 ('MT','File a Montana 1099 copy yourself, from $600.'),
 ('OK','File an Oklahoma 1099-NEC copy yourself, from $750.'),
 ('AL','Alabama copy from $1,500 (the IRS passes it on if you e-file through IRIS).'),
 ('RI','File a Rhode Island 1099 copy yourself, from $100.'),
 ('DC','File a DC 1099 copy yourself.'),
 ('VT','File a Vermont 1099 copy yourself.'),
 ('VA','File a Virginia 1099 copy yourself.'),
 ('WV','File a West Virginia 1099 copy yourself.')
) v(c, n) where state_code = v.c;
update public.nl_contractor_states set tax_note = 'The IRS passes your 1099-NEC to this state when you e-file through IRIS (Combined Federal/State Filing).'
 where tax_note is null and allowed;

-- Version 2 of the agreement (version 1 stays on record for anyone who signed it)
insert into public.nl_contractor_docs (slug, version, title, body_md, active)
select 'contractor-agreement', 2, 'Independent Sales Contractor Agreement', $doc$# Independent Sales Contractor Agreement

**Effective date:** {{effective_date}}

**Between:** Vivid Virtual Creations LLC, a California limited liability company doing business as NewLight Marketing (the **"Company"**), and **{{contractor_business}}** ({{contractor_name}}, {{contractor_email}}), located in {{contractor_state}} (the **"Contractor"**).

## 1. What this is
The Contractor will find and sell the Company's marketing services to business owners, for commission only. The Contractor is an **independent contractor running their own business**, not an employee, partner or agent of the Company. The Contractor will describe themselves as an **"Independent Sales Representative for NewLight Marketing."**

## 2. The Contractor runs their own business
- The Contractor decides **when, where, how much and how** they work. There are no required hours, shifts, schedules, call counts, meetings, reports or quotas.
- The Company only cares about the result: sales of its services, at its published prices and terms, made honestly and legally.
- The Contractor supplies and pays for their own computer, phone, internet, workspace and anything else they use. The Contractor may hire their own helpers, at their own cost, who must follow Section 6.
- The Contractor may work for other companies and run other businesses at the same time. The only limit: while this agreement is in effect, the Contractor won't sell directly competing marketing services to prospects already registered with the Company.
- The Company offers training, talk tracks, guides, coaching, leads and software. These are **optional resources**. The Contractor may use them, change them or ignore them, except for the rules in Section 6.

## 3. Commission is the only pay
The Contractor is paid **only commission**, as set out in **Exhibit A**. There is no salary, hourly pay, draw, bonus, benefit or minimum payment of any kind.

- **When a commission is earned:** when (a) the client has signed a Company agreement credited to the Contractor, and (b) the client's setup-fee payment (or installment) has **cleared** in the Company's bank account.
- **"Cleared" means:** for a wire, the day it lands in the Company's account; for an ACH bank payment, the third business day after it settles; for a card payment, the day it settles.
- **When it is paid:** the Company will send each earned commission **within 3 business days after the client's payment clears**, by bank wire or ACH, with a statement showing the client, the payment, the rate and any adjustments.
- **Credit:** credit for a sale goes to the people recorded on that client in the Company's system. If two people claim the same sale, the Company decides based on those records.

## 4. Refunds and chargebacks
If, within **120 days** after a client's payment cleared, the Company refunds any part of it under its client agreement, or the payment is reversed, returned or charged back, the commission on that amount is not earned. Anything already paid on it is an advance the Contractor must repay. The Company may take it out of the Contractor's next commissions and will show each deduction in writing. Any amount still owed after that is due within 30 days of a written request.

## 5. No expenses, taxes or benefits
- The Contractor pays **all of their own costs**. The Company reimburses nothing unless it agreed in writing, in advance, to pay a specific cost.
- **No W-9, no payment.** Before any commission is paid, the Contractor will give the Company a completed IRS Form W-9 and payout bank details **through the secure method the Company provides** (never by email or text). The Company will apply backup withholding where the law requires it.
- The Company will **not** withhold taxes. The Contractor is responsible for all of their own income and self-employment taxes, and will receive a **Form 1099-NEC** where required.
- The Contractor is not covered by the Company's workers' compensation, unemployment insurance, health insurance or any other benefit.

## 6. Rules the Contractor must follow
These are the only requirements, and they exist because of the law, the Company's reputation and the need to pay commissions correctly:
- **Accurate claims only.** Describe the Company's services, prices, guarantee and terms **only as the Company has written them**. Never promise results or anything else.
- **No authority.** Don't sign contracts, change prices, give discounts or make commitments for the Company unless the Company approves in writing.
- **Never collect client money.** All client payments go directly to the Company.
- **Log sales for credit.** Record each prospect you want credit for and each signed client in the Company's system, so the Company can serve the client and pay commission.
- **Calling and texting laws.** Follow telemarketing and do-not-call laws. Honor every request to stop contact right away. Don't use an autodialer, prerecorded or AI voice, or send texts to a cell phone without the person's prior written consent.
- **Recording.** If a call or video meeting is recorded, say so at the start ("This call is recorded") and stop recording if anyone objects. Some states require everyone's consent.
- **Brand.** Use the Company's name, logo and materials only as provided, without changing them.
- **Privacy.** Keep client and prospect information private (Section 9).

## 7. Client and business information belongs to the Company
All leads, client records, call recordings and data in the Company's system, and all clients who buy from the Company, belong to the Company.

## 8. Work product
Anything the Contractor creates **specifically for the Company** under this agreement (for example scripts, sales materials or content made for the Company) belongs to the Company, and the Contractor assigns it to the Company. The Contractor keeps everything they owned before this agreement or create for themselves or others. This does not cover anything the law says cannot be assigned (for example, inventions made entirely on the Contractor's own time with their own equipment that don't relate to the Company's business).

## 9. Confidential information
The Contractor will keep the Company's confidential information private and use it only to sell for the Company. That includes lead lists, client information, prices not published, the Company's software, training and business methods. This continues after the agreement ends. It does not cover information that is already public through no fault of the Contractor.

The Contractor may not use the Company's confidential information, during or after this agreement, to take clients or leads away from the Company. **There is no non-compete.**

Nothing in this agreement stops the Contractor from reporting possible legal violations to a government agency. Under the federal Defend Trade Secrets Act, a person is not liable for disclosing a trade secret in confidence to a government official or attorney solely to report or investigate a suspected violation of law, or in a sealed court filing.

## 10. Ending the agreement
- Either side may end this agreement with **14 days' notice** by email, or right away if the other side seriously breaks it (for example, a breach of Section 6).
- **Every commission earned by the end date is paid within 3 business days after the end date.**
- **Commissions keep coming after it ends:** for clients who signed on or before the end date, the Contractor is paid on every setup-fee payment that clears afterward, within 3 business days after it clears, no matter how long after the end date.
- When it ends, the Contractor stops representing the Company, stops using its system and returns or deletes its confidential information. Sections 3–5 (for amounts owed), 7, 8, 9, 11 and 12 continue after it ends.

## 11. Responsibility
Each side is responsible for its own actions. The Contractor will cover the Company for any claims, fines or costs caused by the Contractor breaking the law or Section 6. Neither side is liable to the other for lost profits or other indirect damages, except for breaking Section 9.

## 12. General
- **Law:** the law of the state where the Contractor lives applies, without regard to conflict-of-law rules.
- **Whole agreement:** this agreement and Exhibit A are the entire deal and replace anything said before. Changes must be in writing and agreed by both sides (email or the Company's app counts).
- **If one part is invalid,** the rest still applies, and the invalid part is limited only as much as needed.
- **Notices** may be sent by email to the addresses each side uses with the other.
- **Electronic signature:** both sides agree to sign and keep this agreement electronically, and that an electronic signature counts the same as a handwritten one. The Contractor receives a signed copy in the app.

---

## Exhibit A: Commission terms

{{commission_terms}}

---

*The Company signs this agreement by offering it to the Contractor in the Company's app. The Contractor signs below by typing their full legal name.*
$doc$, true
where not exists (select 1 from public.nl_contractor_docs where slug = 'contractor-agreement' and version = 2);
