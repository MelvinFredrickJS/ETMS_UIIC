const reportModel = require('../models/reportModel')

async function getTopFailingDevices(req, res) {
  try {
    const limit = Number(req.query.limit || 10)

    if (isNaN(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({ success: false, message: 'limit must be between 1 and 50.' })
    }

    const devices = await reportModel.getTopFailingDevices(limit)
    return res.status(200).json({ success: true, devices })
  } catch (err) {
    console.error('getTopFailingDevices error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

module.exports = { getTopFailingDevices }
