import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'

const features = [
  {
    title: 'Flexible splitting',
    description: 'Split any expense equally, unequally, or by percentage.',
    icon: '➗',
  },
  {
    title: 'Live balances',
    description: "See a running balance for every person in the house.",
    icon: '📊',
  },
  {
    title: 'Recurring bills',
    description: 'Set up recurring bills once and let them run themselves.',
    icon: '🔁',
  },
  {
    title: 'Simple settlements',
    description: 'Record settlements without waiting on a payment gateway.',
    icon: '🤝',
  },
]

function LandingPage() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-(--bg)">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[64rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        aria-hidden="true"
      />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
        <span className="flex items-center gap-2 text-lg font-bold text-(--text-h)">
          <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-xl text-white">S</span>
          SplitSync
        </span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="rounded-lg border border-(--border) px-4 py-2 text-sm font-semibold text-(--text-h) hover:border-(--accent-border)"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 pb-24 pt-12 text-center sm:px-10 sm:pt-20">
        <div className="flex max-w-2xl flex-col items-center gap-6">
          <span className="rounded-full border border-(--accent-border) bg-(--accent-soft) px-4 py-1.5 text-xs font-semibold text-(--accent)">
            Built for housemates, roommates & flatmates
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight text-(--text-h) sm:text-6xl">
            Split expenses.<br />
            <span className="brand-gradient-text">Stay friends.</span>
          </h1>
          <p className="max-w-lg text-lg text-(--text)">
            Track shared expenses with your housemates — who paid, who owes, and who's
            settled up, all in one place.
          </p>
          <Link
            to="/login"
            className="brand-gradient surface-shadow mt-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
          >
            Get started — it's free
          </Link>
        </div>

        <div className="grid w-full max-w-5xl grid-cols-1 gap-5 text-left sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="surface-shadow flex flex-col gap-3 rounded-2xl border border-(--border) bg-(--surface) p-6 transition hover:border-(--accent-border)"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--accent-soft) text-xl">
                {feature.icon}
              </span>
              <p className="text-sm font-semibold text-(--text-h)">{feature.title}</p>
              <p className="text-sm text-(--text)">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default LandingPage
