import { getDashboardStats } from '../models/solicitudModel.js';
import { isPrivileged, getVisibleDelegacionIds } from '../utils/solicitudPermissions.js';

export const getDashboard = async (req, res, next) => {
  try {
    let delegacionIds = null;

    if (!isPrivileged(req.user)) {
      delegacionIds = await getVisibleDelegacionIds(req.user);
      if (Array.isArray(delegacionIds) && delegacionIds.length === 0) {
        return res.json({ porEstado: [], porRamo: [], ultimas: [], delegacion_ids: [] });
      }
    }

    const stats = await getDashboardStats(delegacionIds);
    res.json({ ...stats, delegacion_ids: delegacionIds });
  } catch (error) {
    next(error);
  }
};
