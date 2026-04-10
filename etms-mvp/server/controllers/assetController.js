const assetModel    = require('../models/assetModel')
const categoryModel = require('../models/categoryModel')
const userModel     = require('../models/userModel')
const ROLES         = require('../constants/ROLES')

async function getMyAssets(req, res) {
  try {
    const assets = await assetModel.findByAssignedUser(req.user.id)
    return res.status(200).json({ success: true, assets })
  } catch (err) {
    console.error('getMyAssets error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getAssetById(req, res) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ success: false, message: 'Invalid asset ID.' })

    const asset = await assetModel.findById(id)
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' })

    const { role, id: userId } = req.user

    if (role === ROLES.ADMIN) {
      return res.status(200).json({ success: true, asset })
    }

    if (role === ROLES.EMPLOYEE) {
      if (asset.assigned_to !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied.' })
      }
      return res.status(200).json({ success: true, asset })
    }

    if (role === ROLES.MANAGER) {
      // Manager can view assets they manage (by category) or assets assigned to them
      const managedCategories = await categoryModel.findByManagerId(userId)
      const managedCategoryIds = managedCategories.map(c => c.id)
      if (managedCategoryIds.includes(asset.category_id) || asset.assigned_to === userId) {
        return res.status(200).json({ success: true, asset })
      }
      return res.status(403).json({ success: false, message: 'Access denied.' })
    }

    return res.status(403).json({ success: false, message: 'Access denied.' })
  } catch (err) {
    console.error('getAssetById error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function createAsset(req, res) {
  try {
    const { name, serial_number, category_id, assigned_to, status } = req.body

    if (!name || !serial_number || !category_id || !assigned_to) {
      return res.status(400).json({ success: false, message: 'name, serial_number, category_id, and assigned_to are required.' })
    }

    const category = await categoryModel.findById(Number(category_id))
    if (!category) {
      return res.status(400).json({ success: false, message: 'Category not found.' })
    }

    const existing = await assetModel.findBySerial(serial_number)
    if (existing) {
      return res.status(409).json({ success: false, message: 'Serial number already in use.' })
    }

    const targetUser = await userModel.findById(Number(assigned_to))
    if (!targetUser || !targetUser.is_active) {
      return res.status(400).json({ success: false, message: 'Assigned user not found or inactive.' })
    }

    const asset = await assetModel.create({
      name,
      serial_number,
      category_id: Number(category_id),
      assigned_to: Number(assigned_to),
      status: status || 'active',
    })

    return res.status(201).json({ success: true, asset })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Serial number already in use.' })
    }
    console.error('createAsset error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function updateAssetStatus(req, res) {
  try {
    const id     = Number(req.params.id)
    const { status } = req.body

    const VALID_STATUSES = ['active', 'under_repair', 'retired']
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}` })
    }

    const asset = await assetModel.findById(id)
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' })

    if (req.user.role === ROLES.MANAGER) {
      const managedCategories = await categoryModel.findByManagerId(req.user.id)
      const managedCategoryIds = managedCategories.map(c => c.id)
      if (!managedCategoryIds.includes(asset.category_id) && asset.assigned_to !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied.' })
      }
    }

    const updated = await assetModel.updateStatus(id, status)
    return res.status(200).json({ success: true, asset: updated })
  } catch (err) {
    console.error('updateAssetStatus error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function transferAsset(req, res) {
  try {
    const id = Number(req.params.id)
    const { to_user_id, note } = req.body

    if (!to_user_id) {
      return res.status(400).json({ success: false, message: 'to_user_id is required.' })
    }

    const asset = await assetModel.findById(id)
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' })

    if (asset.status === 'under_repair') {
      return res.status(400).json({ success: false, message: 'Cannot transfer an asset that is under repair.' })
    }
    if (Number(asset.assigned_to) === Number(to_user_id)) {
      return res.status(400).json({ success: false, message: 'Asset is already assigned to this user.' })
    }

    const targetUser = await userModel.findById(Number(to_user_id))
    if (!targetUser || !targetUser.is_active || targetUser.role !== ROLES.EMPLOYEE) {
      return res.status(400).json({ success: false, message: 'Target user must be an active employee.' })
    }

    if (req.user.role === ROLES.MANAGER) {
      const managedCategories = await categoryModel.findByManagerId(req.user.id)
      const managedCategoryIds = managedCategories.map(c => c.id)
      if (!managedCategoryIds.includes(asset.category_id) && asset.assigned_to !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied.' })
      }
    }

    const updated = await assetModel.transferOwnership({
      asset_id:       id,
      from_user_id:   asset.assigned_to,
      to_user_id:     Number(to_user_id),
      transferred_by: req.user.id,
      note:           note || null,
    })

    return res.status(200).json({ success: true, message: 'Asset transferred successfully', asset: updated })
  } catch (err) {
    console.error('transferAsset error:', err)
    return res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

module.exports = { getMyAssets, getAssetById, createAsset, updateAssetStatus, transferAsset }
