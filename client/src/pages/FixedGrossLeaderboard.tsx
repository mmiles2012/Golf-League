// This is a temporary file to fix the gross leaderboard display
// The change needed is to replace player.totalPoints with player.grossTotalPoints
// for the gross leaderboard on the dashboard

<tr key={player.player.id} className="border-b border-neutral-100">
  <td className="py-3 pl-0 pr-2 whitespace-nowrap text-sm font-medium">
    {player.rank}
  </td>
  <td className="px-2 py-3 whitespace-nowrap text-sm">
    <Link href={`/players/${player.player.id}`}>
      <a className="hover:text-primary font-medium">{player.player.name}</a>
    </Link>
  </td>
  <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
    {player.totalEvents}
  </td>
  <td className="px-2 py-3 whitespace-nowrap text-sm text-right font-medium">
    {(player.grossTotalPoints || 0).toLocaleString()}
  </td>
</tr>