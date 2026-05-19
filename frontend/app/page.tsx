export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Token Distribution Protocol
        </h1>
        <p className="text-zinc-400 text-lg max-w-md">
          Create, manage, and claim token vesting streams on Solana.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
        {[
          {
            title: "Create Stream",
            description: "Set up a new vesting schedule for a recipient.",
            href: "/streams/create",
          },
          {
            title: "My Streams",
            description: "View and withdraw from your active vesting streams.",
            href: "/streams",
          },
          {
            title: "Cancel Stream",
            description: "Cancel an outstanding stream and reclaim tokens.",
            href: "/streams/cancel",
          },
        ].map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            <h2 className="font-semibold text-zinc-50">{card.title}</h2>
            <p className="text-sm text-zinc-400">{card.description}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
