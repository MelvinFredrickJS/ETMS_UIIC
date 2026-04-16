import type { Request, Response } from 'express'
import * as categoryModel from '../models/categoryModel'
import * as userModel from '../models/userModel'

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
    const teamId = category?.is_team
      ? category.id
      : category?.assigned_team_key
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

export { getCategories, getEmployeesByCategory, getTeams }
