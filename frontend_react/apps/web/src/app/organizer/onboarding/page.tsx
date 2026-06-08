"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { organizerApi } from "@eventmind/api";
import { useAuthStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";

const GREEN = "#184E4A";

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
  { code: "ZA", name: "South Africa",    regLabel: "Company Registration Number",      regPlaceholder: "2020/123456/07" },
  { code: "OTHER", name: "Other",        regLabel: "Company Registration Number",      regPlaceholder: "Enter your registration number" },
];

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
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [country, setCountry] = useState("BE");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedCountry = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  useEffect(() => {
    if (!isAuthenticated) { router.replace("/auth"); return; }
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
    if (companyName.trim().length < 2) errors.companyName = "Company name is required.";
    if (companyAddress.trim().length < 5) errors.companyAddress = "Company address is required.";
    if (!companyEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.companyEmail = "Enter a valid company email.";
    if (companyWebsite && !companyWebsite.match(/^https?:\/\/.+/))
      errors.companyWebsite = "Website must start with http:// or https://";
    if (!country) errors.country = "Please select a country.";
    if (registrationNumber.trim().length < 3) errors.registrationNumber = `${selectedCountry.regLabel} is required.`;
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
        company_name: companyName.trim(),
        company_address: companyAddress.trim(),
        company_email: companyEmail.trim(),
        company_website: companyWebsite.trim() || undefined,
        country: selectedCountry.name,
        registration_number: registrationNumber.trim(),
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
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      <div className="px-12 py-10 max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ backgroundColor: "#E8F0EF", color: GREEN }}>
            One-time setup
          </div>
          <h1 className="text-[30px] font-bold mb-2" style={{ color: "#111827" }}>
            Verify your organisation
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
            To publish events on EventMind, we need your company details for trust and compliance.
            This is a one-time step. Your information is kept private.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: "🔒", text: "Data kept private" },
            { icon: "✅", text: "Instant verification" },
            { icon: "🌍", text: "All countries supported" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ backgroundColor: "white", border: "1px solid #E2DDD5", color: "#6B7280" }}>
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl p-8 space-y-6" style={{ backgroundColor: "white", border: "1px solid #E2DDD5" }}>

            {/* Contact Person */}
            <div>
              <h2 className="text-[15px] font-bold mb-4" style={{ color: "#111827" }}>Contact Person</h2>
              <FormField label="Full Name" error={fieldErrors.fullName}>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Jane Smith"
                  className={inputCls(!!fieldErrors.fullName)}
                />
              </FormField>
            </div>

            <div className="border-t" style={{ borderColor: "#E2DDD5" }} />

            {/* Company Details */}
            <div className="space-y-6">
              <h2 className="text-[15px] font-bold" style={{ color: "#111827" }}>Company Details</h2>

              <FormField label="Company Name" error={fieldErrors.companyName}>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Acme Events Ltd."
                  className={inputCls(!!fieldErrors.companyName)}
                />
              </FormField>

              <FormField label="Company Address" error={fieldErrors.companyAddress}>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="e.g., 42 Innovation Street, Brussels 1000"
                  className={inputCls(!!fieldErrors.companyAddress)}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-6">
                <FormField label="Company Email" error={fieldErrors.companyEmail}>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="e.g., info@acmeevents.com"
                    className={inputCls(!!fieldErrors.companyEmail)}
                  />
                </FormField>

                <FormField label="Company Website" hint="Optional" error={fieldErrors.companyWebsite}>
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://acmeevents.com"
                    className={inputCls(!!fieldErrors.companyWebsite)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <FormField label="Country of Registration" error={fieldErrors.country}>
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

                <FormField label={selectedCountry.regLabel} error={fieldErrors.registrationNumber}>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder={selectedCountry.regPlaceholder}
                    className={inputCls(!!fieldErrors.registrationNumber)}
                  />
                </FormField>
              </div>
            </div>
          </div>

          <p className="text-xs mt-4 leading-relaxed" style={{ color: "#9CA3AF" }}>
            By submitting, you confirm that the information provided is accurate and belongs to a legally
            registered entity. EventMind reserves the right to suspend accounts where false information is provided.
          </p>

          {error && (
            <p className="text-sm px-4 py-3 rounded-xl mt-4 bg-red-50 text-red-600 border border-red-200">{error}</p>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl mt-4"
              style={{ color: GREEN, backgroundColor: "#F0F7F6" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Organisation verified! Taking you to create your event…
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || success}
            className="w-full mt-6 py-4 rounded-2xl text-white text-sm font-bold transition-colors disabled:opacity-50"
            style={{ backgroundColor: GREEN }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin border-white" />
                Verifying…
              </span>
            ) : "Verify & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold" style={{ color: "#111827" }}>{label}</label>
        {hint && <span className="text-xs" style={{ color: "#9CA3AF" }}>{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean): string {
  return (
    "w-full px-4 py-3 rounded-xl text-sm transition-colors " +
    "placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 " +
    (hasError
      ? "border border-red-400 bg-red-50 focus:ring-red-200"
      : "border border-[#E2DDD5] bg-white text-[#111827] focus:ring-[#184E4A]/20 focus:border-[#184E4A]")
  );
}
