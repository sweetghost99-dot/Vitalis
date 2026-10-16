import { useMemo, useState } from 'react'
import {
  LayoutDashboard,
  NotebookPen,
  Salad,
  Settings,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { computeTargets } from './lib/nutrition'
import { dayTotals, useApp } from './lib/store'
import { todayISO } from './lib/dates'
import { Dashboard } from './components/Dashboard'
import { Diary } from './components/Diary'
import { MealPlanView } from './components/MealPlanView'
import { Progress } from './components/Progress'
import { ProfileView } from './components/ProfileView'
import { Onboarding } from './components/Onboarding'
import { ToastProvider } from './components/ui'

type Tab = 'dashboard' | 'diary' | 'plan' | 'progress' | 'profile'

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Today', icon: <LayoutDashboard size={17} /> },
  { id: 'diary', label: 'Diary', icon: <NotebookPen size={17} /> },
  { id: 'plan', label: 'Meal plans', icon: <Salad size={17} /> },
  { id: 'progress', label: 'Progress', icon: <TrendingUp size={17} /> },
  { id: 'profile', label: 'Profile', icon: <Settings size={17} /> },
]

export default function App() {
  const app = useApp()
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <ToastProvider>
      {!app.profile ? (
        <Onboarding />
      ) : (
        <Shell tab={tab} onTab={setTab} />
      )}
    </ToastProvider>
  )
}

function Shell({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const app = useApp()
  const profile = app.profile!
  const targets = useMemo(() => computeTargets(profile), [profile])
  const totals = useMemo(() => dayTotals(todayISO()), [app])
  const remaining = targets.kcal - totals.kcal

  return (
    <div className="app">
      <aside className="nav">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={19} />
          </div>
          <div>
            <div className="brand-name">Vitalis</div>
            <div className="brand-sub">Macros &amp; plans</div>
          </div>
        </div>

        <nav className="nav-links">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-link${tab === item.id ? ' is-active' : ''}`}
              onClick={() => onTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="nav-foot">
          <div className="nav-card">
            <strong>
              {Math.abs(Math.round(remaining)).toLocaleString()} kcal {remaining >= 0 ? 'left today' : 'over today'}
            </strong>
            {targets.kcal.toLocaleString()} kcal target · {targets.protein} g protein
          </div>
          <div className="nav-card">
            <strong>{profile.name}</strong>
            {profile.goal === 'lose' ? 'Fat loss' : profile.goal === 'gain' ? 'Muscle gain' : 'Maintenance'} ·{' '}
            {profile.diet === 'non-veg' ? 'Non-veg' : profile.diet === 'vegetarian' ? 'Vegetarian' : 'Vegan'}
          </div>
        </div>
      </aside>

      <main className="main">
        {tab === 'dashboard' ? <Dashboard onNavigate={(t) => onTab(t as Tab)} /> : null}
        {tab === 'diary' ? <Diary /> : null}
        {tab === 'plan' ? <MealPlanView /> : null}
        {tab === 'progress' ? <Progress /> : null}
        {tab === 'profile' ? <ProfileView onReset={() => onTab('dashboard')} /> : null}
      </main>

      <nav className="mobile-nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => onTab(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
