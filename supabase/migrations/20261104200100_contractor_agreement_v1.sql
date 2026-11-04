-- Version 1 of the Independent Sales Contractor Agreement (draft for attorney review)
insert into public.nl_contractor_docs (slug, version, title, body_md, active)
select 'contractor-agreement', 1, 'Independent Sales Contractor Agreement', $doc$# Independent Sales Contractor Agreement

**Effective date:** {{effective_date}}

**Between:** Vivid Virtual Creations LLC, a California limited liability company doing business as NewLight Marketing (the **"Company"**), and **{{contractor_business}}** ({{contractor_name}}, {{contractor_email}}), located in {{contractor_state}} (the **"Contractor"**).

## 1. What this is
The Contractor will find and sell the Company's marketing services to business owners, for commission only. The Contractor is an **independent contractor running their own business**, not an employee, partner or agent of the Company.

## 2. The Contractor runs their own business
- The Contractor decides **when, where, how much and how** they work. There are no required hours, shifts, schedules, call counts or quotas.
- The Company only cares about the result: sales of its services, at its published prices and terms, made honestly and legally.
- The Contractor supplies their own computer, phone, internet, workspace and anything else they use.
- The Contractor may work for other companies and run other businesses at the same time, as long as they don't use the Company's confidential information to do it (Section 9).
- The Company may offer training, scripts, guides, coaching and software. These are **resources the Contractor may choose to use**. Using them is not a condition of this agreement, except that client records and sales must be logged in the Company's system so commissions can be paid and clients served (Section 6).

## 3. Commission is the only pay
The Contractor is paid **only commission**, as set out in **Exhibit A**. There is no salary, hourly pay, draw, bonus, benefit or minimum payment of any kind.

- **When a commission is earned:** only after the client's payment has actually been received by the Company (a wire has cleared or a card/bank payment has settled).
- **When it is paid:** by the 15th of the month after the month it was earned.
- **Reversals:** if a payment the commission was based on is refunded, charged back or returned within 90 days, that commission is reversed and may be taken out of future commissions.
- **Disputes about credit:** if two people claim the same sale, the Company decides based on the records in its system.
- **After this agreement ends:** commissions already earned are paid on the normal schedule. For sales the Contractor closed before the end date, commission is also paid on client payments the Company receives within 90 days after the end date. Nothing is owed on payments received after that.

## 4. No expenses are paid
The Contractor pays **all of their own costs** (phone, internet, equipment, travel, software, marketing, licenses, insurance and anything else). The Company reimburses nothing unless it agreed in writing, in advance, to pay a specific cost.

## 5. Taxes and insurance
- The Company will **not** withhold taxes. The Contractor is responsible for all of their own income and self-employment taxes.
- The Contractor will give the Company a completed **IRS Form W-9** before any commission is paid. The Company will issue a **Form 1099-NEC** each year as required.
- The Contractor is not covered by the Company's workers' compensation, unemployment insurance, health insurance or any other benefit. The Contractor is responsible for any insurance they want or need.

## 6. How the Contractor sells
The Contractor agrees to:
- describe the Company's services, prices, guarantee and terms **only as the Company has written them**, and never promise anything else;
- not sign contracts, change prices, give discounts or make commitments for the Company unless the Company has approved it in writing;
- log every client and sale in the Company's system so the Company can serve the client and pay commission;
- follow all laws that apply to their selling, including telemarketing and do-not-call rules, honoring every request to stop contact, and **telling the other person when a call is being recorded** (some states require everyone's consent before recording);
- be honest and professional with every prospect.

## 7. Client and business information belongs to the Company
All leads, client records, call recordings and data in the Company's system, and all clients who buy from the Company, belong to the Company.

## 8. Work product
Anything the Contractor creates **specifically for the Company** under this agreement (for example scripts, sales materials or content made for the Company) belongs to the Company, and the Contractor assigns it to the Company. The Contractor keeps everything they owned before this agreement or create for themselves or others. This does not cover anything the law says cannot be assigned (for example, inventions made entirely on the Contractor's own time with their own equipment that don't relate to the Company's business).

## 9. Confidential information
The Contractor will keep the Company's confidential information private and use it only to sell for the Company. That includes lead lists, client information, prices not published, the Company's software, training, scripts and business methods. This continues after the agreement ends. It does not cover information that is already public through no fault of the Contractor.

The Contractor may not use the Company's confidential information, during or after this agreement, to take clients or leads away from the Company. **There is no non-compete:** the Contractor is free to work in sales or marketing, for anyone, at any time.

Nothing in this agreement stops the Contractor from reporting possible legal violations to a government agency. Under the federal Defend Trade Secrets Act, a person is not liable for disclosing a trade secret in confidence to a government official or attorney solely to report or investigate a suspected violation of law, or in a sealed court filing.

## 10. Ending the agreement
Either side may end this agreement at any time, for any reason, by email. When it ends, the Contractor will stop representing the Company, stop using its system and return or delete its confidential information. Sections 3 (for commissions owed), 5, 7, 8, 9, 11 and 12 continue after it ends.

## 11. Responsibility
Each side is responsible for its own actions. The Contractor will cover the Company for any claims, fines or costs caused by the Contractor breaking the law or this agreement. Neither side is liable to the other for lost profits or other indirect damages, except for breaking Section 9.

## 12. General
- **Law:** California law applies, except where the law of the Contractor's home state must apply.
- **Whole agreement:** this agreement and Exhibit A are the entire deal and replace anything said before. Changes must be in writing and agreed by both sides (email or the Company's app counts).
- **If one part is invalid,** the rest still applies, and the invalid part is limited only as much as needed.
- **Notices** may be sent by email to the addresses each side uses with the other.
- **Electronic signature:** both sides agree to sign and keep this agreement electronically, and that an electronic signature counts the same as a handwritten one.

---

## Exhibit A: Commission terms

{{commission_terms}}

---

*The Company signs this agreement by offering it to the Contractor in the Company's app. The Contractor signs below by typing their full legal name.*
$doc$, true
where not exists (select 1 from public.nl_contractor_docs where slug = 'contractor-agreement');
