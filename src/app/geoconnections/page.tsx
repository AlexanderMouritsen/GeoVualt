import { GameShell } from '@/components/game/GameShell'

export default function GeoConnectionsPage() {
  return (
    <GameShell title="GeoConnections" accent="var(--gv-geoconnections)" accentLight="#FAEEDA">
      <h2 className="text-lg font-semibold text-stone-800">GeoConnections</h2>
      <p className="mt-2 text-sm text-stone-600">Find sets of tiles that belong to the same country.</p>
      <p className="mt-4 text-sm text-stone-500">This mode is currently in beta scope for launch.</p>
    </GameShell>
  )
}
