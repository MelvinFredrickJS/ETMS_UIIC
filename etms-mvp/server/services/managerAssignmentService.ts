// Resolve approval manager by category domain mapping.
// Each request category owns a specific manager via ticket_categories.manager_user_id.
// 
// DEPRECATED: This service is now a thin wrapper around ManagerService.
// Use ManagerService directly for new code.

import { ManagerService } from './managerService'
import ROLES from '../constants/ROLES'

interface ManagerRow {
  id: number
  name: string
  email: string
}

/**
 * @deprecated Use ManagerService.getManagerForCategory() instead
 */
export async function getApprovalManagerForCategory(categoryId: number): Promise<ManagerRow> {
  try {
    const manager = await ManagerService.getManagerForCategory(categoryId)
    
    if (!manager) {
      throw new Error('No active domain manager configured for this category.')
    }

    return {
      id: manager.id,
      name: manager.name,
      email: manager.email
    }
  } catch (error) {
    console.error('Error in getApprovalManagerForCategory:', error)
    throw new Error('No active domain manager configured for this category.')
  }
}
