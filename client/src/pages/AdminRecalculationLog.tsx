import React, { useEffect, useState } from 'react';

export default function AdminRecalculationLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/recalculate-logs');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unknown error');
        setLogs(data.logs || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: '2rem auto', padding: 24, background: '#fff', borderRadius: 8 }}>
      <h2>Recalculation Logs (Super Admin Only)</h2>
      {loading && <div>Loading logs...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ marginTop: 24 }}>
        <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 400, overflow: 'auto' }}>
          {logs.length ? JSON.stringify(logs, null, 2) : 'No logs yet.'}
        </pre>
      </div>
    </div>
  );
}
