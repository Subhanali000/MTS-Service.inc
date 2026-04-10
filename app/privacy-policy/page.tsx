import Link from "next/link"

const PRIVACY_SECTIONS = [
  {
    title: "1. Information We Collect",
    points: [
      "Account and contact details such as name, email, mobile number, and address.",
      "Order and booking data including device model, issue details, service preferences, and transaction records.",
      "Technical usage information like browser type, IP address, and pages visited for security and analytics."
    ]
  },
  {
    title: "2. How We Use Your Information",
    points: [
      "To process refurbished product orders, deliveries, returns, and payments.",
      "To schedule and complete repair/home-service requests and provide status updates.",
      "To send important communication such as invoices, booking confirmations, support tickets, and service notices.",
      "To prevent fraud, secure customer accounts, and improve overall website performance."
    ]
  },
  {
    title: "3. Data Sharing",
    points: [
      "We share limited data only with trusted partners needed for payment processing, shipping, service logistics, and communications.",
      "We do not sell your personal information to third parties for independent marketing.",
      "Data may be disclosed when required by law or to protect legal rights and customer safety."
    ]
  },
  {
    title: "4. Device Repair And Data Handling",
    points: [
      "Customers should back up data before handing over a device for diagnostics or repair.",
      "Our technicians may need limited access to system functions only for testing and issue resolution.",
      "MTS Services.Inc does not intentionally access personal files beyond service requirements and is not responsible for pre-existing data loss."
    ]
  },
  {
    title: "5. Cookies And Tracking",
    points: [
      "Cookies are used to keep you signed in, remember cart/wishlist preferences, and improve user experience.",
      "Analytics tools may use aggregated data to understand traffic and optimize content.",
      "You can manage cookie preferences through browser settings; disabling some cookies may affect site functionality."
    ]
  },
  {
    title: "6. Data Security",
    points: [
      "We apply reasonable technical and organizational safeguards to protect customer data.",
      "Sensitive payment operations are handled through secure payment gateways.",
      "No internet system is fully risk-free, but we continuously monitor and improve security practices."
    ]
  },
  {
    title: "7. Data Retention",
    points: [
      "We retain order, invoice, and service records for legal, tax, warranty, and support obligations.",
      "Data no longer required for business or legal purposes is deleted or anonymized according to policy."
    ]
  },
  {
    title: "8. Your Rights",
    points: [
      "You may request access, correction, or deletion of personal data, subject to lawful obligations.",
      "You may opt out of non-essential promotional communications while still receiving transactional updates.",
      "To exercise rights, contact support using the details on the Contact page."
    ]
  },
  {
    title: "9. Policy Updates",
    points: [
      "We may revise this Privacy Policy when legal requirements or services change.",
      "Updated versions are posted on this page with a revised effective date."
    ]
  }
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Legal</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            This policy explains how MTS Services.Inc collects, uses, and protects personal information for both refurbished
            product e-commerce and device repair services.
          </p>
          <p className="mt-3 text-sm text-slate-500">Last updated: April 8, 2026</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="space-y-5">
          {PRIVACY_SECTIONS.map((section) => (
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

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">Related Policies</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            You can also review service obligations and usage terms before booking a repair or placing an order.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/terms-of-service"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              View Terms Of Service
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-200"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
