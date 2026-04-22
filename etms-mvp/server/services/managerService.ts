import pool from '../config/db';
import { QueryResult } from 'pg';

// Types
export interface ManagerDetails {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  team_key?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface WorkloadStats {
  managerId: number;
  pendingApprovals: number;
  totalCategories: number;
  activeTickets: number;
  avgResponseTime?: number;
}

export interface ManagerAssignmentHistory {
  id: number;
  category_id: number;
  manager_user_id: number;
  action: 'assigned' | 'removed';
  assigned_by: number;
  assigned_at: Date;
  reason?: string;
}

// Cache for manager data (5 minute TTL)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ManagerCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new ManagerCache();

export class ManagerService {
  /**
   * Get manager details by ID with validation
   */
  static async getManagerById(managerId: number): Promise<ManagerDetails | null> {
    const cacheKey = `manager:${managerId}`;
    const cached = cache.get<ManagerDetails>(cacheKey);
    if (cached) return cached;

    try {
      const { rows } = await pool.query<ManagerDetails>(
        `SELECT id, name, email, role, is_active, team_key, created_at, updated_at
         FROM users 
         WHERE id = $1 AND role = 'manager'`,
        [managerId]
      );

      if (rows.length === 0) return null;

      const manager = rows[0];
      cache.set(cacheKey, manager);
      return manager;
    } catch (error) {
      console.error('Error fetching manager by ID:', error);
      throw new Error('Failed to fetch manager details');
    }
  }

  /**
   * Get the manager who should approve tickets for a category
   */
  static async getManagerForCategory(categoryId: number): Promise<ManagerDetails | null> {
    const cacheKey = `manager:category:${categoryId}`;
    const cached = cache.get<ManagerDetails>(cacheKey);
    if (cached) return cached;

    try {
      const { rows } = await pool.query<ManagerDetails>(
        `SELECT u.id, u.name, u.email, u.role, u.is_active, u.team_key, u.created_at, u.updated_at
         FROM ticket_categories tc
         JOIN users u ON tc.manager_user_id = u.id
         WHERE tc.id = $1 AND u.role = 'manager' AND u.is_active = true`,
        [categoryId]
      );

      if (rows.length === 0) return null;

      const manager = rows[0];
      cache.set(cacheKey, manager);
      return manager;
    } catch (error) {
      console.error('Error fetching manager for category:', error);
      throw new Error('Failed to fetch category manager');
    }
  }

  /**
   * Get all categories managed by a specific manager
   */
  static async getManagedCategories(managerId: number): Promise<any[]> {
    const cacheKey = `categories:manager:${managerId}`;
    const cached = cache.get<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const { rows } = await pool.query(
        `SELECT tc.*, t.name as team_name
         FROM ticket_categories tc
         LEFT JOIN teams t ON tc.team_key = t.key
         WHERE tc.manager_user_id = $1
         ORDER BY tc.name`,
        [managerId]
      );

      cache.set(cacheKey, rows);
      return rows;
    } catch (error) {
      console.error('Error fetching managed categories:', error);
      throw new Error('Failed to fetch managed categories');
    }
  }

  /**
   * Validate that a manager owns a specific category
   */
  static async validateManagerOwnership(managerId: number, categoryId: number): Promise<boolean> {
    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM ticket_categories 
         WHERE id = $1 AND manager_user_id = $2`,
        [categoryId, managerId]
      );

      return rows.length > 0;
    } catch (error) {
      console.error('Error validating manager ownership:', error);
      throw new Error('Failed to validate manager ownership');
    }
  }

  /**
   * Check if manager is active
   */
  static async isManagerActive(managerId: number): Promise<boolean> {
    try {
      const manager = await this.getManagerById(managerId);
      return manager ? manager.is_active : false;
    } catch (error) {
      console.error('Error checking manager active status:', error);
      throw new Error('Failed to check manager status');
    }
  }

  /**
   * Get all active managers
   */
  static async getAllActiveManagers(): Promise<ManagerDetails[]> {
    const cacheKey = 'managers:active';
    const cached = cache.get<ManagerDetails[]>(cacheKey);
    if (cached) return cached;

    try {
      const { rows } = await pool.query<ManagerDetails>(
        `SELECT id, name, email, role, is_active, team_key, created_at, updated_at
         FROM users 
         WHERE role = 'manager' AND is_active = true
         ORDER BY name`
      );

      cache.set(cacheKey, rows, 2 * 60 * 1000); // 2 minute cache for active managers
      return rows;
    } catch (error) {
      console.error('Error fetching active managers:', error);
      throw new Error('Failed to fetch active managers');
    }
  }

  /**
   * Get managers by team
   */
  static async getManagersByTeam(teamKey: string): Promise<ManagerDetails[]> {
    const cacheKey = `managers:team:${teamKey}`;
    const cached = cache.get<ManagerDetails[]>(cacheKey);
    if (cached) return cached;

    try {
      const { rows } = await pool.query<ManagerDetails>(
        `SELECT id, name, email, role, is_active, team_key, created_at, updated_at
         FROM users 
         WHERE role = 'manager' AND team_key = $1 AND is_active = true
         ORDER BY name`,
        [teamKey]
      );

      cache.set(cacheKey, rows);
      return rows;
    } catch (error) {
      console.error('Error fetching managers by team:', error);
      throw new Error('Failed to fetch team managers');
    }
  }

  /**
   * Assign manager to category with history tracking
   */
  static async assignManagerToCategory(
    managerId: number, 
    categoryId: number, 
    assignedBy: number, 
    reason?: string
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate manager exists and is active
      const manager = await this.getManagerById(managerId);
      if (!manager || !manager.is_active) {
        throw new Error('Manager not found or inactive');
      }

      // Update category
      await client.query(
        `UPDATE ticket_categories 
         SET manager_user_id = $1, updated_at = NOW() 
         WHERE id = $2`,
        [managerId, categoryId]
      );

      // Add to history
      await client.query(
        `INSERT INTO manager_assignment_history 
         (category_id, manager_user_id, action, assigned_by, assigned_at, reason)
         VALUES ($1, $2, 'assigned', $3, NOW(), $4)`,
        [categoryId, managerId, assignedBy, reason]
      );

      await client.query('COMMIT');

      // Invalidate relevant cache entries
      cache.invalidate(`manager:category:${categoryId}`);
      cache.invalidate(`categories:manager:${managerId}`);
      cache.invalidate('workload');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error assigning manager to category:', error);
      throw new Error('Failed to assign manager to category');
    } finally {
      client.release();
    }
  }

  /**
   * Remove manager from category with history tracking
   */
  static async removeManagerFromCategory(
    categoryId: number, 
    removedBy: number, 
    reason?: string
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current manager for history
      const { rows: currentRows } = await client.query(
        `SELECT manager_user_id FROM ticket_categories WHERE id = $1`,
        [categoryId]
      );

      if (currentRows.length === 0) {
        throw new Error('Category not found');
      }

      const currentManagerId = currentRows[0].manager_user_id;

      // Update category
      await client.query(
        `UPDATE ticket_categories 
         SET manager_user_id = NULL, updated_at = NOW() 
         WHERE id = $1`,
        [categoryId]
      );

      // Add to history if there was a manager
      if (currentManagerId) {
        await client.query(
          `INSERT INTO manager_assignment_history 
           (category_id, manager_user_id, action, assigned_by, assigned_at, reason)
           VALUES ($1, $2, 'removed', $3, NOW(), $4)`,
          [categoryId, currentManagerId, removedBy, reason]
        );
      }

      await client.query('COMMIT');

      // Invalidate relevant cache entries
      cache.invalidate(`manager:category:${categoryId}`);
      if (currentManagerId) {
        cache.invalidate(`categories:manager:${currentManagerId}`);
      }
      cache.invalidate('workload');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error removing manager from category:', error);
      throw new Error('Failed to remove manager from category');
    } finally {
      client.release();
    }
  }

  /**
   * Get manager workload statistics
   */
  static async getManagerWorkload(managerId: number): Promise<WorkloadStats> {
    const cacheKey = `workload:manager:${managerId}`;
    const cached = cache.get<WorkloadStats>(cacheKey);
    if (cached) return cached;

    try {
      // Get pending approvals
      const { rows: approvalRows } = await pool.query(
        `SELECT COUNT(*) as count
         FROM tickets t
         JOIN ticket_categories tc ON t.category_id = tc.id
         WHERE tc.manager_user_id = $1 AND t.status = 'pending_approval'`,
        [managerId]
      );

      // Get total categories managed
      const { rows: categoryRows } = await pool.query(
        `SELECT COUNT(*) as count
         FROM ticket_categories
         WHERE manager_user_id = $1`,
        [managerId]
      );

      // Get active tickets in managed categories
      const { rows: activeRows } = await pool.query(
        `SELECT COUNT(*) as count
         FROM tickets t
         JOIN ticket_categories tc ON t.category_id = tc.id
         WHERE tc.manager_user_id = $1 AND t.status IN ('open', 'in_progress', 'pending_approval')`,
        [managerId]
      );

      // Get average response time (in hours)
      const { rows: responseRows } = await pool.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (
           COALESCE(t.first_response_at, t.updated_at) - t.created_at
         )) / 3600) as avg_response_time
         FROM tickets t
         JOIN ticket_categories tc ON t.category_id = tc.id
         WHERE tc.manager_user_id = $1 AND t.first_response_at IS NOT NULL
         AND t.created_at >= NOW() - INTERVAL '30 days'`,
        [managerId]
      );

      const workload: WorkloadStats = {
        managerId,
        pendingApprovals: parseInt(approvalRows[0].count) || 0,
        totalCategories: parseInt(categoryRows[0].count) || 0,
        activeTickets: parseInt(activeRows[0].count) || 0,
        avgResponseTime: responseRows[0].avg_response_time || null
      };

      cache.set(cacheKey, workload, 2 * 60 * 1000); // 2 minute cache for workload
      return workload;

    } catch (error) {
      console.error('Error fetching manager workload:', error);
      throw new Error('Failed to fetch manager workload');
    }
  }

  /**
   * Get manager assignment history for a category
   */
  static async getAssignmentHistory(categoryId: number): Promise<ManagerAssignmentHistory[]> {
    try {
      const { rows } = await pool.query<ManagerAssignmentHistory>(
        `SELECT mah.*, u.name as manager_name, ab.name as assigned_by_name
         FROM manager_assignment_history mah
         JOIN users u ON mah.manager_user_id = u.id
         JOIN users ab ON mah.assigned_by = ab.id
         WHERE mah.category_id = $1
         ORDER BY mah.assigned_at DESC`,
        [categoryId]
      );

      return rows;
    } catch (error) {
      console.error('Error fetching assignment history:', error);
      throw new Error('Failed to fetch assignment history');
    }
  }

  /**
   * Get all managers with their workload (for admin dashboard)
   */
  static async getAllManagersWithWorkload(): Promise<(ManagerDetails & WorkloadStats)[]> {
    const cacheKey = 'managers:workload:all';
    const cached = cache.get<(ManagerDetails & WorkloadStats)[]>(cacheKey);
    if (cached) return cached;

    try {
      const managers = await this.getAllActiveManagers();
      const managersWithWorkload = await Promise.all(
        managers.map(async (manager) => {
          const workload = await this.getManagerWorkload(manager.id);
          return { ...manager, ...workload };
        })
      );

      cache.set(cacheKey, managersWithWorkload, 3 * 60 * 1000); // 3 minute cache
      return managersWithWorkload;

    } catch (error) {
      console.error('Error fetching managers with workload:', error);
      throw new Error('Failed to fetch managers with workload');
    }
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  static clearCache(pattern?: string): void {
    cache.invalidate(pattern);
  }

  /**
   * Get cache statistics (for monitoring)
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: (cache as any).cache.size,
      keys: Array.from((cache as any).cache.keys())
    };
  }
}

export default ManagerService;