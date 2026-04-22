import type { Request, Response } from 'express'
import * as categoryModel from '../models/categoryModel'
import * as userModel from '../models/userModel'
import * as accessControl from '../services/accessControlService'
import ROLES from '../constants/ROLES'

const PROTECTED_TEAM_KEYS = new Set([
  'email_team',
  'vc_team',
  'infra_team',
  'network_team',
  'security_team',
  'sap_team',
  'gc_master_team',
  'reports_team',
])

async function getCategories(req: Request, res: Response): Promise<void> {
  try {
    const rows = await categoryModel.findAll()

    const grouped: Record<string, { type_key: string; type_name: string; categories: object[] }> = {}
    rows.forEach(row => {
      if (row.is_team) {
        return
      }
      const key = row.type_key as string
      if (!grouped[key]) {
        grouped[key] = { type_key: key, type_name: row.type_name ?? '', categories: [] }
      }
      grouped[key].categories.push({
        id:               row.id,
        name:             row.name,
        category_key:     row.category_key,
        default_priority: row.default_priority,
        requires_approval: row.requires_approval,
        assigned_team_key: row.assigned_team_key,
      })
    })

    res.status(200).json({ success: true, types: Object.values(grouped) })
  } catch (err) {
    console.error('getCategories error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getEmployeesByCategory(req: Request, res: Response): Promise<void> {
  try {
    const categoryId = Number(req.params.categoryId)
    if (!categoryId) {
      res.status(400).json({ success: false, message: 'Invalid category ID.' }); return
    }

    const category = await categoryModel.findById(categoryId)
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found.' }); return
    }

    // Use centralized access control service
    const canView = await accessControl.canViewCategoryEmployees(
      req.user.id,
      req.user.role,
      categoryId
    )

    if (!canView) {
      res.status(403).json({ success: false, message: 'Access denied for this category.' }); return
    }

    // Determine the effective team ID (for team mapping)
    const teamId = category.is_team
      ? category.id
      : category.assigned_team_key
        ? (await categoryModel.findByKey(category.assigned_team_key))?.id
        : categoryId

    const employees = await userModel.findEmployeesByCategory(teamId ?? categoryId)
    res.status(200).json({ success: true, employees })
  } catch (err) {
    console.error('getEmployeesByCategory error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function getTeams(req: Request, res: Response): Promise<void> {
  try {
    const rows = await categoryModel.findTeams()
    const teams = rows.map(row => ({
      id: row.id,
      name: row.name,
      category_key: row.category_key,
      manager_user_id: row.manager_user_id,
      manager_name: row.manager_name ?? null,
    }))

    res.status(200).json({ success: true, teams })
  } catch (err) {
    console.error('getTeams error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function createTeam(req: Request, res: Response): Promise<void> {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const providedKey = typeof req.body?.category_key === 'string' ? req.body.category_key.trim() : ''
    const managerUserId = Number(req.body?.manager_user_id)

    if (!name) {
      res.status(400).json({ success: false, message: 'Team name is required.' })
      return
    }

    if (!Number.isFinite(managerUserId) || managerUserId <= 0) {
      res.status(400).json({ success: false, message: 'manager_user_id is required.' })
      return
    }

    const manager = await userModel.findById(managerUserId)
    if (!manager || manager.role !== 'manager' || !manager.is_active) {
      res.status(400).json({ success: false, message: 'Selected manager is invalid or inactive.' })
      return
    }

    const baseKey = (providedKey || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')

    if (!baseKey) {
      res.status(400).json({ success: false, message: 'Team key is required.' })
      return
    }

    let categoryKey = baseKey
    let suffix = 1
    while (await categoryModel.findByKey(categoryKey)) {
      categoryKey = `${baseKey}_${suffix}`
      suffix += 1
    }

    const complaintBaseKey = `${categoryKey}_complaint`
    let complaintCategoryKey = complaintBaseKey
    let complaintSuffix = 1
    while (await categoryModel.findByKey(complaintCategoryKey)) {
      complaintCategoryKey = `${complaintBaseKey}_${complaintSuffix}`
      complaintSuffix += 1
    }

    const created = await categoryModel.createTeamWithComplaintCategory(
      name,
      categoryKey,
      managerUserId,
      complaintCategoryKey
    )

    res.status(201).json({
      success: true,
      team: {
        id: created.team.id,
        name: created.team.name,
        category_key: created.team.category_key,
        manager_user_id: created.team.manager_user_id,
        manager_name: manager.name,
      },
      complaint_category: {
        id: created.complaintCategory.id,
        name: created.complaintCategory.name,
        category_key: created.complaintCategory.category_key,
        assigned_team_key: created.complaintCategory.assigned_team_key,
      },
    })
  } catch (err) {
    const pgErr = err as { code?: string }
    if (pgErr.code === '23505') {
      res.status(409).json({ success: false, message: 'Category key already exists. Please retry.' })
      return
    }
    console.error('createTeam error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

async function deleteTeam(req: Request, res: Response): Promise<void> {
  try {
    const teamId = Number(req.params.teamId)
    if (!teamId) {
      res.status(400).json({ success: false, message: 'Invalid team ID.' })
      return
    }

    const team = await categoryModel.findById(teamId)
    if (!team || !team.is_team) {
      res.status(404).json({ success: false, message: 'Team not found.' })
      return
    }

    if (PROTECTED_TEAM_KEYS.has(team.category_key)) {
      res.status(403).json({ success: false, message: 'Built-in teams cannot be deleted.' })
      return
    }

    const dependencies = await categoryModel.findTeamDependencies(teamId)
    const mappedDependencies = await categoryModel.findMappedCategoryDependencies(team.category_key)
    if (
      dependencies.users > 0 ||
      dependencies.assets > 0 ||
      dependencies.tickets > 0 ||
      mappedDependencies.tickets > 0
    ) {
      res.status(409).json({
        success: false,
        message: 'This team still has users, assets, or tickets assigned to it.',
      })
      return
    }

    const deleted = await categoryModel.deleteTeamById(teamId, team.category_key)
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Team not found.' })
      return
    }

    res.status(200).json({
      success: true,
      message: mappedDependencies.categories > 0
        ? 'Team and mapped categories deleted successfully.'
        : 'Team deleted successfully.',
    })
  } catch (err) {
    const pgErr = err as { code?: string }
    if (pgErr.code === '23503') {
      res.status(409).json({ success: false, message: 'Team categories still have linked tickets and cannot be deleted.' })
      return
    }
    console.error('deleteTeam error:', err)
    res.status(500).json({ success: false, message: 'Internal server error.' })
  }
}

export { getCategories, getEmployeesByCategory, getTeams, createTeam, deleteTeam }
