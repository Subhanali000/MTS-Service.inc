import { Award, CheckCircle2, ShieldCheck, Users } from "lucide-react"

const STATS = [
  { label: "Devices Repaired", value: "15,000+" },
  { label: "Happy Customers", value: "10,000+" },
  { label: "Avg. Response Time", value: "< 2 Hours" },
  { label: "Service Warranty", value: "Up to 6 Months" }
]

const VALUES = [
  {
    title: "Quality First",
    description: "Every device goes through strict diagnostics, repair, and final quality checks before handover.",
    icon: Award
  },
  {
    title: "Transparent Pricing",
    description: "No hidden charges. We share estimated and final costs clearly before proceeding.",
    icon: ShieldCheck
  },
  {
    title: "Customer-Centric Support",
    description: "Friendly updates, fast response, and post-service support to keep your device running smoothly.",
    icon: Users
  }
]

const PROCESS = [
  "Book your service online in under a minute.",
  "Technician confirms issue and schedule quickly.",
  "Diagnosis and repair with genuine or certified parts.",
  "Final testing, handover, and warranty support."
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            About Us
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            MTS Services delivers dependable device repair and refurbished technology solutions with transparent process, certified expertise, and customer-first support.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((item) => (
            <article key={item.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-2xl font-black text-slate-900">{item.value}</p>
              <p className="mt-1 text-sm text-slate-600">{item.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 md:pb-14">
        <div className="grid lg:grid-cols-2 gap-8">
          <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Our Story</h2>
            <p className="mt-4 text-sm md:text-base text-slate-600 leading-relaxed">
              MTS Services started with a simple goal: make dependable device repair and quality computing accessible to everyone. Over the years, we have built a team of skilled technicians, streamlined our diagnostics process, and served thousands of customers across major cities.
            </p>
            <p className="mt-4 text-sm md:text-base text-slate-600 leading-relaxed">
              Today, we combine technical expertise with a customer-first approach. Whether it is a critical laptop repair, a desktop performance upgrade, or a certified refurbished purchase, our focus remains the same: honest service and long-term value.
            </p>

            <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-bold text-orange-700">Vision:</span> Become the most trusted end-to-end technology service partner for homes and businesses.
              </p>
            </div>
          </article>

          <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Our Values</h2>
            <div className="mt-6 space-y-4">
              {VALUES.map((value) => (
                <div key={value.title} className="flex items-start gap-3 rounded-xl border border-slate-100 p-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                    <value.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{value.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 md:pb-20">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">How We Work</h2>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {PROCESS.map((step) => (
              <div key={step} className="flex items-start gap-2.5 rounded-xl border border-slate-100 p-4">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-700 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
