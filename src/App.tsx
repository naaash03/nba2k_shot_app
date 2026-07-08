function App() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-between px-6 py-10 text-center">
      <header className="pt-16">
        <p className="text-xs uppercase tracking-[0.35em] text-chalk-dim">
          Jumpshot Timing Trainer
        </p>
        <h1 className="mt-3 font-display text-6xl font-bold uppercase tracking-tight">
          Green<span className="text-green-signal">Rep</span>
        </h1>
      </header>

      <main className="flex flex-col items-center gap-4">
        <div className="h-2 w-40 overflow-hidden rounded-full bg-court-800">
          <div className="h-full w-1/3 rounded-full bg-green-signal" />
        </div>
        <p className="max-w-xs text-sm text-chalk-dim">
          Build-aware hold-and-release reps for your jumper — coming online phase by phase.
        </p>
      </main>

      <footer className="pb-4">
        <p className="text-xs text-chalk-dim">
          Fan-made training tool. Not affiliated with 2K, Take-Two, or the NBA.
        </p>
      </footer>
    </div>
  )
}

export default App
