import { GameShell } from '@/components/game/GameShell'

export default function GeoGridPage() {
  return (
    <GameShell title="GeoGrid" accent="var(--gv-geogrid)" accentLight="#E6F1FB">
      <h2 className="text-lg font-semibold text-stone-800">GeoGrid</h2>
      <p className="mt-2 text-sm text-stone-600">Fill each grid cell with a country that matches row and column rules.</p>
      <p className="mt-4 text-sm text-stone-500">Category generation and rarity scoring are next.</p>
    </GameShell>
  )
}
