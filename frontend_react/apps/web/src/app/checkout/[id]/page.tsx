"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { eventsApi, paymentsApi } from "@eventmind/api";
import { useAuthStore, useTicketsStore } from "@eventmind/store";
import { Navbar } from "@/components/navbar/Navbar";

const GREEN = "#184E4A";
const SERVICE_FEE = 2.5;

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userEmail = useAuthStore((s) => s.userEmail);
  const addTicket = useTicketsStore((s) => s.addTicket);

  const [ticketCount, setTicketCount] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth");
  }, [isAuthenticated, router]);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsApi.get(id).then((r) => r.data),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  if (isLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F2EFEA" }}>
        <div className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: `${GREEN} transparent transparent transparent` }} />
      </div>
    );
  }

  const unitPrice = event.price ?? 0;
  const isFree = unitPrice === 0;
  const subtotal = unitPrice * ticketCount;
  const total = isFree ? 0 : subtotal + SERVICE_FEE;

  async function handlePay() {
    setError(null);
    setIsProcessing(true);
    try {
      if (isFree) {
        await new Promise((r) => setTimeout(r, 800));
      } else {
        await paymentsApi.createIntent({
          user_id: userEmail ?? "guest",
          event_id: id,
          amount: total,
          currency: "usd",
          metadata: { ticket_count: ticketCount },
        });
        await new Promise((r) => setTimeout(r, 2000));
      }
      addTicket({
        id: `ticket-${Date.now()}`,
        event_id: id,
        event_title: event!.title,
        start_date: event!.start_date,
        price_paid: total,
        seat_info: "General Admission",
        qr_hash: `${id}-${userEmail}-${Date.now()}`,
        claimed_at: new Date().toISOString(),
      });
      setShowSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F2EFEA" }}>
      <Navbar />

      <div className="px-12 py-10">
        <h1 className="text-[28px] font-bold text-[#111827] mb-8">Checkout</h1>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 48, alignItems: "start" }}>

          {/* ── Left: Order summary ── */}
          <div>
            <h2 className="text-[22px] font-bold text-[#111827] mb-6">Your Order</h2>

            <div className="bg-white rounded-3xl p-8" style={{ border: "1px solid #E2DDD5" }}>
              {/* Event row */}
              <div className="flex items-center gap-6 pb-6" style={{ borderBottom: "1px solid #E2DDD5" }}>
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${GREEN}14` }}>
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[20px] font-bold text-[#111827] truncate">{event.title}</p>
                  <p className="text-sm text-[#6B7280] mt-1">General Admission</p>
                </div>
                <p className="text-[20px] font-bold text-[#111827] shrink-0">
                  {isFree ? "FREE" : `$${subtotal.toFixed(2)}`}
                </p>
              </div>

              {/* Ticket count */}
              <div className="flex items-center justify-between py-5" style={{ borderBottom: "1px solid #E2DDD5" }}>
                <span className="text-[16px] text-[#111827]">Tickets</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setTicketCount((c) => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-colors"
                    style={{ backgroundColor: `${GREEN}14`, color: GREEN }}
                  >−</button>
                  <span className="text-[18px] font-bold w-6 text-center text-[#111827]">{ticketCount}</span>
                  <button
                    onClick={() => setTicketCount((c) => c + 1)}
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-colors"
                    style={{ backgroundColor: `${GREEN}14`, color: GREEN }}
                  >+</button>
                </div>
              </div>

              {/* Price breakdown */}
              <div className="pt-5 space-y-3">
                <SummaryRow label="Subtotal" value={isFree ? "FREE" : `$${subtotal.toFixed(2)}`} />
                {!isFree && <SummaryRow label="Service Fee" value={`$${SERVICE_FEE.toFixed(2)}`} />}
                <div className="pt-3" style={{ borderTop: "1px solid #E2DDD5" }}>
                  <SummaryRow
                    label="Total"
                    value={isFree ? "FREE" : `$${total.toFixed(2)}`}
                    bold
                    color={GREEN}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Free confirmation OR Payment card ── */}
          <div>
            <h2 className="text-[22px] font-bold text-[#111827] mb-6">
              {isFree ? "Confirm Registration" : "Payment Method"}
            </h2>

            <div className="bg-white rounded-3xl p-8"
              style={{ border: "1px solid #E2DDD5", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>

              {isFree ? (
                /* Free event — just show who's registering, no card needed */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: `${GREEN}0a` }}>
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <div>
                      <p className="text-xs text-[#6B7280]">Ticket confirmation will be sent to</p>
                      <p className="text-sm font-semibold text-[#111827]">{userEmail}</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#6B7280] leading-relaxed">
                    This is a free event. Click &quot;Claim Free Ticket&quot; below to reserve your spot.
                  </p>
                </div>
              ) : (
                /* Paid event — show card fields */
                <div className="space-y-4">
                  <PayInput label="Cardholder Name" type="text" icon={<PersonIcon />}
                    value={cardName} onChange={setCardName} />
                  <PayInput label="Card Number" type="text" icon={<CardIcon />}
                    value={cardNumber} onChange={setCardNumber} placeholder="•••• •••• •••• ••••" />
                  <div className="grid grid-cols-2 gap-4">
                    <PayInput label="Expiry Date" type="text" icon={<CalIcon />}
                      value={expiry} onChange={setExpiry} placeholder="MM / YY" />
                    <PayInput label="CVV" type="password" icon={<LockIcon />}
                      value={cvv} onChange={setCvv} placeholder="•••" />
                  </div>
                </div>
              )}

              {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

              <button
                onClick={handlePay}
                disabled={isProcessing}
                className="mt-6 w-full py-4 rounded-2xl text-white text-[18px] font-bold transition-colors disabled:opacity-60"
                style={{ backgroundColor: GREEN }}
                onMouseEnter={(e) => !isProcessing && (e.currentTarget.style.backgroundColor = "#133d39")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = GREEN)}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-white" />
                    {isFree ? "Claiming…" : "Processing…"}
                  </span>
                ) : (
                  isFree ? "Claim Free Ticket" : `Pay $${total.toFixed(2)}`
                )}
              </button>

              {!isFree && (
                <p className="text-center text-xs text-[#9CA3AF] mt-4">
                  Securely processed by Stripe
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Success dialog ── */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-3xl p-10 max-w-md w-full mx-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${GREEN}14` }}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-[24px] font-bold text-[#111827] mb-3">
              {isFree ? "You're registered!" : "Order Confirmed!"}
            </h2>
            <p className="text-[#6B7280] mb-8 leading-relaxed">
              {isFree
                ? "Your spot has been reserved. We've sent a confirmation to your email."
                : "Your payment was processed successfully. We've sent your tickets via email."}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-4 rounded-2xl text-white text-[16px] font-bold"
              style={{ backgroundColor: GREEN }}
            >
              Go to My Tickets
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryRow({ label, value, bold = false, color = "#111827" }: {
  label: string; value: string; bold?: boolean; color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: bold ? 20 : 16, fontWeight: bold ? 700 : 400, color: "#6B7280" }}>{label}</span>
      <span style={{ fontSize: bold ? 24 : 16, fontWeight: bold ? 700 : 400, color }}>{value}</span>
    </div>
  );
}

function PayInput({ label, type, icon, value, onChange, placeholder }: {
  label: string; type: string; icon: React.ReactNode;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ backgroundColor: "#F9F9F9", border: "1px solid #E2DDD5" }}>
      <span className="text-[#9CA3AF] shrink-0">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="flex-1 bg-transparent text-sm outline-none text-[#111827] placeholder:text-[#9CA3AF]"
      />
    </div>
  );
}

function PersonIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" /></svg>;
}
function CardIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>;
}
function CalIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25" /></svg>;
}
function LockIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>;
}
