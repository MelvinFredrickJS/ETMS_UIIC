/**
 * Access Control Service
 * 
 * Centralized service for managing all access control and permissions
 * across the ETMS application.
 * 
 * Business Rules:
 * 1. ADMIN: Full access to everything
 * 2. MANAGER: Access to categories they manage (explicit ownership)
 * 3. EMPLOYEE: Access to their own category and tickets
 * 4. DATA_TEAM: Restricted access to assigned tickets only
 * 
 * Category Ownership:
 * - If category.manager_user_id is set → ONLY that manager can access
 * - Employees can only access their assigned category
 * 
 * Asset Management:
 * - Only managers of 'infra_team' can manage assets
 */

import pool from '../config/db'
import * as categoryModel from '../models/categoryModel'
import { ManagerService } from './managerService'
import ROLES from '../constants/ROLES'
import type { Role, TicketRow, CategoryRow } from '../types'

// =====================================================
// Permission Checking
// =====================================================

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: number,
  role: Role,
  permissionKey: string
): Promise<boolean> {
  try {
    const { rows } = await pool.query<{ has_permission: boolean }>(
      'SELECT has_permission($1, $2, $3) as has_permission',
      [userId, role, permissionKey]
    )
    return rows[0]?.has_permission ?? false
  } catch (err) {
    console.error('hasPermission error:', err)
    return false
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  userId: number,
  role: Role
): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ permission_key: string; granted: boolean }>(
      'SELECT * FROM get_user_permissions($1, $2)',
      [userId, role]
    )
    return rows.filter(r => r.granted).map(r => r.permission_key)
  } catch (err) {
    console.error('getUserPermissions error:', err)
    return []
  }
}

// =====================================================
// Category Access Control
// =====================================================

/**
 * Check if user can access a specific category
 * 
 * Rules:
 * - ADMIN: Can access all categories
 * - MANAGER: Can access categories they explicitly manage (manager_user_id)
 * - EMPLOYEE: Can access only their assigned category
 * - DATA_TEAM: No category access
 */
export async function canAccessCategory(
  userId: number,
  role: Role,
  categoryId: number
): Promise<boolean> {
  // Admin has full access
  if (role === ROLES.ADMIN) {
    return true
  }

  // Data team has no category access
  if (role === ROLES.DATA_TEAM) {
    return false
  }

  try {
    const category = await categoryModel.findById(categoryId)
    if (!category) {
      return false
    }

    // Manager: Check explicit ownership only
    if (role === ROLES.MANAGER) {
      return await ManagerService.validateManagerOwnership(userId, categoryId)
    }

    // Employee: Check if this is their assigned category
    if (role === ROLES.EMPLOYEE) {
      const { rows } = await pool.query<{ category_id: number }>(
        'SELECT category_id FROM users WHERE id = $1',
        [userId]
      )
      const userCategoryId = rows[0]?.category_id
      return Number(userCategoryId) === Number(categoryId)
    }

    return false
  } catch (err) {
    console.error('canAccessCategory error:', err)
    return false
  }
}

/**
 * Get all categories a user can access
 */
export async function getAccessibleCategories(
  userId: number,
  role: Role
): Promise<CategoryRow[]> {
  // Admin gets all categories
  if (role === ROLES.ADMIN) {
    return await categoryModel.findAll()
  }

  // Data team gets none
  if (role === ROLES.DATA_TEAM) {
    return []
  }

  // Manager gets explicitly managed categories
  if (role === ROLES.MANAGER) {
    return await ManagerService.getManagedCategories(userId)
  }

  // Employee gets their assigned category
  if (role === ROLES.EMPLOYEE) {
    try {
      const { rows } = await pool.query<{ category_id: number }>(
        'SELECT category_id FROM users WHERE id = $1',
        [userId]
      )
      const categoryId = rows[0]?.category_id
      if (!categoryId) {
        return []
      }
      const category = await categoryModel.findById(categoryId)
      return category ? [category] : []
    } catch (err) {
      console.error('getAccessibleCategories error:', err)
      return []
    }
  }

  return []
}

/**
 * Check if user can view employees in a category
 * 
 * This handles the complex logic from getEmployeesByCategory
 */
export async function canViewCategoryEmployees(
  userId: number,
  role: Role,
  categoryId: number
): Promise<boolean> {
  // Admin can view all
  if (role === ROLES.ADMIN) {
    return true
  }

  // Data team cannot view
  if (role === ROLES.DATA_TEAM) {
    return false
  }

  try {
    const category = await categoryModel.findById(categoryId)
    if (!category) {
      return false
    }

    // Determine the effective team ID (for team mapping)
    const teamId = category.is_team
      ? category.id
      : category.assigned_team_key
        ? (await categoryModel.findByKey(category.assigned_team_key))?.id
        : categoryId

    // Manager: Check explicit ownership
    if (role === ROLES.MANAGER) {
      const managedCategories = await ManagerService.getManagedCategories(userId)
      const managedCategoryIds = new Set(managedCategories.map(c => Number(c.id)))
      
      const requestedCategoryId = Number(categoryId)
      const effectiveCategoryId = Number(teamId ?? categoryId)
      const hasExplicitCategoryOwner = Number(category.manager_user_id ?? 0) > 0

      // If category has explicit owner, only that manager can access
      if (hasExplicitCategoryOwner) {
        return managedCategoryIds.has(requestedCategoryId)
      }

      // Legacy fallback: check both requested and mapped team
      return managedCategoryIds.has(requestedCategoryId) || 
             managedCategoryIds.has(effectiveCategoryId)
    }

    // Employee: Can view employees in their own category
    if (role === ROLES.EMPLOYEE) {
      const { rows } = await pool.query<{ category_id: number }>(
        'SELECT category_id FROM users WHERE id = $1',
        [userId]
      )
      const userCategoryId = rows[0]?.category_id
      return Number(userCategoryId) === Number(categoryId) ||
             Number(userCategoryId) === Number(teamId)
    }

    return false
  } catch (err) {
    console.error('canViewCategoryEmployees error:', err)
    return false
  }
}

// =====================================================
// Ticket Access Control
// =====================================================

/**
 * Check if user can access a specific ticket
 * 
 * Rules:
 * - ADMIN: Can access all tickets
 * - MANAGER: Can access tickets they're approval owner for
 * - EMPLOYEE: Can access tickets they raised or are assigned to
 * - DATA_TEAM: Can access tickets assigned to them only
 */
export async function canAccessTicket(
  userId: number,
  role: Role,
  ticket: TicketRow
): Promise<boolean> {
  // Admin has full access
  if (role === ROLES.ADMIN) {
    return true
  }

  // Check if user raised the ticket
  if (Number(ticket.raised_by) === Number(userId)) {
    return true
  }

  // Check if user is assigned to the ticket
  if (Number(ticket.assigned_to) === Number(userId)) {
    return true
  }

  // Data team can only access assigned tickets (already checked above)
  if (role === ROLES.DATA_TEAM) {
    return false
  }

  // Manager can access tickets they're approval owner for
  if (role === ROLES.MANAGER) {
    return Number(ticket.approval_owner_id) === Number(userId)
  }

  return false
}

/**
 * Check if user can update a ticket's status
 */
export async function canUpdateTicketStatus(
  userId: number,
  role: Role,
  ticket: TicketRow,
  newStatus: string
): Promise<boolean> {
  // Admin can update any ticket
  if (role === ROLES.ADMIN) {
    return true
  }

  // Cannot update terminal statuses
  if (['closed', 'rejected'].includes(ticket.status)) {
    return false
  }

  // Assigned employee can update their tickets
  if (['assigned', 'in_progress'].includes(ticket.status)) {
    return Number(ticket.assigned_to) === Number(userId)
  }

  // Raiser can close or escalate resolved/reported tickets
  if (['resolved', 'reported'].includes(ticket.status)) {
    return Number(ticket.raised_by) === Number(userId)
  }

  // Manager can approve/reject pending tickets
  if (role === ROLES.MANAGER && ticket.status === 'pending_approval') {
    return Number(ticket.approval_owner_id) === Number(userId)
  }

  return false
}

/**
 * Check if user can approve tickets
 */
export async function canApproveTickets(
  userId: number,
  role: Role
): Promise<boolean> {
  if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
    return true
  }
  return await hasPermission(userId, role, 'ticket.approve')
}

/**
 * Check if user can assign tickets
 */
export async function canAssignTickets(
  userId: number,
  role: Role
): Promise<boolean> {
  if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
    return true
  }
  return await hasPermission(userId, role, 'ticket.assign')
}

// =====================================================
// Asset Access Control
// =====================================================

/**
 * Check if user can manage assets
 * 
 * Rule: Only managers of 'infra_team' can manage assets
 */
export async function canManageAssets(
  userId: number,
  role: Role
): Promise<boolean> {
  // Admin can manage all assets
  if (role === ROLES.ADMIN) {
    return true
  }

  // Only managers can manage assets
  if (role !== ROLES.MANAGER) {
    return false
  }

  // Check if manager manages infra_team
  try {
    const managedCategories = await ManagerService.getManagedCategories(userId)
    return managedCategories.some(category => category.category_key === 'infra_team')
  } catch (err) {
    console.error('canManageAssets error:', err)
    return false
  }
}

/**
 * Check if user can view an asset
 */
export async function canViewAsset(
  userId: number,
  role: Role,
  assetId: number
): Promise<boolean> {
  // Admin can view all
  if (role === ROLES.ADMIN) {
    return true
  }

  try {
    const { rows } = await pool.query<{ assigned_to: number; category_id: number }>(
      'SELECT assigned_to, category_id FROM assets WHERE id = $1',
      [assetId]
    )
    const asset = rows[0]
    if (!asset) {
      return false
    }

    // User can view assets assigned to them
    if (Number(asset.assigned_to) === Number(userId)) {
      return true
    }

    // Manager can view assets in categories they manage
    if (role === ROLES.MANAGER) {
      const managedCategories = await ManagerService.getManagedCategories(userId)
      const managedCategoryIds = new Set(managedCategories.map(c => Number(c.id)))
      return managedCategoryIds.has(Number(asset.category_id))
    }

    // Employee can view assets in their category
    if (role === ROLES.EMPLOYEE) {
      const { rows: userRows } = await pool.query<{ category_id: number }>(
        'SELECT category_id FROM users WHERE id = $1',
        [userId]
      )
      const userCategoryId = userRows[0]?.category_id
      return Number(userCategoryId) === Number(asset.category_id)
    }

    return false
  } catch (err) {
    console.error('canViewAsset error:', err)
    return false
  }
}

/**
 * Check if user can transfer assets
 */
export async function canTransferAssets(
  userId: number,
  role: Role
): Promise<boolean> {
  // Same as manage assets
  return await canManageAssets(userId, role)
}

// =====================================================
// Report Access Control
// =====================================================

/**
 * Check if user can view reports
 */
export async function canViewReports(
  userId: number,
  role: Role
): Promise<boolean> {
  // Admin and Manager can view reports
  if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
    return true
  }
  return await hasPermission(userId, role, 'report.view.all')
}

/**
 * Check if user can generate reports
 */
export async function canGenerateReports(
  userId: number,
  role: Role
): Promise<boolean> {
  // Admin and Manager can generate reports
  if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
    return true
  }
  return await hasPermission(userId, role, 'report.generate')
}

// =====================================================
// Data Portal Access Control
// =====================================================

/**
 * Check if user can access data portal
 */
export async function canAccessDataPortal(
  userId: number,
  role: Role
): Promise<boolean> {
  // All roles except regular employee can access data portal
  if (role === ROLES.ADMIN || role === ROLES.DATA_TEAM) {
    return true
  }
  return await hasPermission(userId, role, 'data_portal.access')
}

/**
 * Check if user can upload data files
 */
export async function canUploadData(
  userId: number,
  role: Role
): Promise<boolean> {
  if (role === ROLES.ADMIN || role === ROLES.DATA_TEAM) {
    return true
  }
  return await hasPermission(userId, role, 'data_portal.upload')
}

/**
 * Check if user can download data files
 */
export async function canDownloadData(
  userId: number,
  role: Role
): Promise<boolean> {
  if (role === ROLES.ADMIN || role === ROLES.DATA_TEAM) {
    return true
  }
  return await hasPermission(userId, role, 'data_portal.download')
}

// =====================================================
// Team Management Access Control
// =====================================================

/**
 * Check if user can manage teams
 */
export async function canManageTeams(
  userId: number,
  role: Role
): Promise<boolean> {
  // Only admin can manage teams
  return role === ROLES.ADMIN
}

/**
 * Check if user can view a specific team
 */
export async function canViewTeam(
  userId: number,
  role: Role,
  teamId: number
): Promise<boolean> {
  // Admin can view all teams
  if (role === ROLES.ADMIN) {
    return true
  }

  // Manager can view teams they manage
  if (role === ROLES.MANAGER) {
    const managedCategories = await ManagerService.getManagedCategories(userId)
    const managedTeamIds = new Set(managedCategories.map(c => Number(c.id)))
    return managedTeamIds.has(Number(teamId))
  }

  return false
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Get access control summary for a user
 */
export async function getAccessControlSummary(
  userId: number,
  role: Role
): Promise<{
  canManageAssets: boolean
  canApproveTickets: boolean
  canViewReports: boolean
  canAccessDataPortal: boolean
  accessibleCategoryCount: number
  permissions: string[]
}> {
  const [
    assets,
    approve,
    reports,
    dataPortal,
    categories,
    permissions
  ] = await Promise.all([
    canManageAssets(userId, role),
    canApproveTickets(userId, role),
    canViewReports(userId, role),
    canAccessDataPortal(userId, role),
    getAccessibleCategories(userId, role),
    getUserPermissions(userId, role)
  ])

  return {
    canManageAssets: assets,
    canApproveTickets: approve,
    canViewReports: reports,
    canAccessDataPortal: dataPortal,
    accessibleCategoryCount: categories.length,
    permissions
  }
}

/**
 * Validate category ownership for manager
 */
export async function validateCategoryOwnership(
  managerId: number,
  categoryId: number
): Promise<boolean> {
  try {
    return await ManagerService.validateManagerOwnership(managerId, categoryId)
  } catch (err) {
    console.error('validateCategoryOwnership error:', err)
    return false
  }
}
