import React, { useState } from 'react';

export default function AdminRecalculation() {
  const [type, setType] = useState('all');
  const [mode, setMode] = useState('both');
  const [tournamentId, setTournamentId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRecalc() {
    setLoading(true);
    setError('');
    setLogs([]);
    try {
      const res = await fetch('/api/admin/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          mode,
          tournamentId: tournamentId ? Number(tournamentId) : undefined,
          playerId: playerId ? Number(playerId) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: 24, background: '#fff', borderRadius: 8 }}>
      <h2>Admin: Tournament/Points Recalculation</h2>
      <div style={{ margin: '1rem 0' }}>
        <label>Type:&nbsp;
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="all">All</option>
            <option value="tour">Tour</option>
            <option value="major">Major</option>
            <option value="league">League</option>
            <option value="supr">Supr</option>
          </select>
        </label>
        &nbsp;&nbsp;
        <label>Mode:&nbsp;
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="both">Both</option>
            <option value="gross">Gross</option>
            <option value="net">Net</option>
          </select>
        </label>
      </div>
      <div style={{ margin: '1rem 0' }}>
        <label>Tournament ID:&nbsp;
          <input type="number" value={tournamentId} onChange={e => setTournamentId(e.target.value)} placeholder="(optional)" />
        </label>
        &nbsp;&nbsp;
        <label>Player ID:&nbsp;
          <input type="number" value={playerId} onChange={e => setPlayerId(e.target.value)} placeholder="(optional)" />
        </label>
      </div>
      <button onClick={handleRecalc} disabled={loading} style={{ padding: '0.5rem 1.5rem', fontWeight: 600 }}>
        {loading ? 'Recalculating...' : 'Run Recalculation'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      <div style={{ marginTop: 24 }}>
        <h4>Logs:</h4>
        <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
          {logs.length ? JSON.stringify(logs, null, 2) : 'No logs yet.'}
        </pre>
      </div>
    </div>
  );
}
