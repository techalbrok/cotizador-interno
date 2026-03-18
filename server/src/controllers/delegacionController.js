import { getAllDelegaciones } from '../models/delegacionModel.js';

export const listDelegaciones = async (req, res, next) => {
  try {
    const delegaciones = await getAllDelegaciones();
    res.json(delegaciones);
  } catch (error) {
    next(error);
  }
};
