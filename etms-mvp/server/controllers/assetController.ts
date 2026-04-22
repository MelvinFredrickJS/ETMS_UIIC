import type { Request, Response } from 'express'
import * as assetModel from '../models/assetModel'
import * as categoryModel from '../models/categoryModel'
import * as userModel from '../models/userModel'
import ROLES from '../constants/ROLES'
import type { Role } from '../types'

async function isInfraTeamMember(userId: number): Promise<boolean> {
  const user = await userModel.findById(userId)
  if (!user || user.role !== ROLES.EMPLOYEE || !user.category_id) return false

  const category = await categoryModel.findById(user.category_id)
  return Boolean(category && category.category_key === 'infra_team')
}

async function getInfraTeamCategoryId(): Promise<number | null> {
  const infraTeam = await categoryModel.findByKey('infra_team')
  return infraTeam?.id ?? null
}

async function isInfraManager(userId: number): Promise<boolean> {
  const managed = await categoryModel.findByManagerId(userId)
  return managed.some(c => c.category_key === 'infra_team')
}

async function getAllAssets(req: Request, res: Response): Promise<void> {
  try {
    const role = req.user.role as Role
    let category_ids: number[] | undefined

    if (role === ROLES.MANAGER) {
      const infraManager = await isInfraManager(req.user.id)
      if (!infraManager) {
        res.status(403).json({ success: false, message: 'Only Infra Manager can manage assets.' }); return
      }
      category_ids = undefined
    } else if (role === ROLES.EMPLOYEE) {
      const isInfra = await isInfraTeamMember(req.user.id)
      if (!isInfra) {
        res.status(403).json({ success: false, message: 'Access denied.' }); return
      }
      const infraCategoryId = await getInfraTeamCategoryId()
      category_ids = infraCategoryId ? [infraCategoryId] : []
    }
    // ADMIN gets all — no filter

    const assets = await assetModel.findAll(category_ids)
    res.status(200).json({ success: true, assets })
  } catch (err) {
    console.error('getAllAssets error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getAssetHistory(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    if (!id) { res.status(400).json({ success: false, message: 'Invalid asset ID.' }); return }

    const asset = await assetModel.findById(id)
    if (!asset) { res.status(404).json({ success: false, message: 'Asset not found.' }); return }

    // Access check — admin sees all, manager sees their category, infra team employees see infra assets.
    const role = req.user.role as Role
    if (role === ROLES.MANAGER) {
      const infraManager = await isInfraManager(req.user.id)
      if (!infraManager) {
        res.status(403).json({ success: false, message: 'Access denied.' }); return
      }
    } else if (role === ROLES.EMPLOYEE) {
      const isInfra = await isInfraTeamMember(req.user.id)
      const infraCategoryId = await getInfraTeamCategoryId()
      if (!isInfra || !infraCategoryId || asset.category_id !== infraCategoryId) {
        res.status(403).json({ success: false, message: 'Access denied.' }); return
      }
    }

    const history = await assetModel.getHistory(id)
    res.status(200).json({ success: true, history })
  } catch (err) {
    console.error('getAssetHistory error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getMyAssets(req: Request, res: Response): Promise<void> {
  try {
    const assets = await assetModel.findByAssignedUser(req.user.id)
    res.status(200).json({ success: true, assets })
  } catch (err) {
    console.error('getMyAssets error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getAssetById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    if (!id) { res.status(400).json({ success: false, message: 'Invalid asset ID.' }); return }

    const asset = await assetModel.findById(id)
    if (!asset) { res.status(404).json({ success: false, message: 'Asset not found.' }); return }

    const role = req.user.role as Role
    const userId = req.user.id

    if (role === ROLES.ADMIN) { res.status(200).json({ success: true, asset }); return }

    if (role === ROLES.EMPLOYEE) {
      if (asset.assigned_to !== userId) { res.status(403).json({ success: false, message: 'Access denied.' }); return }
      res.status(200).json({ success: true, asset }); return
    }

    if (role === ROLES.MANAGER) {
      const infraManager = await isInfraManager(userId)
      if (infraManager) {
        res.status(200).json({ success: true, asset }); return
      }
      res.status(403).json({ success: false, message: 'Access denied.' }); return
    }

    res.status(403).json({ success: false, message: 'Access denied.' })
  } catch (err) {
    console.error('getAssetById error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function createAsset(req: Request, res: Response): Promise<void> {
  try {
    const { name, serial_number, category_id, assigned_to, status } = req.body as {
      name?: string; serial_number?: string; category_id?: string; assigned_to?: string; status?: string
    }

    if (!name || !serial_number || !category_id || !assigned_to) {
      res.status(400).json({ success: false, message: 'name, serial_number, category_id, and assigned_to are required.' }); return
    }

    const category = await categoryModel.findById(Number(category_id))
    if (!category) { res.status(400).json({ success: false, message: 'Category not found.' }); return }

    const existing = await assetModel.findBySerial(serial_number)
    if (existing) { res.status(409).json({ success: false, message: 'Serial number already in use.' }); return }

    const targetUser = await userModel.findById(Number(assigned_to))
    if (!targetUser || !targetUser.is_active) {
      res.status(400).json({ success: false, message: 'Assigned user not found or inactive.' }); return
    }

    const asset = await assetModel.create({
      name, serial_number,
      category_id: Number(category_id),
      assigned_to: Number(assigned_to),
      status: status ?? 'active',
    })

    res.status(201).json({ success: true, asset })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === '23505') {
      res.status(409).json({ success: false, message: 'Serial number already in use.' }); return
    }
    console.error('createAsset error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function updateAssetStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    const { status } = req.body as { status?: string }

    const VALID_STATUSES = ['active', 'under_repair', 'retired']
    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}` }); return
    }

    const asset = await assetModel.findById(id)
    if (!asset) { res.status(404).json({ success: false, message: 'Asset not found.' }); return }

    if (req.user.role === ROLES.MANAGER) {
      const infraManager = await isInfraManager(req.user.id)
      if (!infraManager) {
        res.status(403).json({ success: false, message: 'Only Infra Manager can update asset status.' }); return
      }
    }

    if (req.user.role === ROLES.EMPLOYEE) {
      const isInfra = await isInfraTeamMember(req.user.id)
      const infraCategoryId = await getInfraTeamCategoryId()
      if (!isInfra || !infraCategoryId || asset.category_id !== infraCategoryId) {
        res.status(403).json({ success: false, message: 'Only infra team members can update this asset status.' }); return
      }
      if (status !== 'under_repair') {
        res.status(400).json({ success: false, message: 'Infra team members can only flag assets as under_repair.' }); return
      }
    }

    const updated = await assetModel.updateStatus(id, status)
    res.status(200).json({ success: true, asset: updated })
  } catch (err) {
    console.error('updateAssetStatus error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function transferAsset(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    const { to_user_id, note } = req.body as { to_user_id?: string; note?: string }

    if (!to_user_id) { res.status(400).json({ success: false, message: 'to_user_id is required.' }); return }
    if (note && String(note).length > 500) {
      res.status(400).json({ success: false, message: 'note must be at most 500 characters.' }); return
    }

    const asset = await assetModel.findById(id)
    if (!asset) { res.status(404).json({ success: false, message: 'Asset not found.' }); return }

    if (asset.status === 'under_repair') {
      res.status(400).json({ success: false, message: 'Cannot transfer an asset that is under repair.' }); return
    }
    if (Number(asset.assigned_to) === Number(to_user_id)) {
      res.status(400).json({ success: false, message: 'Asset is already assigned to this user.' }); return
    }

    const targetUser = await userModel.findById(Number(to_user_id))
    if (!targetUser || !targetUser.is_active || targetUser.role !== ROLES.EMPLOYEE) {
      res.status(400).json({ success: false, message: 'Target user must be an active employee.' }); return
    }

    if (req.user.role === ROLES.MANAGER) {
      const infraManager = await isInfraManager(req.user.id)
      if (!infraManager) {
        res.status(403).json({ success: false, message: 'Only Infra Manager can transfer assets.' }); return
      }
    }

    if (req.user.role === ROLES.EMPLOYEE) {
      const isInfra = await isInfraTeamMember(req.user.id)
      const infraCategoryId = await getInfraTeamCategoryId()
      if (!isInfra || !infraCategoryId || asset.category_id !== infraCategoryId) {
        res.status(403).json({ success: false, message: 'Only infra team members can initiate this transfer.' }); return
      }
      if (Number(asset.assigned_to) !== Number(req.user.id)) {
        res.status(403).json({ success: false, message: 'Infra team members can only transfer assets currently assigned to themselves.' }); return
      }
    }

    const updated = await assetModel.transferOwnership({
      asset_id:       id,
      from_user_id:   asset.assigned_to,
      to_user_id:     Number(to_user_id),
      transferred_by: req.user.id,
      note:           note ?? null,
    })

    res.status(200).json({ success: true, message: 'Asset transferred successfully', asset: updated })
  } catch (err) {
    console.error('transferAsset error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

export { getAllAssets, getAssetHistory, getMyAssets, getAssetById, createAsset, updateAssetStatus, transferAsset }
