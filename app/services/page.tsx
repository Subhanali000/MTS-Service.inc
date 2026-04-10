import Link from "next/link"
import { CheckCircle2, Shield, Wrench, Clock, ArrowRight } from "lucide-react"

const SERVICES = [
  {
    title: "Laptop Screen Repair",
    description: "Cracked, flickering, or black screen issues fixed with high-quality panel replacement.",
    price: "Starts at ₹3,000",
    eta: "Same Day Available"
  },
  {
    title: "Hardware Upgrades & SSD",
    description: "Boost speed with SSD, RAM, and performance optimization upgrades.",
    price: "Starts at ₹2,000",
    eta: "2-24 Hours"
  },
  {
    title: "Virus Removal & Software Fix",
    description: "Complete malware cleanup, OS tuning, and software troubleshooting.",
    price: "Starts at ₹500",
    eta: "2-6 Hours"
  },
  {
    title: "Keyboard & Battery Replacement",
    description: "Original-compatible battery and keyboard replacement with testing.",
    price: "Starts at ₹1,500",
    eta: "Same Day Available"
  },
  {
    title: "Desktop PC Repair",
    description: "Diagnosis and repair for boot, display, power, and heating problems.",
    price: "Starts at ₹1,000",
    eta: "4-24 Hours"
  },
  {
    title: "Data Recovery Services",
    description: "Recover important files from corrupted, formatted, or damaged drives.",
    price: "Starts at ₹2,000",
    eta: "24-72 Hours"
  },
  {
    title: "Motherboard Repair",
    description: "Advanced chip-level diagnostics and precision component repair.",
    price: "Starts at ₹3,000",
    eta: "1-3 Days"
  },
  {
    title: "General Maintenance & Cleaning",
    description: "Deep internal cleaning and thermal checks for better reliability.",
    price: "Starts at ₹500",
    eta: "1-3 Hours"
  }
]

const HIGHLIGHTS = [
  "Certified technicians with transparent diagnosis",
  "Doorstep support in serviceable locations",
  "Warranty-backed repairs and genuine parts",
  "Clear pricing before repair starts"
]

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <section className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 border border-orange-300/30 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-200">
            <Wrench className="w-3.5 h-3.5" />
            Our Services
          </p>
          <h1 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight max-w-3xl">
            Reliable Laptop & Desktop Services for Home and Business
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Choose a service and book in minutes. We offer fast diagnosis, quality repair, and clear communication from pickup to delivery.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/book-service"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Book Service Now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Explore Products
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
              {SERVICES.map((service) => (
                <article
                  key={service.title}
                  className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h2 className="text-lg font-black text-slate-900 leading-snug">{service.title}</h2>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{service.description}</p>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <p className="font-bold text-orange-600">{service.price}</p>
                    <p className="inline-flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-4 h-4" />
                      {service.eta}
                    </p>
                  </div>

                  <Link
                    href={`/book-service?service=${encodeURIComponent(service.title)}`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold px-4 py-2.5 transition-colors"
                  >
                    Book This Service
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">Why Customers Choose Us</h3>
              <div className="mt-4 space-y-3">
                {HIGHLIGHTS.map((item) => (
                  <p key={item} className="text-sm text-slate-700 flex items-start gap-2.5 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    {item}
                  </p>
                ))}
              </div>
            </div>

           <div className="bg-linear-to-br from-blue-200/60 via-white/70 to-blue-300/60 backdrop-blur-xl rounded-2xl p-6 text-slate-800 shadow-lg border border-white/30">
  
  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/20 mb-3">
    <Shield className="w-5 h-5 text-blue-700" />
  </div>

  <h3 className="text-xl font-black leading-tight">
    Book Service in 60 Seconds
  </h3>

  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
    Fill a quick form and get confirmation from our service team within 2 hours.
  </p>

  <Link
    href="/book-service"
    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 font-bold px-4 py-2.5 transition-all duration-200 shadow-md"
  >
    Go To Booking Form
    <ArrowRight className="w-4 h-4" />
  </Link>
</div>
          </aside>
        </div>
      </section>
    </main>
  )
}
