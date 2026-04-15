import type { Request, Response } from 'express'
import * as reportModel from '../models/reportModel'

async function getTopFailingDevices(req: Request, res: Response): Promise<void> {
  try {
    const limit = Number(req.query.limit ?? 10)

    if (isNaN(limit) || limit < 1 || limit > 50) {
      res.status(400).json({ success: false, message: 'limit must be between 1 and 50.' }); return
    }

    const devices = await reportModel.getTopFailingDevices(limit)
    res.status(200).json({ success: true, devices })
  } catch (err) {
    console.error('getTopFailingDevices error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

export { getTopFailingDevices }
