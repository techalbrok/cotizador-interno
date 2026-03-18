import { getDashboardStats } from '../models/solicitudModel.js';

export const getDashboard = async (req, res, next) => {
  try {
    const delegacion_id = req.user.rol === 'operador' ? req.user.delegacion_id : null;
    const stats = await getDashboardStats(delegacion_id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
