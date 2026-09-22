"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { organizerApi } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";
import {
  FormField,
  FormSection as Section,
  formRow as row,
  inputCls,
} from "@/components/FormControls";
import {
  DetailStickyCTA,
  DetailStickyShell,
  STICKY_BAR_HEIGHT,
} from "@/components/DetailCard";
import { SKIP_ORGANIZER_VERIFICATION } from "@/lib/dev-flags";
import { GUTTERS } from "@/lib/layout";

const GREEN = "var(--brand-green)";

/* ⚠️ THIS PAGE IS `/organizer/create` IN EVERYTHING BUT ITS FIELDS (Gautham,
   2026-09-11). He asked for the create form's design copied over whole — the
   1536px column, the back-arrow header, the 2px-bordered section cards, labels
   beside their inputs with "(required)" / "(optional)" on every one, the
   measured field widths, the left-packed rows and the sticky submit bar. So
   every one of those is IMPORTED from the same place the create page reads it
   (`FormControls`, `DetailCard`), not restated here. **Anything this page wants
   from the layout, add to the shared piece — do not restyle it locally**, or
   the pair drift apart again, which is what this rebuild undid.

   What went with the rebuild: the "One-time setup" chip and the three-tile
   trust strip (🔒 / ✅ / 🌍). Neither has a counterpart on the create page, the
   subtitle already says both things they said, and the strip's 1px
   `--brand-border` tiles were the pale edge the whole form system left behind
   on 2026-09-09. */

const COUNTRIES: { code: string; name: string; regLabel: string; regPlaceholder: string }[] = [
  { code: "BE", name: "Belgium",         regLabel: "BE-VAT Number",                    regPlaceholder: "BE0123456789" },
  { code: "GB", name: "United Kingdom",  regLabel: "Companies House Number",           regPlaceholder: "12345678" },
  { code: "US", name: "United States",   regLabel: "EIN (Employer ID Number)",         regPlaceholder: "12-3456789" },
  { code: "DE", name: "Germany",         regLabel: "HRB / HRA Number",                regPlaceholder: "HRB 12345" },
  { code: "NL", name: "Netherlands",     regLabel: "KvK Number",                       regPlaceholder: "12345678" },
  { code: "FR", name: "France",          regLabel: "SIREN Number",                     regPlaceholder: "123 456 789" },
  { code: "IN", name: "India",           regLabel: "CIN / GST Number",                regPlaceholder: "U12345MH2020PTC123456" },
  { code: "AU", name: "Australia",       regLabel: "ABN (Australian Business Number)", regPlaceholder: "51 824 753 556" },
  { code: "CA", name: "Canada",          regLabel: "Business Number (BN)",             regPlaceholder: "123456789" },
  { code: "SG", name: "Singapore",       regLabel: "UEN",                              regPlaceholder: "201234567C" },
  { code: "AE", name: "UAE",             regLabel: "Trade Licence Number",             regPlaceholder: "CN-1234567" },
  { code: "ZA", name: "South Africa",    regLabel: "Registration Number",              regPlaceholder: "2020/123456/07" },
  { code: "OTHER", name: "Other",        regLabel: "Registration Number",              regPlaceholder: "Enter your registration number" },
];

/* An account number as it goes on the wire: the separators people type are
   presentation, not data. An IBAN is quoted in four-character groups
   ("BE71 0961 2345 6769") and an Indian account number is often hyphenated, so
   the same account would otherwise be stored three different ways depending on
   how it was pasted. Letters survive — an IBAN starts with its country code. */
const normaliseAccount = (v: string) => v.replace(/[\s-]/g, "");

function subFromToken(token: string | null): string {
  if (!token) return "";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? "";
  } catch {
    return "";
  }
}

export default function OrganizerOnboardingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tokens = useAuthStore((s) => s.tokens);

  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [country, setCountry] = useState("BE");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedCountry = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  useEffect(() => {
    if (!isAuthenticated) { router.replace("/auth"); return; }
    /* An organiser who is already verified normally gets bounced straight to the
       create form. Under the dev bypass that redirect is exactly what stops you
       from LOOKING at this page — and it would fire the moment the create page's
       back button landed you here, so the pair would ping-pong. */
    if (SKIP_ORGANIZER_VERIFICATION) return;
    const userId = subFromToken(tokens?.access_token ?? null);
    if (!userId) return;
    organizerApi.get(userId)
      .then(() => router.replace("/organizer/create"))
      .catch(() => { /* not verified yet — stay */ });
  }, [isAuthenticated, router, tokens]);

  if (!isAuthenticated) return null;

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (fullName.trim().length < 2) errors.fullName = "Full name is required.";
    if (!contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.contactEmail = "Enter a valid email.";
    if (companyName.trim().length < 2) errors.companyName = "Company name is required.";
    if (companyAddress.trim().length < 5) errors.companyAddress = "Company address is required.";
    if (!companyEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.companyEmail = "Enter a valid company email.";
    if (companyWebsite && !companyWebsite.match(/^https?:\/\/.+/))
      errors.companyWebsite = "Website must start with http:// or https://";
    if (!country) errors.country = "Please select a country.";
    if (registrationNumber.trim().length < 3) errors.registrationNumber = `${selectedCountry.regLabel} is required.`;
    if (bankName.trim().length < 2) errors.bankName = "Bank name is required.";
    /* 6–34 is the world's range: 34 is the IBAN maximum, and no domestic account
       number anywhere is shorter than six. Anything outside it is a typo rather
       than an unusual country. */
    if (!/^[A-Za-z0-9]{6,34}$/.test(normaliseAccount(bankAccountNumber)))
      errors.bankAccountNumber = "Enter a valid account number or IBAN.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const userId = subFromToken(tokens?.access_token ?? null);
      await organizerApi.submit(userId, {
        full_name: fullName.trim(),
        contact_email: contactEmail.trim(),
        company_name: companyName.trim(),
        company_address: companyAddress.trim(),
        company_email: companyEmail.trim(),
        company_website: companyWebsite.trim() || undefined,
        country: selectedCountry.name,
        registration_number: registrationNumber.trim(),
        bank_name: bankName.trim(),
        bank_account_number: normaliseAccount(bankAccountNumber),
      });
      setSuccess(true);
      setTimeout(() => router.push("/organizer/create"), 1500);
    } catch {
      setError("Failed to submit. Please check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--brand-bg)" }}>
      <Navbar />

      {/* The create page's column, exactly: 1536px so a label can sit beside
          its input, and the sticky bar's height plus 32px underneath so the last
          card is not painted over by the bar. Both reasons are written up on
          `/organizer/create`; this page only follows. */}
      <div
        className={`pt-8 max-w-[1536px] mx-auto ${GUTTERS}`}
        style={{ paddingBottom: STICKY_BAR_HEIGHT + 32 }}
      >
        {/* DEV ONLY — the forward half of the create ⇄ onboarding round trip.
            Deliberately a strip ABOVE the page rather than a control inside it:
            this page's own layout is what you came here to look at, and a button
            threaded into the header would change the thing under review. The
            TERRACOTTA edge is the tell that it is not product UI — nothing else
            on this page is outlined in the annotation colour, and this product
            has no dashed borders anywhere (Gautham, 2026-09-09). Dropped from
            the bundle entirely when the flag is off — see lib/dev-flags.ts. */}
        {SKIP_ORGANIZER_VERIFICATION && (
          <div
            className="mb-6 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
            style={{
              border: "2px solid var(--brand-terracotta)",
              backgroundColor: "var(--brand-surface)",
            }}
          >
            <p style={{ color: "var(--brand-hint)" }}>
              Dev bypass on — verification is not being enforced.
            </p>
            <button
              type="button"
              onClick={() => router.push("/organizer/create")}
              className="px-4 py-2 rounded-lg font-bold transition-colors bg-[var(--brand-green)] hover:bg-[var(--brand-green-hover)]"
              style={{ color: "var(--brand-on-green)" }}
            >
              Skip to Create Event →
            </button>
          </div>
        )}

        {/* Header — the create page's back arrow and title block. Plain history
            here in both modes: under the bypass the dev strip above is already
            the door to the create page, and a real first-time organiser arrives
            from the console's empty state, which is where back should go. */}
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors"
            style={{ border: "2px solid var(--brand-control-border)", backgroundColor: "var(--brand-bg)" }}
          >
            <svg className="w-4 h-4" style={{ color: "var(--brand-hint)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-[28px] font-bold" style={{ color: "var(--brand-text)" }}>Verify your organisation</h1>
            <p className="text-[18px]" style={{ color: "var(--brand-hint)" }}>
              To publish events on NewFind, we need your company details for trust and compliance.
              This is a one-time step. Your information is kept private.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Contact Person ── */}
          <Section title="Contact Person">
            <div className={row()}>
              {/* `smd`, the step the create page's Organisation Name set for a
                  name people type in full — `sm` reads tight and `md` is a
                  title's width. */}
              <FormField label="Full Name" required inline width="smd" error={fieldErrors.fullName}>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Jane Smith"
                  className={inputCls(!!fieldErrors.fullName)}
                />
              </FormField>

              <FormField label="Email" required inline width="smd" error={fieldErrors.contactEmail}>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g., jane@acmeevents.com"
                  className={inputCls(!!fieldErrors.contactEmail)}
                />
              </FormField>
            </div>
          </Section>

          {/* ── Company Details ── */}
          <Section title="Company Details">
            <div className={row()}>
              {/* ⚠️ COMPANY NAME AND ADDRESS OWN A WHOLE LINE — the same nested
                  `row()` the create page gives City and Venue Address, for the
                  same reason. An address has no natural length, so it carries
                  no `width` and grows into the rest of the line; left in the
                  section's single flex row it would pack in beside the email
                  and website and be left holding "42 Innovation Street,
                  Brussels 1000" through ~300px. */}
              <div className={`sm:col-span-2 lg:w-full ${row()}`}>
                <FormField label="Name" required inline width="smd" error={fieldErrors.companyName}>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Acme Events Ltd."
                    className={inputCls(!!fieldErrors.companyName)}
                  />
                </FormField>

                <FormField label="Address" required inline error={fieldErrors.companyAddress}>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="e.g., 42 Innovation Street, Brussels 1000"
                    className={inputCls(!!fieldErrors.companyAddress)}
                  />
                </FormField>
              </div>

              {/* `smd` rather than the URL step: a company email is typed in
                  full and "firstname.lastname@company.com" is ~210px in Roboto
                  15, which is the whole of `sm`'s interior. */}
              <FormField label="Email" required inline width="smd" error={fieldErrors.companyEmail}>
                <input
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="e.g., info@acmeevents.com"
                  className={inputCls(!!fieldErrors.companyEmail)}
                />
              </FormField>

              {/* `sm`, the create page's Event Website step. */}
              <FormField label="Website" optional inline width="sm" error={fieldErrors.companyWebsite}>
                <input
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://acmeevents.com"
                  className={inputCls(!!fieldErrors.companyWebsite)}
                />
              </FormField>

              {/* ⚠️ MARKED "(required)" WITH NO EMPTY OPTION BEHIND IT, which is
                  the create page's rule for a menu: it opens on Belgium and
                  cannot be submitted blank, so the mark is enforced by the
                  control. `sm` clears "United Kingdom", the longest name here. */}
              <FormField label="Country of Registration" required inline width="sm" error={fieldErrors.country}>
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setRegistrationNumber(""); }}
                  className={inputCls(!!fieldErrors.country)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </FormField>

              {/* The label follows the country. Its longest form, "ABN
                  (Australian Business Number)", wraps inside `FormField`'s 240px
                  label cap rather than pushing the input off the row. `sm`
                  holds the longest placeholder, India's 21-character CIN. */}
              <FormField label={selectedCountry.regLabel} required inline width="sm" error={fieldErrors.registrationNumber}>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder={selectedCountry.regPlaceholder}
                  className={inputCls(!!fieldErrors.registrationNumber)}
                />
              </FormField>

              {/* ── Payout details ──
                  Where ticket revenue lands. Marked "(required)" because an
                  organiser with no account on file cannot be paid for a paid
                  event, and this form is the one time we ask.

                  `sm` for both: a bank name's longest realistic form here is
                  "State Bank of India" and an IBAN is 34 characters at its
                  longest, which is ~230px in Roboto 15 — both inside the step
                  that already holds the registration number beside them. */}
              <FormField label="Bank Name" required inline width="sm" error={fieldErrors.bankName}>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., KBC Bank"
                  autoComplete="off"
                  spellCheck={false}
                  className={inputCls(!!fieldErrors.bankName)}
                />
              </FormField>

              {/* Not `inputMode="numeric"`: an IBAN opens with two letters, so a
                  numeric keypad would lock half the world out of its own
                  account number. */}
              <FormField label="Account Number" required inline width="sm" error={fieldErrors.bankAccountNumber}>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="e.g., BE71 0961 2345 6769"
                  autoComplete="off"
                  spellCheck={false}
                  className={inputCls(!!fieldErrors.bankAccountNumber)}
                />
              </FormField>
            </div>
          </Section>

          <p className="text-sm leading-relaxed" style={{ color: "var(--brand-hint)" }}>
            By submitting, you confirm that the information provided is accurate and belongs to a legally
            registered entity. NewFind reserves the right to suspend accounts where false information is provided.
          </p>

          {/* Whatever the submit had to say, last in the sequence — the same
              two messages, in the same two skins, as the create page. */}
          {error && (
            <p className="text-sm px-4 py-3 rounded-lg bg-red-50 text-red-600 border border-red-200">{error}</p>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-lg" style={{ color: GREEN, backgroundColor: "color-mix(in srgb, var(--brand-green) 10%, transparent)" }}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Organisation verified! Taking you to create your event…
            </div>
          )}

          {/* ── The submit, in the shared sticky bar ──
              The create page's "Publish Event" is this same shell and this same
              button; one of them here rather than two. It sits INSIDE the
              `<form>` and has to — `position: fixed` moves where a button is
              painted, not where it lives, and a submit is bound to its form by
              ancestry. `ml-auto` because the shell is `justify-between` and a
              lone child lands left. */}
          <DetailStickyShell gutters={GUTTERS}>
            <div className="ml-auto">
              <DetailStickyCTA
                type="submit"
                disabled={isSubmitting || success}
                label={
                  isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Verifying…
                    </span>
                  ) : "Verify & Continue"
                }
              />
            </div>
          </DetailStickyShell>
        </form>
      </div>
    </div>
  );
}

/* `FormField` and `inputCls` had private copies here until 2026-09-11 — a 1px
   `--brand-border` input under a plain label with "Optional" as a grey hint,
   which is the drift the shared `FormControls` exists to prevent. Gone; both
   are imported above. */
