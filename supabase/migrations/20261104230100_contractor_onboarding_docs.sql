-- Onboarding documents. Each one is attached automatically when it applies to the rep (state / city).
insert into public.nl_contractor_docs (slug, version, title, body_md, active, sort_order, applies_states, applies_cities, renew_months, after_countersign, summary)
select v.slug, 1, v.title, v.body, true, v.sort_order, v.states, v.cities, v.renew, v.after_cs, v.summary
from (values
-- ---------------------------------------------------------------- every rep
('payment-terms-addendum', 'Payment Terms Addendum', 20, null::text[], null::text[], null::int, false,
 'The written payment terms freelancer-protection laws require.',
$doc$# Payment Terms Addendum

This addendum is part of the Independent Sales Contractor Agreement between the parties below. It puts in writing the terms that freelance-worker protection laws require (including New York's Freelance Isn't Free Act and similar city and state laws). If anything here conflicts with the agreement, this addendum controls.

## 1. The parties
- **Company:** Vivid Virtual Creations LLC, doing business as NewLight Marketing. Mailing address: {{company_address}}.
- **Contractor:** {{contractor_business}} ({{contractor_name}}). Mailing address: {{contractor_address}}. Phone: {{contractor_phone}}. Email: {{contractor_email}}.
- **Where the Contractor works:** {{work_location}}.

## 2. Services (itemized)
1. **Booking:** arranging a first meeting between the Company and a business owner or decision maker, recorded in the Company's system.
2. **Closing:** running the Company's sales meetings with a prospect who then signs a Company client agreement and pays a setup fee.

The Contractor chooses which services to perform, when and how.

## 3. Value, rate and method of payment
- **Booking:** 15% of the setup fee the client actually pays.
- **Closing:** 20% of the setup fee the client actually pays.
- The full commission terms, with examples, are in Exhibit A of the agreement. Example: a client pays a $10,000 setup fee → $1,500 for the booking, $2,000 for the close.
- The total value can't be known in advance because it depends on clients the Contractor brings in; it is calculated exactly as described here.

## 4. When payment is due
The Company pays each commission **within 3 business days after the client's payment clears** in the Company's bank, by wire or ACH, with an itemized statement. In every case, payment is made no later than **30 days** after the client's payment clears.

## 5. The Contractor's deadline to submit services
- Log each booking and each closed client in the Company's system **within 2 business days** after it happens.
- Review each commission statement and tell the Company about any error **within 5 business days** after receiving it.

Missing these deadlines does not cancel a commission; it only means the Company may pay it on its next payment run.

## 6. Protections
- The Company takes **no fees or deductions** from commissions, except reversals for refunded or charged-back client payments described in the agreement, each shown in writing.
- The Company will **not** require the Contractor to accept less than the agreed commission as a condition of being paid on time.
- The Company will **not retaliate** against the Contractor for asking about, complaining about or exercising rights under any freelance-worker protection law.
- The Company keeps this contract and payment records for at least **6 years**.
$doc$),

('conduct-acknowledgment', 'Sales Conduct, Claims, Data & Gifts Acknowledgment', 30, null, null, 12, false,
 'The legal rules for calls, what you can claim, client data and gifts. Re-signed once a year.',
$doc$# Sales Conduct, Claims, Data & Gifts Acknowledgment

These are the only rules NewLight requires of you. They exist because of the law, because our clients are regulated financial firms, and to protect NewLight's name. How you sell, when you work and how much you work are up to you. You re-sign this once a year.

## 1. Calls and texts
- **Introduce yourself and NewLight** at the start of every call: "This is [your name], an independent sales representative for NewLight Marketing."
- **Never mislead.** Since 2024, federal law (the FTC Telemarketing Sales Rule) bans false or misleading statements on business-to-business sales calls too: about price, results, guarantees, who you are, who sent you, or refunds.
- **Dial by hand.** No autodialer, prerecorded or AI voice, and no texts to a cell phone without the person's prior written consent. Many advisors answer on cell phones.
- **Do-not-call:** honor every "don't call me" right away and mark the number **Do Not Call** in the app. Never call a number already marked.
- **Calling hours:** 8 a.m. to 9 p.m. in the prospect's local time.
- **Recording:** if a call or meeting is recorded, say so at the start. If anyone objects, stop recording. Some states require everyone's consent.

## 2. What you can and can't claim
Our clients are advisors regulated by the SEC (the Marketing Rule) or FINRA. Their compliance teams hear everything.

**You can:** explain NewLight's three steps and the app; explain the packages and prices exactly as written in Training Module 4; explain the Growth 90-day commitment exactly as written: if the client's setup isn't made back within 90 days, NewLight keeps working at no extra charge until it is. It is continued service, **not a refund and not a promise of results**; share the prospect's own numbers back to them.

**You can't:**
- promise a number of clients, assets under management (AUM), revenue or return on investment;
- say NewLight or its marketing is "SEC approved," "FINRA approved" or "compliant" (say: "built to support your compliance team's review");
- suggest fake, paid or made-up reviews or testimonials;
- discuss, recommend or give advice about any investment, tax or legal matter;
- claim a link to their custodian, broker-dealer or a regulator, or invent a referral or person who "sent you";
- offer any price, discount or term NewLight hasn't approved in writing.

## 3. Data
- Use your own login only, with two-step login turned on where the app offers it.
- **Don't export, copy or download** lead lists or client data, and don't move prospect information into personal email, phone contacts or other tools.
- **Never ask for or accept** information about a firm's own clients or investors (names, account details, balances). NewLight doesn't need it, and those firms are legally required to protect it.
- Lock your devices. Report a lost device or suspected leak to NewLight **within 24 hours**.
- When your agreement ends, delete any NewLight information you have and confirm in writing.

## 4. Gifts and payments
- **No gifts, meals, entertainment or payments** to anyone at a prospect or client firm, except small NewLight-branded items NewLight provides.
- **Never offer or pay a referral fee** or anything of value to a registered representative or advisor for an introduction or a sale.

## 5. NewLight's name
- Use NewLight's name, logo, email signature and materials only as provided, without changes.
- Don't post on social media as if you speak for NewLight or for any client firm.
- **Never collect client money.** Every payment goes to NewLight through Pay & Sign or a wire to NewLight.

By signing, I confirm I've read these rules and will follow them.
$doc$),

-- ---------------------------------------------------------------- Seattle
('seattle-pre-work-notice', 'Seattle Pre-Work Disclosure', 15, null, array['seattle|WA'], null, false,
 'Seattle requires this before you start work.',
$doc$# Seattle Pre-Work Disclosure

Seattle's Independent Contractor Protections Ordinance (Seattle Municipal Code 14.34) requires this disclosure before any work begins. Your rights are explained in the City's official **Notice of Rights for Independent Contractors**, published by the Seattle Office of Labor Standards ([seattle.gov/laborstandards](https://www.seattle.gov/laborstandards)). NewLight also sends you a copy.

| Item | Terms |
|---|---|
| Date of this disclosure | {{effective_date}} |
| Hiring entity | Vivid Virtual Creations LLC dba NewLight Marketing, {{company_address}} |
| Independent contractor | {{contractor_business}} ({{contractor_name}}) |
| Work to be performed | Booking first meetings with business owners and closing sales of NewLight's marketing services, by phone and video |
| Where the work is performed | Wherever the contractor chooses (contractor's location: {{work_location}}) |
| Rate and basis of pay | Commission only: 15% (booking) or 20% (closing) of the setup fee the client actually pays |
| How pay is calculated | As set out in Exhibit A and the Payment Terms Addendum |
| Expenses reimbursed | None. The contractor pays their own costs |
| Deductions or fees | None, except reversals of commission on client payments refunded or charged back within 120 days |
| When payment is due | Within 3 business days after the client's payment clears; never later than 30 days |
| How payment is made | Bank wire or ACH, with an itemized statement each time |
| Hours or schedule | None. The contractor decides when, where and how much to work |

You'll receive an itemized payment statement with every payment.
$doc$),

-- ---------------------------------------------------------------- Colorado
('colorado-addendum', 'Colorado Addendum', 40, array['CO'], null, null, false,
 'Colorado''s independent-contractor terms and required disclosure.',
$doc$# Colorado Addendum

This addendum applies because the Contractor works in Colorado. It changes the Independent Sales Contractor Agreement as follows, and controls if anything conflicts.

## 1. What the Company does not do
The Company does **not**:
- require the Contractor to work exclusively for the Company;
- set quality standards beyond the Company's written specifications (accurate claims, the law, and logging sales so they can be paid), or oversee how the work is done;
- pay a salary or hourly rate (the Contractor is paid only a fixed commission rate);
- end this agreement during its term except for breach or failure to meet the specifications;
- provide more than minimal training (product and compliance information only);
- provide tools or benefits;
- dictate when the work is performed;
- combine its business operations with the Contractor's.

Where the Contractor has a business name or entity, the Company pays commission to that business.

## 2. Term
This agreement runs for **12 months** from the effective date and renews for another 12 months unless either side says otherwise in writing. During the term the Company may end it **only for breach or failure to meet the specifications**. The Contractor may end it at any time with 14 days' notice.

## 3. Required disclosure

**CONTRACTOR IS NOT ENTITLED TO UNEMPLOYMENT INSURANCE BENEFITS UNLESS UNEMPLOYMENT COMPENSATION COVERAGE IS PROVIDED BY CONTRACTOR OR SOME OTHER ENTITY. CONTRACTOR IS OBLIGATED TO PAY FEDERAL AND STATE INCOME TAX ON ANY MONEYS PAID PURSUANT TO THIS CONTRACT RELATIONSHIP.**

Both parties sign this addendum: the Contractor by typing their name below, the Company by countersigning in its app.
$doc$),

-- ---------------------------------------------------------------- Arizona
('arizona-declaration', 'Arizona Declaration of Independent Business Status', 40, array['AZ'], null, null, false,
 'Arizona''s optional declaration (A.R.S. 23-1601).',
$doc$# Declaration of Independent Business Status

This declaration of independent business status is made by **{{contractor_business}} ({{contractor_name}})** in relation to services performed by the contractor for or in connection with **Vivid Virtual Creations LLC dba NewLight Marketing**. The contractor states and declares the following:

1. The contractor operates the contractor's own independent business and provides services as an independent contractor.
2. The contractor is not an employee of the contracting party, and the services provided by the contractor do not establish any right to unemployment benefits or any other employment right.
3. The contractor is responsible for all tax liability associated with payments received from the contracting party, and the contracting party will not withhold any taxes from payments to the contractor.
4. The contractor is responsible for obtaining and maintaining any required registration, licenses or other authorizations necessary for the services rendered by the contractor.
5. The contractor acknowledges at least six of the following:
    - (a) The contractor is not insured under the contracting party's health insurance coverage or workers' compensation insurance coverage.
    - (b) The contractor is not restricted from performing services for other parties.
    - (c) The contractor has the right to accept or decline requests for services by or in connection with the contracting party.
    - (d) The contracting party expects the contractor to provide services to other parties.
    - (g) The contracting party does not dictate the performance, methods or process the contractor uses to perform services; the contracting party may set quality standards or deadlines, and the contractor sets the days and hours of work.
    - (h) The contractor is paid on the basis of the work performed and not a salary or minimum payment.
    - (i) The contractor provides the contractor's own tools and equipment.
    - (j) The contractor is responsible for the contractor's own expenses.
6. The terms of this declaration also apply to any employees and independent contractors of the contractor.

Dated {{effective_date}}.
$doc$),

('arizona-receipt', 'Arizona Signed Copy Receipt', 90, array['AZ'], null, null, true,
 'Confirms you received the fully signed agreement (Arizona law).',
$doc$# Receipt of Signed Agreement

I, **{{contractor_name}}**, confirm that on the date I sign below I received a complete copy of the Independent Sales Contractor Agreement, including Exhibit A (commission terms) and every addendum, **signed by both parties**. The Company countersigned on {{countersigned_on}} ({{countersign_name}}). I can download and keep this copy at any time from My Paperwork & Pay in the NewLight app.

This receipt is given under Arizona Revised Statutes section 44-1798.01.
$doc$),

-- ---------------------------------------------------------------- West Virginia
('west-virginia-acknowledgment', 'West Virginia Contractor Acknowledgment', 40, array['WV'], null, null, false,
 'The acknowledgments West Virginia law asks for (W. Va. Code 21-5I-4).',
$doc$# West Virginia Independent Contractor Acknowledgment

The parties intend for **{{contractor_business}} ({{contractor_name}})** to provide services to Vivid Virtual Creations LLC dba NewLight Marketing as an **independent contractor**. By signing, the Contractor acknowledges that the Contractor:

1. is providing services as an independent contractor;
2. will not be treated as an employee of the Company;
3. will not be provided workers' compensation or unemployment benefits by the Company;
4. is obligated to pay all applicable federal and state income taxes on any money earned, and the Company will not withhold any taxes; and
5. is responsible for the majority of the supplies and other variable expenses incurred in performing the services.

The Contractor also confirms that the Contractor files business or self-employment income tax returns for this work (or works through a business entity or trade name), controls the manner and means of the work, decides the time and place of the work, is free to work for others, and may hire helpers at the Contractor's own expense.
$doc$)
) v(slug, title, sort_order, states, cities, renew, after_cs, summary, body)
where not exists (select 1 from public.nl_contractor_docs x where x.slug = v.slug);
