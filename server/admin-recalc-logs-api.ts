import { recalculationLogs } from './recalculation-service';

export async function adminRecalcLogsHandler(req: any, res: any) {
  // TODO: Add super admin authentication/authorization here
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    res.status(200).json({ logs: recalculationLogs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
