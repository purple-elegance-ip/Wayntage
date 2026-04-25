export default function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-zinc-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight text-zinc-900">Wayntage</span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">Beta</span>
        </a>
        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <a href="#" className="hover:text-zinc-900">How it works</a>
          <a href="#" className="hover:text-zinc-900">For agents</a>
          <a
            href="/dashboard"
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            My address
          </a>
        </div>
      </div>
    </nav>
  )
}
