import Link from "next/link"

const TERMS_SECTIONS = [
  {
    title: "1. Scope Of Services",
    points: [
      "MTS Services.Inc provides refurbished device sales, doorstep/home service bookings, diagnostics, repair, part replacement, and upgrade assistance.",
      "Service timelines are estimates and may vary based on spare-part availability, device condition, and customer location.",
      "Repair feasibility depends on technical diagnosis. In some cases, repair may be declined if damage is severe or unsafe to proceed."
    ]
  },
  {
    title: "2. Product Condition And Refurbishment",
    points: [
      "Refurbished products are pre-owned devices that are tested, cleaned, and restored for reliable use.",
      "Minor cosmetic signs of use may exist unless a listing explicitly states otherwise.",
      "Product pages describe key specifications, health status, and included accessories; customers should review these before purchase."
    ]
  },
  {
    title: "3. Orders, Pricing, And Payments",
    points: [
      "All prices are shown in INR and may be changed without prior notice until order confirmation.",
      "Orders are confirmed only after successful payment verification.",
      "If a product becomes unavailable after payment, customers will receive an equivalent replacement option or a refund."
    ]
  },
  {
    title: "4. Repair Bookings And Customer Responsibilities",
    points: [
      "Customers must provide accurate contact details, address, device model, and issue description while booking service.",
      "For repair work, customers are responsible for backing up personal data before handover or technician visit.",
      "MTS Services.Inc is not responsible for existing data corruption, hidden hardware faults, or software piracy on customer devices."
    ]
  },
  {
    title: "5. Warranty And Limitations",
    points: [
      "Warranty terms vary by product or repair type and are communicated on listing pages, invoices, or service confirmations.",
      "Warranty does not cover liquid damage, physical breakage after delivery, power surges, unauthorized modifications, or misuse.",
      "Claims may require invoice details, order number, and device inspection before approval."
    ]
  },
  {
    title: "6. Returns, Cancellations, And Refunds",
    points: [
      "Return/refund eligibility is governed by the active return policy and condition verification at pickup/inspection.",
      "Home-service bookings may be rescheduled or canceled, but charges can apply if cancellation occurs after technician dispatch.",
      "Approved refunds are issued to the original payment source within standard banking timelines."
    ]
  },
  {
    title: "7. Prohibited Use",
    points: [
      "Customers must not use the website for fraudulent activity, abuse, unauthorized access, or harmful uploads.",
      "Any attempt to manipulate pricing, coupons, booking systems, or account security may lead to order cancellation and account restriction."
    ]
  },
  {
    title: "8. Liability",
    points: [
      "To the extent permitted by law, MTS Services.Inc is not liable for indirect, incidental, or consequential damages.",
      "Total liability for a specific claim is limited to the amount paid for the related product or service."
    ]
  },
  {
    title: "9. Changes To These Terms",
    points: [
      "We may update these Terms of Service to reflect operational, legal, or policy changes.",
      "Continued use of the website or services after updates implies acceptance of the revised terms."
    ]
  }
]

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Legal</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Terms Of Service</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            These terms govern use of MTS Services.Inc for refurbished product purchases and repair/service bookings.
            Please read them carefully before placing an order or booking support.
          </p>
          <p className="mt-3 text-sm text-slate-500">Last updated: April 8, 2026</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="space-y-5">
          {TERMS_SECTIONS.map((section) => (
            <article key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">{section.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-5 sm:p-6">
          <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">Need Clarification?</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            For legal or policy questions, contact our support team before placing an order or scheduling a repair.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Contact Us
            </Link>
            <Link
              href="/privacy-policy"
              className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-200"
            >
              View Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
