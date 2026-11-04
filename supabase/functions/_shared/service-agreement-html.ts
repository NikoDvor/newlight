// Shared service agreement HTML builder (moved verbatim from close-prep-submit).
export const AGREEMENT_VERSION = "2026-11-04";

export function esc(s: string): string {
  return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

export function fmtMoney(n: number): string {
  return `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function termSection(o: { annual: boolean; hasGuarantee: boolean }): string {
  const { annual, hasGuarantee } = o;
  return `<p><strong>12.1 Term.</strong> This Agreement begins on the Effective Date (the date of Client's signature) and continues ${annual ? "for one-year terms that renew automatically on each anniversary" : "month to month"}.</p>
  <p><strong>12.2 Termination by Either Party.</strong> Either party may terminate this Agreement at any time, for any reason or no reason, including during ${hasGuarantee ? "any Guarantee Period, any free-service continuation, and " : ""}${annual ? "any annual term" : "any billing period"}, by giving the other party seven (7) days' written notice (email is sufficient).${annual ? " To stop an annual renewal, notice must be given at least seven (7) days before the anniversary date; otherwise the renewal term is owed in full." : ""} Fees already paid, and Fees accrued through the effective date of termination, remain due and earned, and Client remains responsible for the billing period in progress.</p>
  <p><strong>12.3 Termination or Suspension for Cause.</strong> Agency may suspend Services or terminate this Agreement immediately on written notice if Client (a) fails to pay any amount when due; (b) breaches ${hasGuarantee ? "the Client Cooperation Conditions, " : ""}Section 7, or Section 20 (a breach of Section 20 requires no cure period; other breaches must remain uncured seven (7) days after written notice); (c) supplies or approves content, claims, or assets that Agency reasonably believes violate law, regulation, or platform policy; (d) engages in abusive, threatening, or harassing conduct toward Agency personnel; or (e) becomes insolvent.</p>
  <p><strong>12.4 Effect of Termination; No Refunds.</strong> All Fees paid or due under this Agreement are fully earned when paid or due, in consideration of Agency's reservation of capacity, onboarding, setup, and ongoing work, and are non-refundable and non-creditable under any circumstance and whichever party terminates, for cause or for convenience, or if the Agreement otherwise ends. Any prepaid Annual Fee or Monthly Fee will not be prorated or refunded for unused time. This Section is not a penalty; it reflects the parties' agreed allocation of the value of the services reserved and performed. Client Data is handled under Section 8.5.${hasGuarantee ? " Any free-service continuation under Section 3 ends upon termination." : ""} Sections 2, ${hasGuarantee ? "3.3, " : ""}8, 10, 12.4, 15, and 17-24 survive termination.</p>`;
}

function finePrint(hasGuarantee: boolean): string {
  return `<p class="fine">By signing the accompanying envelope, Client acknowledges receipt of this Agreement, agrees to be bound by its terms, and confirms that: all Fees are non-refundable; either party may terminate on seven (7) days' written notice without any refund; no result is guaranteed or warranted${hasGuarantee ? ", and Client's sole and exclusive remedy for underperformance is the continued-service mechanism in Section 3" : ""}; and disputes are resolved by individual binding arbitration under Section 21.</p>`;
}

function NEW_SECTIONS(venue: string, govState: string, notice: string): string {
  return `<h2>17. Disclaimer of Warranties; Nature of Any Guarantee</h2>
  <p><strong>17.1</strong> THE SERVICES, THE COMMAND CENTER SOFTWARE, AND ALL DELIVERABLES ARE PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, AGENCY DISCLAIMS ALL WARRANTIES, EXPRESS, IMPLIED, OR STATUTORY, INCLUDING ANY IMPLIED WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, OR ACCURACY, ANY WARRANTY OF UNINTERRUPTED OR ERROR-FREE OPERATION, AND ANY WARRANTY ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.</p>
  <p><strong>17.2 No Warranty of Results.</strong> AGENCY DOES NOT WARRANT OR GUARANTEE ANY RESULT, INCLUDING LEADS, APPOINTMENTS, CLIENTS, ASSETS UNDER MANAGEMENT, REVENUE, RETURN ON AD SPEND, SEARCH OR AI-ASSISTANT VISIBILITY, OR PLATFORM APPROVAL OF ANY ACCOUNT OR ADVERTISEMENT.</p>
  <p><strong>17.3 Nature of Any "Guarantee."</strong> Any "guarantee," "Performance Guarantee," or similar term used in this Agreement or in any proposal, sales call, email, presentation, website, or marketing material is a limited commitment to continue providing services as described in Section 3 (where included in Client's package) and nothing more. It is not a warranty, a promise of any outcome, an insurance or surety undertaking, or a promise of a refund, and it creates no liability beyond the continued-service remedy stated in Section 3. Where Client's package has no Section 3 guarantee, no guarantee of any kind applies.</p>
  <p><strong>17.4 Third Parties.</strong> Agency does not control, and is not responsible for, the acts, policies, algorithms, pricing, outages, or decisions of third-party platforms and providers (including advertising, search, social, AI-assistant, email, telephony, payment, hosting, and CRM providers), or for any suspension of an account, rejection of an advertisement, or change in ranking or visibility.</p>

  <h2>18. No Reliance; Authority of Personnel</h2>
  <p>Client acknowledges that in entering into this Agreement it has not relied on any statement, promise, projection, estimate, example, case study, or representation, written or oral, that is not expressly set out in this Agreement, including any statement made by a sales or business development representative of Agency. No employee, contractor, or representative of Agency has authority to make any promise, guarantee, or commitment that is not in this Agreement, or to modify it, except in a writing signed by an owner or officer of Agency. This Section does not limit liability for fraud as stated in Section 10.4.</p>

  <h2>19. Client Indemnification</h2>
  <p>Client will defend, indemnify, and hold harmless Agency and its owners, officers, employees, and contractors from and against any third-party claim, demand, regulatory inquiry, investigation, or proceeding, and all resulting losses, damages, fines, penalties, settlements, and costs (including reasonable attorneys' fees), arising out of or related to: (a) content, claims, disclosures, testimonials, performance data, images, data, or other materials supplied or approved by Client; (b) Client's actual or alleged violation of any law, regulation, or self-regulatory rule, including the Investment Advisers Act and Rule 206(4)-1, FINRA rules, state securities laws, the Telephone Consumer Protection Act, CAN-SPAM, and privacy and data-protection laws; (c) any lack of consent or authority to contact or use the data of any person whom Client provides or approves for outreach; (d) Client's products, services, advice, or relationships with its own clients or investors; or (e) Client's breach of this Agreement. Agency will give Client prompt notice of the claim. Client controls the defense with counsel reasonably acceptable to Agency, and will not settle any claim in a way that imposes liability or an admission on Agency without Agency's written consent.</p>

  <h2>20. Payment Disputes and Chargebacks</h2>
  <p><strong>20.1</strong> Client authorizes the Fees and confirms that the payment method it provides is its own or that it is authorized to use it.</p>
  <p><strong>20.2</strong> If Client believes any charge is in error, Client will contact Agency in writing and give Agency fifteen (15) days to respond before initiating any dispute, chargeback, reversal, or payment recall with a bank, card issuer, or payment processor.</p>
  <p><strong>20.3</strong> Because Fees are earned when paid and are non-refundable under Sections 3, 4, and 12.4, a chargeback, reversal, or payment recall of Fees validly charged under this Agreement is a material breach. Client agrees that Agency may submit this Agreement, the signature record (including signer name, email, IP address, user agent, and timestamp), delivery and service records, and communications to the processor, bank, or issuer as evidence.</p>
  <p><strong>20.4</strong> Client will pay Agency on demand the amount of any reversed charge, plus all chargeback fees, processor penalties, and collection costs incurred by Agency (including reasonable attorneys' fees), and Agency may suspend all Services until paid.</p>
  <p><strong>20.5</strong> Past-due amounts accrue interest at 1.5% per month or the maximum rate permitted by law, whichever is lower.</p>

  <h2>21. Dispute Resolution; Binding Arbitration</h2>
  <p><strong>21.1 Informal Resolution.</strong> Before starting any arbitration or court action, the party raising a dispute will send written notice describing it, and the parties will try in good faith to resolve it for thirty (30) days.</p>
  <p><strong>21.2 Binding Arbitration.</strong> Except as stated in Section 21.4, any dispute arising out of or relating to this Agreement or the Services will be resolved by final and binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules, before one arbitrator, seated in ${venue}, ${govState} (or by video conference if the arbitrator permits). Judgment on the award may be entered in any court of competent jurisdiction.</p>
  <p><strong>21.3 Individual Claims Only.</strong> Disputes may be brought only in the parties' individual capacities and not as a plaintiff or class member in any class, collective, consolidated, or representative proceeding. The arbitrator may not consolidate claims or award class-wide relief.</p>
  <p><strong>21.4 Exceptions.</strong> Either party may (a) seek temporary or injunctive relief in court to protect confidential information or intellectual property, and (b) bring an individual claim in small claims court.</p>
  <p><strong>21.5 Fees.</strong> The prevailing party in any arbitration or court proceeding relating to this Agreement is entitled to recover its reasonable attorneys' fees and costs.</p>
  <p><strong>21.6 Jury Waiver.</strong> To the extent permitted by law, each party waives any right to a jury trial. Client acknowledges that it is giving up the right to a court or jury trial for disputes covered by this Section.</p>

  <h2>22. Third-Party Tools, AI-Assisted Content, and Relationship of the Parties</h2>
  <p><strong>22.1</strong> Agency may use subcontractors, third-party software, and artificial-intelligence tools to perform the Services.</p>
  <p><strong>22.2</strong> Content drafted with AI assistance may contain errors or omissions. Client's approval under Section 7 constitutes Client's review and adoption of that content, and Client is solely responsible for its accuracy, legality, and regulatory compliance once approved. Agency does not provide compliance review.</p>
  <p><strong>22.3</strong> Agency is an independent contractor. Nothing in this Agreement creates a partnership, joint venture, agency, fiduciary, or employment relationship. There are no third-party beneficiaries.</p>
  <p><strong>22.4</strong> Agency may provide similar services to other clients, including Client's competitors, subject only to any exclusivity expressly stated in Section 4.</p>
  <p><strong>22.5</strong> Agency may suspend or decline to run any campaign, content, or outreach that it reasonably believes is unlawful, non-compliant, or likely to violate platform policy, without liability.</p>

  <h2>23. Notices; Electronic Signature and Delivery</h2>
  <p><strong>23.1</strong> Notices may be given by email to the addresses most recently provided by each party (for Agency: ${notice}; for Client: the signer's email on the signature record) and are effective when sent unless the sender receives a delivery-failure message. Each party will notify the other of any change of address.</p>
  <p><strong>23.2</strong> Client consents to conduct this transaction and to receive all notices, disclosures, invoices, and records electronically. Electronic signatures and records have the same effect as paper under the federal ESIGN Act and the Uniform Electronic Transactions Act. Client's typed or drawn signature, together with the signature record described in Section 20.3, is Client's binding signature. This Agreement may be signed in counterparts.</p>

  <h2>24. Client Representations</h2>
  <p>Client represents and warrants that (a) the person signing is authorized to bind Client; (b) Client is a business entering this Agreement solely for business purposes and not for personal, family, or household purposes; (c) Client holds all licenses, registrations, and rights necessary to operate its business, to use the materials and data it provides, and to receive the Services; and (d) all information Client gives Agency is accurate and complete.</p>`;
}

export function buildServiceAgreementHtml(args: {
  businessName: string;
  priceLine: string;
  initialFee: number;
  recurringFee: number | null;
  pricingModel: "retainer" | "commission";
  commissionRate: number | null;
  commissionRateOngoing: number | null;
  retainerKpi?: string | null;
  closingNotes: string | null;
  agencyLegalName: string;
  agencyEntityType: string;
  governingState: string;
  venueCounty: string;
  dataRetentionDays: number;
  noticeEmail?: string | null;
}): string {
  const {
    businessName, priceLine, initialFee, recurringFee, pricingModel, commissionRate, commissionRateOngoing, retainerKpi, closingNotes,
    agencyLegalName, agencyEntityType, governingState, venueCounty, dataRetentionDays, noticeEmail,
  } = args;
  const bn = esc(businessName);
  const agency = esc(agencyLegalName) + (/newlight/i.test(agencyLegalName) ? "" : ", doing business as NewLight Marketing");
  const notice = esc(noticeEmail || "team@newlightgen.com");
  const entityType = esc(agencyEntityType);
  const govState = esc(governingState);
  const venue = esc(venueCounty);
  const initFmt = fmtMoney(initialFee);
  const isCommissionDeal = pricingModel === "commission";
  const retainerBlock = `<p>Beginning upon Recoupment or ninety (90) days after the Initial Fee payment, whichever is earlier, subject to Section 3, Client will pay Agency a recurring retainer of <strong>${fmtMoney(recurringFee ?? 0)} per month</strong> (the "Recurring Fee"), invoiced in advance, due on the same calendar day each month. The Recurring Fee is a fixed dollar amount and does not vary with Client's revenue, assets under management, number of clients, or investment performance.${retainerKpi ? ` This retainer is evaluated against the following performance target: ${esc(retainerKpi)}.` : ""}</p>`;
  const commissionBlock = `<p>Beginning upon execution of this Agreement, Agency will invoice Client monthly in arrears an amount equal to a percentage of Attributable Revenue recognized by Client during that month (the "Commission"), as determined from the System of Record. For the first twelve (12) months following the Effective Date, the Commission rate is <strong>${commissionRate ?? 0}%</strong>. Beginning with the thirteenth (13th) month following the Effective Date and continuing thereafter, the Commission rate is <strong>${commissionRateOngoing ?? 0}%</strong>. This is a results-based compensation arrangement: the Commission is calculated solely on Attributable Revenue that Agency's own Services are shown to have generated for Client, as defined in Section 1, and is expressly NOT calculated on Client's overall advisory fee revenue, assets under management, or any revenue not attributable to the Services. If Attributable Revenue in a given month is zero, no Commission is due for that month.${retainerKpi ? ` This arrangement is evaluated against the following performance target: ${esc(retainerKpi)}.` : ""}</p>`;
  const recurringBlock = isCommissionDeal ? commissionBlock : retainerBlock;
  const sectionFourHeading = isCommissionDeal ? "4. Commission" : "4. Recurring Fee";
  const compensationDisclosure = isCommissionDeal
    ? `The compensation to be disclosed under this arrangement is the Initial Fee described in Section 3, and the Commission described in Section 4, which is calculated as a percentage of Attributable Revenue that Agency's own Services generate for Client. Because this compensation is results-based, Client acknowledges this creates a conflict of interest requiring specific disclosure to prospective clients under Rule 206(4)-1(b)(1)(iii), given Agency's financial incentive tied to the volume and value of business referred.`
    : `The compensation to be disclosed under this arrangement is the Fees described in Sections 3 and 4.`;
  const notesBlock = closingNotes
    ? `<div class="notes"><h3>Deal-Specific Notes</h3><p>${esc(closingNotes).replace(/\n/g,"<br>")}</p></div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Service Agreement — ${bn}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a; background:#ffffff; margin:0; padding:0; line-height:1.6; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 32px 40px 64px; }
  
  h1 { font-size: 26px; margin: 0 0 4px; letter-spacing:0.3px; }
  .subtitle { font-size: 13px; color:#555; margin: 0 0 24px; font-family:Arial,sans-serif; }
  h2 { font-size: 17px; margin: 28px 0 8px; border-bottom:1px solid #e5e7eb; padding-bottom:6px; color:#111; }
  h3 { font-size: 14px; margin: 18px 0 6px; color:#111; font-family:Arial,sans-serif; }
  p, li { font-size: 14px; }
  ul, ol { padding-left: 22px; }
  dl { margin: 8px 0; }
  dt { font-size: 14px; font-weight: 700; margin-top: 10px; }
  dd { font-size: 14px; margin: 2px 0 0 18px; }
  .terms { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px 20px; margin: 16px 0 8px; font-family:Arial,sans-serif; font-size:14px; }
  .terms strong { color:#111; }
  .notes { background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:14px 18px; margin: 16px 0; font-family:Arial,sans-serif; font-size:13px; }
  .fine { font-size: 12px; color:#6b7280; font-family:Arial,sans-serif; margin-top: 32px; }
</style></head><body><div class="wrap">
  <h1>Master Services Agreement</h1>
  <p class="fine" style="margin:0 0 6px">Agreement version ${AGREEMENT_VERSION}</p>
  <p class="subtitle">Between ${agency} ("Agency"), ${entityType}, and ${bn} ("Client")</p>

  <div class="terms">
    <strong>Commercial Terms:</strong> ${esc(priceLine)}<br>
    <strong>Initial Fee at signing:</strong> ${initFmt}
  </div>

  ${notesBlock}

  <h2>1. Definitions</h2>
  <dl>
    <dt>"Attributable Revenue"</dt>
    <dd>means gross revenue recognized by Client from a new client account first sourced through the Services, as recorded in the System of Record, applying last-touch attribution, over the Guarantee Period. Attributable Revenue excludes (a) revenue from pre-existing relationships, (b) revenue Client would have generated anyway absent the Services, and (c) refunded, charged-back, or cancelled amounts.</dd>
    <dt>"Guarantee Period"</dt>
    <dd>means the period of ninety (90) days from the date the Initial Fee is received by Agency.</dd>
    <dt>"Recoupment"</dt>
    <dd>means cumulative Attributable Revenue greater than or equal to the Initial Fee.</dd>
    <dt>"Fees"</dt>
    <dd>means, as applicable to the selected package, the Initial Fee or Setup Fee, the Annual Fee, the Monthly Fee or Recurring Fee, and any Commission.</dd>
    <dt>"Recurring Fee"</dt>
    <dd>means the fixed monthly fee stated in Section 4 (called the "Monthly Fee" in some packages). The Recurring Fee is expressly <strong>not</strong> calculated as a percentage of Client's revenue, assets under management, or investment performance.</dd>
    <dt>"KPI Target"</dt>
    <dd>means the internal accountability benchmark described in Section 4, if stated. The KPI Target is a performance benchmark only and is not a fee formula.</dd>
    <dt>"System of Record"</dt>
    <dd>means Client's designated CRM instance and/or ad-platform reporting, as maintained and made accessible by Client.</dd>
  </dl>

  <h2>2. No Guarantee of Specific Results</h2>
  <p>Client acknowledges that Agency cannot and does not guarantee any specific number of leads, new clients, assets under management, revenue, or investment performance. Results depend on factors outside Agency's control, including market conditions, competition, Client's product and pricing, seasonality, and third-party platform behavior. This Agreement is a commitment of Agency's efforts and service duration, not a promise of any particular outcome. Nothing in this Agreement or in any Service constitutes advice regarding, or any claim about, the investment returns or performance of Client's own advisory services or Client's clients' accounts. Agency makes no promise or representation, and Client has not relied on any promise or representation, regarding rankings, search or AI-assistant visibility or citations, impressions, traffic, lead volume, appointment volume, close rates, conversion rates, return on ad spend, or any other metric or outcome. Any figure, forecast, estimate, or example shown in a proposal, call, email, dashboard, pipeline or revenue tool, case study, or marketing material (including any estimated annual value or revenue per deal) is illustrative only and is not a prediction or promise.</p>

  <h2>3. Performance Guarantee</h2>
  <p><strong>3.1 Initial Fee.</strong> Client will pay Agency the Initial Fee stated above upon execution of this Agreement. The Initial Fee is non-refundable and is fully earned upon receipt. The mechanism in this Section 3 is a "Performance Guarantee" of continued service, and is not a money-back guarantee, satisfaction guarantee, or free-trial offer within the meaning of 16 CFR 239.3; the Initial Fee is not refundable under any circumstance in this Agreement.</p>
  <p><strong>3.2 Recoupment.</strong> If, at the end of the Guarantee Period, Attributable Revenue is less than the Initial Fee, Agency will continue to provide services at no additional charge until Recoupment occurs or until one hundred fifty (150) days total from receipt of the Initial Fee (the ninety (90) day Guarantee Period plus a sixty (60) day extension), whichever occurs first, subject to the Client Cooperation Conditions in Section 3.4. After that combined period, either party may terminate this Agreement with no further obligation to the other, and Agency will owe no further service and no payment.</p>
  <p><strong>3.3 SOLE AND EXCLUSIVE REMEDY; NO REFUND.</strong> The continued-service remedy in Section 3.2 is Client's <strong>SOLE AND EXCLUSIVE REMEDY</strong> for any failure to achieve Attributable Revenue equal to or greater than the Initial Fee. Under no circumstance — including where Agency ultimately generates Attributable Revenue in excess of the Initial Fee — will Client be entitled to any cash refund, credit, rebate, or bonus payment of any kind. The Initial Fee is fully earned upon receipt. The continued-service remedy ends immediately upon any termination of this Agreement by either party for any reason, and no refund, credit, or other compensation is owed in place of it.</p>
  <p><strong>3.4 Client Cooperation Conditions.</strong> Client's rights under Sections 3.2–3.3 are conditioned on Client, throughout the Guarantee Period and any extension:</p>
  <ul>
    <li>maintaining active, uninterrupted access for Agency to all analytics, CRM, ad accounts, and reporting systems used as the System of Record;</li>
    <li>maintaining agreed paid-media spend at or above the minimum specified at kickoff;</li>
    <li>responding to Agency approval requests and creative reviews within three (3) business days;</li>
    <li>not materially altering pricing, offer, landing pages, website, or intake process without prior consultation with Agency; and</li>
    <li>promptly notifying Agency of any operational, inventory, staffing, or fulfillment issue that affects conversion.</li>
  </ul>
  <p>Repeated or material breach of these conditions terminates the guarantee remedy.</p>
  <p><strong>3.5 Client-Caused Exclusions.</strong> Without limiting the foregoing, the guarantee remedy in Sections 3.2–3.3 is tolled for the duration of, and voided by material or repeated occurrence of, any of the following:</p>
  <ul>
    <li>(a) Client changes to pricing, product, offer, website, or landing pages that materially reduce conversion, made without prior consultation with Agency;</li>
    <li>(b) Client's failure to follow up on leads delivered by Agency within a commercially reasonable time;</li>
    <li>(c) Client reducing paid-media spend below the agreed minimum specified at kickoff;</li>
    <li>(d) Client rejecting Agency's material recommendations without offering a reasonable alternative;</li>
    <li>(e) Client's own legal, licensing, regulatory, or compliance issues that prevent Agency from executing agreed campaigns; and</li>
    <li>(f) Client-supplied assets, claims, testimonials, or representations that violate platform policy or applicable law.</li>
  </ul>
  <p><strong>3.6 Tolling.</strong> If tracking, analytics, or ad-account access is revoked, suspended, or degraded, the Guarantee Period is automatically tolled (paused) until access is restored.</p>

  <h2>${sectionFourHeading}</h2>
  ${recurringBlock}
  <p>Invoices are due upon receipt. Amounts more than ten (10) days past due accrue interest at 1.5% per month or the maximum rate permitted by law, whichever is lower. Agency may suspend services for any invoice more than fifteen (15) days past due.</p>

  <h2>5. Promoter Status and Marketing Rule Compliance</h2>
  <p><strong>5.1 Promoter Acknowledgment.</strong> Client acknowledges that Agency may act as a "promoter" of Client within the meaning of Rule 206(4)-1(e)(5) under the Investment Advisers Act of 1940, and that outreach performed under this Agreement may constitute an "endorsement" and an "Advertisement" under Rule 206(4)-1.</p>
  <p><strong>5.2 Client Responsibilities.</strong> Client is solely responsible for: (a) ensuring that all Advertisements comply with Rule 206(4)-1; (b) making all required disclosures at the time of dissemination, including that Agency is not a client of Client, that Agency is compensated, and a brief statement of any material conflicts of interest; (c) making all required Form ADV disclosures of the promoter arrangement; and (d) confirming that Agency is not an "ineligible person" under Rule 206(4)-1.</p>
  <p><strong>5.3 Agency Cooperation.</strong> Agency will cooperate by providing information reasonably needed for Client's disclosures, will not disseminate content that Client has not approved under Section 7, represents that it is not subject to a disqualifying event described in Rule 206(4)-1(e)(1)(i)–(ii), and will promptly notify Client if that representation changes.</p>
  <p><strong>5.4 Compensation Disclosure.</strong> ${compensationDisclosure}</p>

  <h2>6. FINRA Communications Rider</h2>
  <p>This Section 6 applies only to the extent Client, or any registered representative for whom Agency performs Services, is a member of, or an associated person of a member of, the Financial Industry Regulatory Authority ("FINRA"). Where applicable: (a) no retail communication under FINRA Rule 2210 will be used without the prior written approval of a registered principal of Client's member firm, in addition to the approval required under Section 7; (b) content prepared on behalf of an individual registered representative will disclose that it was prepared by or on behalf of the representative, consistent with FINRA Regulatory Notice 08-27, unless the representative reviewed and adopted it as their own; and (c) Client's member firm remains solely responsible for supervision, recordkeeping, and FINRA filing obligations, and Agency will reasonably cooperate by providing content and distribution records on request.</p>

  <h2>7. Client Cooperation and Content Approval</h2>
  <p><strong>7.1 Prior Approval.</strong> No outreach, script, or advertisement will be disseminated on Client's behalf or in Client's name without the prior written (including email) approval of Client's compliance function or other designated approver, and Agency will not materially deviate from approved content without new approval.</p>
  <p><strong>7.2 Access and Contacts.</strong> Client will provide the access and cooperation described in Section 3.4 and will designate a compliance contact and a business contact.</p>
  <p><strong>7.3 Excused Delay.</strong> Agency is not in breach to the extent performance is delayed by Client's failure to provide access, approvals, or cooperation under this Section.</p>

  <h2>8. Client Data, Confidentiality, and Security</h2>
  <p><strong>8.1 Client Data Ownership.</strong> As between the parties, Client owns all Client-provided data, customer lists, brand assets, and campaign performance data generated on Client's accounts ("Client Data").</p>
  <p><strong>8.2 Safeguards.</strong> Agency will maintain reasonable administrative, technical, and physical safeguards designed to protect Client Data against unauthorized access, use, or disclosure.</p>
  <p><strong>8.3 Breach Notification.</strong> Agency will notify Client without undue delay and in any event within seventy-two (72) hours after Agency confirms any actual unauthorized access to or acquisition of Client Data, and will reasonably cooperate with Client's own notification obligations, including under Regulation S-P (17 CFR 248.30).</p>
  <p><strong>8.4 Data Minimization.</strong> Agency retains Client Data only as long as reasonably necessary to perform the Services and satisfy the purposes described in this Agreement, and not indefinitely.</p>
  <p><strong>8.5 Return and Destruction on Termination.</strong> Within thirty (30) days after termination, at Client's election, Agency will return or destroy all Client Data, except (a) copies required to be retained by law or Agency's own bona fide recordkeeping requirements, and (b) routine backup archives, which are deleted in the ordinary course, remain confidential, and are not otherwise accessed. In no event will Agency retain Client Data for any other purpose more than ${dataRetentionDays} days after termination. Agency will provide written certification of destruction on request.</p>
  <p><strong>8.6 Confidentiality.</strong> Each party will hold the other party's non-public business, financial, technical, customer, and marketing information ("Confidential Information") in confidence and use it only to perform this Agreement, with the same degree of care it uses for its own confidential information (and no less than reasonable care). Confidential Information excludes information that is or becomes public through no fault of the receiving party, was already known to the receiving party without a duty of confidentiality, or is independently developed. This obligation survives for two (2) years after termination.</p>
  <p><strong>8.7 Regulatory Examination Records.</strong> Agency will provide Client copies of records reasonably needed for a regulatory examination on request.</p>

  <h2>9. Intellectual Property</h2>
  <p>Client grants Agency a limited, non-exclusive license to use Client's name, trademarks, and brand materials solely to perform the Services. Deliverables created by Agency for Client and paid for in full are owned by Client upon payment. Agency retains all right, title, and interest in its own pre-existing tools, methodologies, templates, and know-how.</p>

  <h2>10. Limitation of Liability</h2>
  <p><strong>10.1 Cap.</strong> Except as provided in Sections 10.2 and 10.4, the total aggregate liability of Agency and its owners, employees, and contractors arising out of or related to this Agreement, whether in contract, tort, or otherwise, will not exceed the total Fees actually paid by Client to Agency in the three (3) months immediately preceding the event giving rise to the claim. Nothing in this Section limits Client's obligation to pay Fees.</p>
  <p><strong>10.2 Guarantee Remedy Excluded.</strong> The recoupment remedy in Section 3.2 is governed exclusively by Sections 3.1–3.6 and is not subject to the cap in Section 10.1, nor does it entitle Client to any monetary damages beyond continued free service as expressly stated.</p>
  <p><strong>10.3 Exclusion of Indirect Damages.</strong> Neither party will be liable for lost profits, lost revenue, lost data, or any indirect, incidental, consequential, special, or punitive damages, even if advised of the possibility.</p>
  <p><strong>10.4 Carve-Out.</strong> Nothing in this Agreement limits or excludes either party's liability for fraud, fraudulent misrepresentation, willful misconduct, or gross negligence. Such liability is expressly <strong>NOT</strong> subject to the cap in Section 10.1. This Section does not limit either party's indemnification obligations, breach of Section 8 (Client Data, Confidentiality, and Security), or liability for fraud or willful misconduct, none of which are subject to the cap in this Section.</p>
  <p><strong>10.5 Essential Basis; Claim Period.</strong> These limitations are an essential basis of the bargain and apply even if a remedy fails of its essential purpose. Any claim by Client must be brought within one (1) year after it arises or it is barred.</p>
  <p><strong>10.6 Third-Party Costs.</strong> Agency is not liable for advertising spend, platform fees, or other third-party costs incurred by Client.</p>

  <h2>11. Insurance</h2>
  <p>Agency maintains insurance coverage that it considers commercially reasonable for its business. On Client's written request, not more than once per year, Agency will confirm in writing the types of coverage then in force. Nothing in this Section creates additional liability or increases the limits in Section 10.</p>

  <h2>12. Term &amp; Termination</h2>
  ${termSection({ annual: false, hasGuarantee: true })}

  <h2>13. Force Majeure</h2>
  <p>Neither party will be liable for any delay or failure to perform (other than an obligation to pay amounts already due) caused by circumstances beyond its reasonable control, including acts of God, natural disaster, fire, flood, epidemic, war, terrorism, civil unrest, labor disruption, government action or order, changes to third-party platform policies or advertising algorithms, suspension or termination of an ad account not caused by the affected party, and failures of internet, telecommunications, hosting, or utility services. Performance is excused without penalty for the duration of the event, and the Guarantee Period is tolled accordingly per Section 3.6. The affected party will give prompt written notice, use commercially reasonable efforts to mitigate, and resume performance as soon as practicable. If the event continues for more than sixty (60) days, either party may terminate this Agreement on written notice without further liability.</p>

  <h2>14. No Suppression of Reviews</h2>
  <p>Agency will never condition guarantee performance, continued service, or any remedy under this Agreement on Client withholding, removing, retracting, or altering any public review, complaint, rating, or testimonial. This Agreement contains no non-disparagement obligation restricting Client's honest public statements about Agency, consistent with the federal Consumer Review Fairness Act (15 U.S.C. §45b).</p>

  <h2>15. General</h2>
  <p>This Agreement, together with any statement of work or order form referencing it, is the entire agreement of the parties and supersedes prior discussions on the same subject. It may be modified only in a writing signed by both parties. Neither party may assign this Agreement without the other's consent, except to a successor in a merger, acquisition, or sale of substantially all assets. If any provision is held unenforceable, the remainder remains in effect. This Agreement is governed by the laws of the State of ${govState}, without regard to conflict-of-law principles. Subject to Section 21, any court proceeding permitted by Section 21 will be brought in the state or federal courts located in ${venue}, ${govState}, and each party consents to that jurisdiction.</p>

  <h2>16. Regulatory Acknowledgment (General)</h2>
  <p>Client further acknowledges that Agency is a marketing services provider and does not provide investment, legal, tax, or accounting advice, and is not itself a registered investment adviser, broker-dealer, or FINRA member.</p>

${NEW_SECTIONS(venue, govState, notice)}

  ${finePrint(true)}
</div></body></html>`;
}

// ─── Package agreements (Nov 2026) ─────────────────────────────────────────
// Rewrites the commercial sections of the Master Services Agreement for the chosen package.
// Every number comes from the deal (defaults or the salesman's edits), so what's signed = what's charged.
export interface AgreementPlan {
  packageKey: "growth" | "command_center" | "enterprise";
  packageLabel: string;
  steps: string;
  cadence: "monthly" | "annual";
  ongoing: "retainer" | "commission";
  setup: number;
  monthly: number;
  commissionRate: number | null;
  commissionRateOngoing: number | null;
  paymentPlan: boolean;
  paymentPlanTotal: number | null;
  annualFirst: number | null;
  annualRenewal: number | null;
  minAdBudget: number | null;
}

function between(html: string, startMarker: string, endMarker: string, replacement: string): string {
  const a = html.indexOf(startMarker);
  const b = html.indexOf(endMarker, a + 1);
  if (a < 0 || b < 0) return html;
  return html.slice(0, a) + replacement + html.slice(b);
}

export function applyPlanTerms(html: string, p: AgreementPlan): string {
  const m = (n: number | null | undefined) => fmtMoney(Number(n || 0));
  const growth = p.packageKey === "growth";
  const annual = p.cadence === "annual";
  const half = p.paymentPlanTotal ? Math.round((p.paymentPlanTotal / 2) * 100) / 100 : 0;

  // Commercial terms box
  const termsLines = [
    `<strong>Package:</strong> ${esc(p.packageLabel)} — ${esc(p.steps)}`,
    annual
      ? `<strong>Annual Fee:</strong> ${m(p.annualFirst)} for the first year (includes the Setup Fee; 20% annual discount), then ${m(p.annualRenewal)} per year, due by bank wire on the Effective Date and each anniversary`
      : `<strong>Setup Fee:</strong> ${m(p.setup)}${p.paymentPlan ? ` — payment plan: ${m(p.paymentPlanTotal)} in two payments of ${m(half)}, 30 days apart` : ""}`,
    !annual && p.ongoing === "retainer" ? `<strong>Monthly Fee:</strong> ${m(p.monthly)} per month, billed on the 1st` : "",
    !annual && p.ongoing === "commission" ? `<strong>Commission:</strong> ${p.commissionRate ?? 0}% of Attributable Revenue from each new client in that client's first 12 months, then ${p.commissionRateOngoing ?? 0}%` : "",
    growth ? `<strong>90-Day Guarantee:</strong> yes — see Section 3` : `<strong>Guarantee:</strong> none`,
  ].filter(Boolean).join("<br>");
  html = between(html, `<div class="terms">`, `</div>`, `<div class="terms">${termsLines}`);

  // Section 3
  const sec3 = growth
    ? `<h2>3. Performance Guarantee</h2>
  <p><strong>3.1 Setup Fee.</strong> Client will pay the Setup Fee stated above upon execution of this Agreement. The Setup Fee is non-refundable and is fully earned upon receipt. The mechanism in this Section 3 is a "Performance Guarantee" of continued service, and is not a money-back guarantee, satisfaction guarantee, or free-trial offer within the meaning of 16 CFR 239.3.</p>
  <p><strong>3.2 Recoupment.</strong> The Guarantee Period begins when Agency receives the first Setup Fee payment and lasts ninety (90) days. No Monthly Fee or Commission is charged during the Guarantee Period. If Recoupment has not occurred by the end of the Guarantee Period, Agency will continue to provide services at no additional charge until Recoupment occurs, subject to the Client Cooperation Conditions in Section 3.4.</p>
  <p><strong>3.3 SOLE AND EXCLUSIVE REMEDY; NO REFUND.</strong> The continued-service remedy in Section 3.2 is Client's <strong>SOLE AND EXCLUSIVE REMEDY</strong> for any failure to achieve Attributable Revenue equal to or greater than the Setup Fee. Under no circumstance will Client be entitled to any cash refund, credit, rebate, or bonus payment of any kind. The continued-service remedy ends immediately upon any termination of this Agreement by either party for any reason, and no refund, credit, or other compensation is owed in place of it.</p>
  <p><strong>3.4 Client Cooperation Conditions.</strong> Client's rights under Sections 3.2–3.3 are conditioned on Client, throughout the Guarantee Period and any extension: maintaining active access for Agency to all analytics, CRM, ad accounts, and reporting systems used as the System of Record; maintaining paid-media spend of at least ${m(p.minAdBudget || 3000)} per month, paid by Client directly to the advertising platforms; responding to approval requests within three (3) business days; not materially altering pricing, offer, landing pages, website, or intake process without prior consultation with Agency; and promptly notifying Agency of any issue that affects conversion. Repeated or material breach of these conditions terminates the guarantee remedy.</p>
  <p><strong>3.5 Tolling.</strong> If tracking, analytics, or ad-account access is revoked, suspended, or degraded, the Guarantee Period is tolled until access is restored.</p>
  <p><strong>3.6 Revenue Confirmation.</strong> Each month Client will confirm, in the Command Center, the revenue recognized from new clients sourced through the Services. If Client does not respond within seven (7) days, Agency may rely on the System of Record.</p>
`
    : `<h2>3. Setup Fee</h2>
  <p><strong>3.1 Setup Fee.</strong> ${annual ? "The Setup Fee is included in the first-year Annual Fee." : `Client will pay the Setup Fee of ${m(p.setup)} upon execution of this Agreement${p.paymentPlan ? `, or under the payment plan of two payments of ${m(half)} (total ${m(p.paymentPlanTotal)}) thirty (30) days apart` : ""}.`} The Setup Fee is non-refundable and fully earned when paid. This package does not include a performance guarantee.</p>
`;
  html = between(html, `<h2>3. Performance Guarantee</h2>`, `<h2>4.`, sec3 + "\n  ");

  // Section 4 (fees, payment methods, failed payments, scope)
  const fees = annual
    ? `<p><strong>4.1 Annual Fee.</strong> Client will pay ${m(p.annualFirst)} for the first year on the Effective Date${growth ? " (the Setup Fee plus nine (9) months of service, reflecting the ninety (90) day Guarantee Period, at a 20% discount)" : " (the Setup Fee plus eleven (11) months of service at a 20% discount)"}. The Annual Fee renews automatically on each anniversary of the Effective Date at ${m(p.annualRenewal)} per year (twelve (12) months at a 20% discount) unless either party gives notice under Section 12.</p>`
    : p.ongoing === "commission"
      ? `<p><strong>4.1 Commission.</strong> Beginning on the first day of the month after the later of the end of the Guarantee Period and Recoupment, Agency will charge Client on the 1st of each month a Commission equal to ${p.commissionRate ?? 0}% of Attributable Revenue recognized in the prior month from each new client during that client's first twelve (12) months, and ${p.commissionRateOngoing ?? 0}% thereafter. The Commission is calculated only on Attributable Revenue that Agency's own Services generated, never on Client's overall revenue or assets under management.</p>`
      : `<p><strong>4.1 Monthly Fee.</strong> ${growth ? "Beginning on the later of the end of the Guarantee Period and Recoupment" : "Beginning on the Effective Date"}, Client will pay ${m(p.monthly)} per month, charged in advance on the 1st of each month. The first charge covers the partial month from the start date through the end of that month plus the following full month. The Monthly Fee is a fixed amount and does not vary with Client's revenue, assets under management, number of clients, or investment performance.</p>`;
  const methods = `<p><strong>4.2 Payment Methods.</strong> ${growth && !annual ? "The Setup Fee is paid through Agency's payment processor (bank debit or card)." : "The Setup Fee" + (annual ? " and every Annual Fee are" : " is") + " paid by bank wire using the instructions shown in Client's Command Center; Agency will never change its bank details by email."} ${annual ? "" : "Client authorizes Agency to charge the payment method saved at signing (bank account or card) automatically for every Monthly Fee, Commission" + (p.paymentPlan ? ", and the second payment-plan installment" : "") + ", on its due date, until this Agreement ends."}</p>`;
  const failed = `<p><strong>4.3 Failed or Late Payments.</strong> If a payment fails or a wire is not received when due, Agency will notify Client and retry automatic payments one (1) and three (3) days later. If payment is still not received three (3) days after the due date, Agency may pause all work and make Client's Command Center read-only until the balance is paid, at which point work resumes.</p>`;
  const scope = p.packageKey === "enterprise"
    ? `<p><strong>4.4 Enterprise Benefits.</strong> While this Agreement is active and paid, Agency will not provide the Services to a directly competing firm of the same type within Client's metropolitan area, and will assign Client a dedicated strategist.</p>`
    : growth ? `<p><strong>4.4 Ad Spend.</strong> Paid-media spend (minimum ${m(p.minAdBudget || 3000)} per month) is paid by Client directly to the advertising platforms and is not included in Agency's fees.</p>` : "";
  html = between(html, `<h2>4.`, `<h2>5.`, `<h2>4. Fees and Payment</h2>\n  ${fees}\n  ${methods}\n  ${failed}\n  ${scope}\n\n  `);

  // Termination: one generated block for every variant.
  html = between(html, `<p><strong>12.1 Term.</strong>`, `<h2>13.`, `${termSection({ annual, hasGuarantee: growth })}\n\n  `);
  html = html.replace(/<p class="fine">[\s\S]*?<\/p>/, finePrint(growth));
  if (growth) {
    html = html.replace("tolled accordingly per Section 3.6", "tolled accordingly per Section 3.5");
  } else {
    html = html.replace(/<p><strong>10\.2 Guarantee Remedy Excluded\.<\/strong>[\s\S]*?<\/p>/, "");
    html = html.replace("Except as provided in Sections 10.2 and 10.4", "Except as provided in Section 10.4");
    html = html.replace(", and the Guarantee Period is tolled accordingly per Section 3.6", "");
    html = html.replace(/\s*<dt>"Guarantee Period"<\/dt>\s*<dd>[\s\S]*?<\/dd>/, "");
    html = html.replace(/\s*<dt>"Recoupment"<\/dt>\s*<dd>[\s\S]*?<\/dd>/, "");
    html = html.replace(", applying last-touch attribution, over the Guarantee Period.", ", applying last-touch attribution.");
    html = html.replace("the access and cooperation described in Section 3.4 and", "the access and cooperation reasonably requested by Agency and");
  }
  // Fee naming: packaged agreements use "Setup Fee"; keep the Fees definition intact.
  const KEEP = "the Initial Fee or Setup Fee,";
  html = html.split(KEEP).join("@@KEEP@@").split("Initial Fee").join("Setup Fee").split("@@KEEP@@").join(KEEP);
  return html;
}
