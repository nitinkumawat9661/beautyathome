import Link from 'next/link';

const services = [
  ['Hair', 'Styling, hair spa and occasion-ready finishes.'],
  ['Skin', 'Facials and skin-care appointments at home.'],
  ['Makeup', 'Event, party and celebration-ready looks.'],
  ['Hands and feet', 'Manicure, pedicure and everyday grooming.'],
] as const;

const steps = [
  ['01', 'Choose a service', 'Review the duration and price guidance before booking.'],
  ['02', 'Select a professional', 'Compare eligible professionals available in your city.'],
  ['03', 'Confirm your appointment', 'Keep the booking, payment and service details in one place.'],
] as const;

export default function Home() {
  return (
    <main className="flex-1 bg-[#fffaf7] text-[#2f2027] dark:bg-[#171114] dark:text-[#fff8fa]">
      <section className="border-b border-[#e7d9df] dark:border-[#3a2b32]">
        <div className="mx-auto grid w-full max-w-7xl gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93506c] dark:text-[#e0a8bd]">
              At-home beauty services in Sikar
            </p>
            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Book beauty care without rearranging your day.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6e5a63] dark:text-[#d6c4cb]">
              Browse approved services, choose an eligible professional and manage your appointment
              from one customer account.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-13 items-center justify-center bg-[#3b1d2d] px-7 text-sm font-semibold text-white transition hover:bg-[#52283d] dark:bg-[#f2cbd9] dark:text-[#321d28]"
                href="/services"
              >
                Browse services
              </Link>
              <Link
                className="inline-flex min-h-13 items-center justify-center border border-[#cdb9c2] px-7 text-sm font-semibold text-[#3b1d2d] transition hover:border-[#8d5269] dark:border-[#5d414d] dark:text-[#f4dce5]"
                href="/become-a-professional"
              >
                Become a professional
              </Link>
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-y-3 border-y border-[#e1d3d9] py-5 text-sm text-[#6e5a63] sm:grid-cols-3 sm:gap-x-5 dark:border-[#3d2d34] dark:text-[#d6c4cb]">
              <span>Verified before activation</span>
              <span>Clear service details</span>
              <span>Built for home appointments</span>
            </div>
          </div>

          <aside className="border-l border-[#d8c7ce] pl-6 sm:pl-10 dark:border-[#49343e]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93506c] dark:text-[#e0a8bd]">
              A simpler booking flow
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.03em]">
              Service details stay visible before you confirm.
            </h2>
            <dl className="mt-10 divide-y divide-[#dfd0d6] border-y border-[#dfd0d6] dark:divide-[#46333c] dark:border-[#46333c]">
              <div className="grid grid-cols-[7rem_1fr] gap-5 py-5">
                <dt className="text-sm text-[#8b6e7b] dark:text-[#c8aeb9]">Location</dt>
                <dd className="font-semibold">Sikar, Rajasthan</dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-5 py-5">
                <dt className="text-sm text-[#8b6e7b] dark:text-[#c8aeb9]">Before booking</dt>
                <dd className="font-semibold">Duration and price guidance</dd>
              </div>
              <div className="grid grid-cols-[7rem_1fr] gap-5 py-5">
                <dt className="text-sm text-[#8b6e7b] dark:text-[#c8aeb9]">Account</dt>
                <dd className="font-semibold">Mobile verification</dd>
              </div>
            </dl>
            <Link
              className="mt-7 inline-flex text-sm font-semibold text-[#7b3853] underline decoration-[#c9a6b4] underline-offset-8 dark:text-[#efb6cc]"
              href="/#how-it-works"
            >
              See how booking works
            </Link>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93506c] dark:text-[#e0a8bd]">
              Service catalogue
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
              Care for regular days and important ones.
            </h2>
            <Link
              className="mt-7 inline-flex text-sm font-semibold text-[#7b3853] underline decoration-[#c9a6b4] underline-offset-8 dark:text-[#efb6cc]"
              href="/services"
            >
              View the complete catalogue
            </Link>
          </div>

          <div className="divide-y divide-[#dfd0d6] border-y border-[#dfd0d6] dark:divide-[#46333c] dark:border-[#46333c]">
            {services.map(([title, description], index) => (
              <Link
                className="group grid gap-3 py-6 transition sm:grid-cols-[4rem_0.7fr_1.3fr_auto] sm:items-center sm:gap-6"
                href="/services"
                key={title}
              >
                <span className="text-sm font-semibold text-[#a17486]">0{index + 1}</span>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="text-sm leading-6 text-[#715d67] dark:text-[#cdbac3]">
                  {description}
                </p>
                <span className="text-sm font-semibold text-[#7b3853] transition group-hover:translate-x-1 dark:text-[#edb3ca]">
                  View →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-[#e4d5dc] bg-[#f7eef1] dark:border-[#3a2b32] dark:bg-[#20171b]"
      >
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93506c] dark:text-[#e0a8bd]">
              How it works
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
              Three clear steps from browsing to booking.
            </h2>
          </div>

          <ol className="mt-12 divide-y divide-[#d9c6ce] border-y border-[#d9c6ce] dark:divide-[#4b3640] dark:border-[#4b3640]">
            {steps.map(([number, title, description]) => (
              <li
                className="grid gap-3 py-7 sm:grid-cols-[5rem_0.7fr_1.3fr] sm:items-start sm:gap-8"
                key={number}
              >
                <span className="font-serif text-3xl text-[#9b5b75] dark:text-[#e4abc1]">
                  {number}
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="leading-7 text-[#715d67] dark:text-[#cdbac3]">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#93506c] dark:text-[#e0a8bd]">
            Work with BeautyAtHome
          </p>
          <h2 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">
            Experienced beauty professionals can apply for review.
          </h2>
          <p className="mt-5 max-w-2xl leading-7 text-[#715d67] dark:text-[#cdbac3]">
            Submit your details first. Professional access is activated only after admin review and
            approval of your mobile number.
          </p>
        </div>
        <Link
          className="inline-flex min-h-13 items-center justify-center border border-[#3b1d2d] px-7 text-sm font-semibold text-[#3b1d2d] transition hover:bg-[#3b1d2d] hover:text-white dark:border-[#f2cbd9] dark:text-[#f2cbd9]"
          href="/become-a-professional"
        >
          Apply as a professional
        </Link>
      </section>
    </main>
  );
}
