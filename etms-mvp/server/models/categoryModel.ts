import pool from '../config/db'
import type { CategoryRow } from '../types'

async function findAll(): Promise<CategoryRow[]> {
  const { rows } = await pool.query<CategoryRow>(
    `SELECT tc.*, tt.name AS type_name, tt.type_key
     FROM ticket_categories tc
     JOIN ticket_types tt ON tc.ticket_type_id = tt.id
     ORDER BY tt.id, tc.id`
  )
  return rows
}

async function findById(id: number): Promise<CategoryRow | null> {
  const { rows } = await pool.query<CategoryRow>(
    `SELECT tc.*,
            tt.type_key,
            tt.name       AS type_name,
            mgr.id        AS manager_id,
            mgr.name      AS manager_name,
            mgr.email     AS manager_email
     FROM ticket_categories tc
     LEFT JOIN ticket_types tt  ON tc.ticket_type_id  = tt.id
     LEFT JOIN users mgr   ON tc.manager_user_id = mgr.id
     WHERE tc.id = $1`,
    [id]
  )
  return rows[0] ?? null
}

async function findByKey(categoryKey: string): Promise<CategoryRow | null> {
  const { rows } = await pool.query<CategoryRow>(
    `SELECT tc.*,
            tt.type_key,
            tt.name       AS type_name,
            mgr.id        AS manager_id,
            mgr.name      AS manager_name,
            mgr.email     AS manager_email
     FROM ticket_categories tc
     LEFT JOIN ticket_types tt  ON tc.ticket_type_id  = tt.id
     LEFT JOIN users mgr        ON tc.manager_user_id = mgr.id
     WHERE tc.category_key = $1`,
    [categoryKey]
  )
  return rows[0] ?? null
}

async function findByManagerId(manager_user_id: number): Promise<CategoryRow[]> {
  const { rows } = await pool.query<CategoryRow>(
    `SELECT tc.*, tt.type_key, tt.name AS type_name
     FROM ticket_categories tc
     LEFT JOIN ticket_types tt ON tc.ticket_type_id = tt.id
     WHERE tc.manager_user_id = $1`,
    [manager_user_id]
  )
  return rows
}

async function findTeams(): Promise<CategoryRow[]> {
  const { rows } = await pool.query<CategoryRow>(
    `SELECT tc.*,
            mgr.id    AS manager_id,
            mgr.name  AS manager_name,
            mgr.email AS manager_email
     FROM ticket_categories tc
     LEFT JOIN users mgr ON tc.manager_user_id = mgr.id
     WHERE tc.is_team = TRUE
     ORDER BY tc.name ASC`
  )
  return rows
}

async function createTeamWithComplaintCategory(
  name: string,
  teamKey: string,
  managerUserId: number,
  complaintCategoryKey: string
): Promise<{ team: CategoryRow; complaintCategory: CategoryRow }> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const complaintTypeResult = await client.query<{ id: number }>(
      `SELECT id FROM ticket_types WHERE type_key = 'complaint' LIMIT 1`
    )
    const complaintTypeId = complaintTypeResult.rows[0]?.id
    if (!complaintTypeId) {
      throw new Error('Complaint ticket type is missing.')
    }

    const teamResult = await client.query<CategoryRow>(
      `INSERT INTO ticket_categories
         (ticket_type_id, name, category_key, default_priority, manager_user_id, assigned_team_key, is_team, requires_approval)
       VALUES
         (NULL, $1, $2, 'medium', $3, NULL, TRUE, FALSE)
       RETURNING *`,
      [name, teamKey, managerUserId]
    )
    const team = teamResult.rows[0]

    const complaintResult = await client.query<CategoryRow>(
      `INSERT INTO ticket_categories
         (ticket_type_id, name, category_key, default_priority, manager_user_id, assigned_team_key, is_team, requires_approval)
       VALUES
         ($1, $2, $3, 'medium', NULL, $4, FALSE, FALSE)
       RETURNING *`,
      [complaintTypeId, `${name} Complaint`, complaintCategoryKey, teamKey]
    )
    const complaintCategory = complaintResult.rows[0]

    await client.query('COMMIT')
    return { team, complaintCategory }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function findTeamDependencies(teamId: number): Promise<{ users: number; assets: number; tickets: number }> {
  const { rows } = await pool.query<{ users: string; assets: string; tickets: string }>(
    `SELECT
       (SELECT COUNT(*)::int FROM users WHERE category_id = $1) AS users,
       (SELECT COUNT(*)::int FROM assets WHERE category_id = $1) AS assets,
       (SELECT COUNT(*)::int FROM tickets WHERE category_id = $1) AS tickets`,
    [teamId]
  )

  const row = rows[0] ?? { users: '0', assets: '0', tickets: '0' }
  return {
    users: Number(row.users),
    assets: Number(row.assets),
    tickets: Number(row.tickets),
  }
}

async function findMappedCategoryDependencies(teamKey: string): Promise<{ categories: number; tickets: number }> {
  const { rows } = await pool.query<{ categories: string; tickets: string }>(
    `SELECT
       (SELECT COUNT(*)::int
        FROM ticket_categories
        WHERE assigned_team_key = $1
          AND is_team = FALSE) AS categories,
       (SELECT COUNT(*)::int
        FROM tickets t
        JOIN ticket_categories c ON c.id = t.category_id
        WHERE c.assigned_team_key = $1
          AND c.is_team = FALSE) AS tickets`,
    [teamKey]
  )

  const row = rows[0] ?? { categories: '0', tickets: '0' }
  return {
    categories: Number(row.categories),
    tickets: Number(row.tickets),
  }
}

async function deleteTeamById(teamId: number, teamKey: string): Promise<CategoryRow | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `DELETE FROM ticket_categories
       WHERE assigned_team_key = $1
         AND is_team = FALSE`,
      [teamKey]
    )

    const teamResult = await client.query<CategoryRow>(
      `DELETE FROM ticket_categories
       WHERE id = $1 AND is_team = TRUE
       RETURNING *`,
      [teamId]
    )

    await client.query('COMMIT')
    return teamResult.rows[0] ?? null
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export {
  findAll,
  findById,
  findByKey,
  findByManagerId,
  findTeams,
  createTeamWithComplaintCategory,
  findTeamDependencies,
  findMappedCategoryDependencies,
  deleteTeamById,
}
