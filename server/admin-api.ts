import { RecalculationService, RecalcMode, RecalcType } from './recalculation-service';
import { storage } from './storage-db';
import { NextApiRequest, NextApiResponse } from 'next';

// Example Express/Next.js style handler
export async function adminRecalcHandler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Add admin authentication/authorization here
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { type, tournamentId, playerId, mode } = req.body;
  const pointsConfig = await storage.getPointsConfig();
  const service = new RecalculationService(pointsConfig);
  try {
    if (tournamentId) {
      await service.recalculateTournament({ tournamentId, mode });
    } else if (playerId) {
      await service.recalculatePlayer({ playerId, mode });
    } else {
      await service.recalculateAllTournaments({ type, mode });
    }
    res.status(200).json({ success: true, logs: service.getLogs() });
  } catch (error) {
    res.status(500).json({ error: error.message, logs: service.getLogs() });
  }
}
