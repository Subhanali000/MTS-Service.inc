import Link from "next/link"

const FEATURES = [
  {
    title: "120+ Point Device Inspection",
    description:
      "Every device goes through cosmetic, electrical, and performance-level checks before approval.",
  },
  {
    title: "Certified Component Validation",
    description:
      "Key hardware like battery, storage, display, thermal path, and I/O ports are verified against quality thresholds.",
  },
  {
    title: "Data Security and Sanitization",
    description:
      "All storage media is securely wiped using enterprise-grade data erasure process before refurbishment.",
  },
  {
    title: "Performance Benchmarking",
    description:
      "CPU, memory, storage, and sustained thermal performance are tested with real workload simulation.",
  },
  {
    title: "Warranty and Traceability",
    description:
      "Each certified product carries trackable quality records and service support coverage.",
  },
  {
    title: "Post-Sale Support Framework",
    description:
      "Dedicated support workflow for troubleshooting, warranty claims, and quality escalation.",
  },
]

const FUNCTIONS = [
  {
    name: "Standardized Audit Workflow",
    details:
      "Maintains a repeatable, engineer-verified process so every unit follows the same strict quality baseline.",
  },
  {
    name: "Failure Risk Reduction",
    details:
      "Identifies weak components early and ensures only stable units move to customer inventory.",
  },
  {
    name: "Quality Scoring Model",
    details:
      "Assigns quality scores after validation to support transparent grading and predictable customer outcomes.",
  },
  {
    name: "Compliance-Ready Documentation",
    details:
      "Creates service-ready records that make support, replacement, and lifecycle management easier.",
  },
]

const PROCESS = [
  "Intake and visual quality triage",
  "Deep diagnostics and stress testing",
  "Component repair or certified replacement",
  "Thermal optimization and stability run",
  "Operating system and driver validation",
  "Final QA sign-off with quality stamp",
]

export default function HexaTrustPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-24">
          <p className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em]">
            HexaTrust Quality System
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            HexaTrust: Certified Refurbishment Standard for Reliable Devices
          </h1>
          <p className="mt-6 max-w-3xl text-base text-slate-300 md:text-lg">
            HexaTrust is MTS Services' quality assurance framework that defines how devices are inspected,
            repaired, validated, and certified before delivery. It combines process control, hardware validation,
            and support traceability to give customers consistent performance and confidence.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/products"
              className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-emerald-400"
            >
              Explore Certified Products
            </Link>
            <Link
              href="/support-ticket"
              className="rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10"
            >
              Contact Support Team
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">Core Features</h2>
          <p className="mt-3 text-slate-600">
            These are the core features that define the HexaTrust certification lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">Functions of HexaTrust</h2>
            <p className="mt-3 text-slate-600">
              HexaTrust is not only a label. It functions as a practical quality control and support system.
            </p>
            <div className="mt-8 space-y-4">
              {FUNCTIONS.map((item) => (
                <div key={item.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.details}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">How the Process Works</h2>
            <p className="mt-3 text-slate-600">
              Every certified unit follows this structured path before it reaches customers.
            </p>
            <ol className="mt-8 space-y-3">
              {PROCESS.map((step, index) => (
                <li key={step} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl bg-slate-900 px-8 py-10 text-white md:px-12 md:py-12">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">Why It Matters for Customers</h2>
          <p className="mt-4 max-w-4xl text-slate-300">
            HexaTrust reduces uncertainty in refurbished buying. You get transparency in quality checks,
            predictable performance, and structured post-sales support. This creates trust for individual buyers,
            enterprise procurement teams, and long-term device lifecycle management.
          </p>

          
        </div>
      </section>
    </main>
  )
}
