import Link from 'next/link';

const categories = [
  ['Hair care', 'Hair spa, styling and occasion-ready finishes.'],
  ['Skin and facial', 'Thoughtful skin rituals for your schedule.'],
  ['Makeup', 'Polished looks for events and celebrations.'],
  ['Hands and feet', 'Grooming without the salon commute.'],
] as const;

const steps = [
  ['01', 'Choose a service', 'See approved services with duration and price guidance.'],
  ['02', 'Select a professional', 'Compare eligible professionals before choosing.'],
  ['03', 'Confirm your slot', 'Review the appointment in one secure account.'],
] as const;

export default function Home() {
  return (
    <main className="flex-1 overflow-hidden bg-[#fffaf8] text-[#2f1b28] dark:bg-[#171014] dark:text-[#fff7fa]">
      <section className="relative border-b border-[#eadde3] dark:border-[#3a2932]">
        <div className="absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#f7dce6] via-[#fff0f4] to-transparent opacity-80 dark:from-[#4a2838] dark:via-[#281820]" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dfbecb] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7b3853] shadow-sm backdrop-blur dark:border-[#674353] dark:bg-[#24171e]/80 dark:text-[#f0b8ce]">
              <span className="h-2 w-2 rounded-full bg-[#b84d76]" />
              Now serving Sikar
            </div>
            <h1 className="mt-7 max-w-3xl font-serif text-5xl leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Beauty care that comes to your door.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6c5661] dark:text-[#d7c4cc]">
              Book at-home beauty appointments through a platform built around clear service details,
              professional verification and a calmer customer experience.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-13 items-center justify-center rounded-full bg-[#3b1d2d] px-7 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(59,29,45,0.2)] transition hover:-translate-y-0.5 hover:bg-[#54283d] dark:bg-[#f6d6e2] dark:text-[#2f1b28]"
                href="/services"
              >
                Explore services
              </Link>
              <Link
                className="inline-flex min-h-13 items-center justify-center rounded-full border border-[#d7bdc8] bg-white/70 px-7 text-sm font-semibold text-[#3b1d2d] transition hover:-translate-y-0.5 hover:bg-white dark:border-[#62404f] dark:bg-[#24171e] dark:text-[#f8e8ee]"
                href="/auth"
              >
                Join as a professional
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-3 text-xs font-semibold text-[#6c5661] dark:text-[#d7c4cc]">
              {['Verified before activation', 'Clear service pricing', 'Built for home visits'].map(
                (item) => (
                  <span className="rounded-full bg-white/80 px-4 py-2 shadow-sm dark:bg-[#281a21]" key={item}>
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-8 top-12 h-36 w-36 rounded-full bg-[#efbfd1] blur-3xl dark:bg-[#7a3854]" />
            <div className="absolute -right-5 bottom-8 h-40 w-40 rounded-full bg-[#ead2bd] blur-3xl dark:bg-[#694735]" />
            <div className="relative overflow-hidden rounded-[2.25rem] bg-[#3b1d2d] p-5 shadow-[0_35px_80px_rgba(74,36,54,0.28)] sm:p-7">
              <div className="min-h-[480px] rounded-[1.75rem] bg-gradient-to-br from-[#f8dce6] via-[#eebfd0] to-[#d99aae] p-7">
                <div className="flex items-center justify-between text-[#66364a]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em]">BeautyAtHome</p>
                    <p className="mt-1 text-sm">Sikar appointment experience</p>
                  </div>
                  <span className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold">At home</span>
                </div>
                <div className="mt-16 rounded-[2rem] border border-white/70 bg-white/45 p-7 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#875068]">
                    Calm, clear booking
                  </p>
                  <h2 className="mt-3 font-serif text-4xl leading-tight text-[#3a2130]">
                    Your service. Your professional. Your time.
                  </h2>
                  <div className="mt-8 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-[#6a4052]">
                    {['Choose', 'Compare', 'Confirm'].map((label, index) => (
                      <div className="rounded-2xl bg-white/70 px-2 py-4" key={label}>
                        <span className="mb-2 block text-[#9b5874]">0{index + 1}</span>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 rounded-2xl bg-[#3b1d2d] px-5 py-4 text-sm text-white shadow-lg">
                  Service details stay visible before confirmation.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a5d76] dark:text-[#e1a8bf]">
              Explore care
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
              Services for the moments that matter.
            </h2>
          </div>
          <Link className="text-sm font-semibold text-[#7b3853] underline underline-offset-8 dark:text-[#efb6cc]" href="/services">
            View complete catalogue
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(([title, description], index) => (
            <Link
              className="group rounded-[1.75rem] border border-[#eadde3] bg-white p-6 shadow-[0_14px_40px_rgba(76,43,58,0.06)] transition hover:-translate-y-1 hover:border-[#d9b4c3] hover:shadow-[0_20px_45px_rgba(76,43,58,0.11)] dark:border-[#3d2b34] dark:bg-[#21161c]"
              href="/services"
              key={title}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6e4eb] text-sm font-bold text-[#7b3853] group-hover:bg-[#3b1d2d] group-hover:text-white dark:bg-[#4b2c3a] dark:text-[#f3bfd3]">
                0{index + 1}
              </span>
              <h3 className="mt-6 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#715d67] dark:text-[#cdbac3]">{description}</p>
              <span className="mt-6 inline-flex text-sm font-semibold text-[#7b3853] dark:text-[#edb3ca]">
                Browse services →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#eadde3] bg-[#f8eef2] dark:border-[#3a2932] dark:bg-[#20151b]">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a5d76] dark:text-[#e1a8bf]">
              How it works
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
              A booking experience without the usual clutter.
            </h2>
          </div>
          <div className="grid gap-4">
            {steps.map(([number, title, description]) => (
              <article className="grid gap-4 rounded-[1.5rem] border border-[#dfcdd5] bg-white/80 p-6 sm:grid-cols-[auto_1fr] dark:border-[#4a3440] dark:bg-[#291b22]" key={number}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3b1d2d] text-sm font-semibold text-white dark:bg-[#f1c8d8] dark:text-[#321d28]">
                  {number}
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-2 leading-7 text-[#715d67] dark:text-[#cdbac3]">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="rounded-[2rem] bg-[#3b1d2d] px-7 py-10 text-white shadow-[0_30px_70px_rgba(59,29,45,0.2)] sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-14">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e9b7ca]">For beauty professionals</p>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
              Bring your expertise to customers across Sikar.
            </h2>
            <p className="mt-5 leading-7 text-[#ead8df]">
              Complete platform verification and manage your profile through a dedicated workspace.
            </p>
          </div>
          <Link className="mt-8 inline-flex min-h-13 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-[#3b1d2d] lg:mt-0" href="/auth">
            Start professional onboarding
          </Link>
        </div>
      </section>
    </main>
  );
}
