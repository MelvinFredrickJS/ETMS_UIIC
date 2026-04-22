# Access Control Service - Quick Reference

## 🚀 Quick Start

```typescript
import * as accessControl from '../services/accessControlService'
```

---

## 📋 Common Use Cases

### Check Category Access
```typescript
const canAccess = await accessControl.canAccessCategory(
  req.user.id,
  req.user.role,
  categoryId
)
if (!canAccess) {
  res.status(403).json({ success: false, message: 'Access denied.' })
  return
}
```

### Check Ticket Access
```typescript
const ticket = await ticketModel.findById(ticketId)
const canAccess = await accessControl.canAccessTicket(
  req.user.id,
  req.user.role,
  ticket
)
```

### Check Asset Management
```typescript
const canManage = await accessControl.canManageAssets(
  req.user.id,
  req.user.role
)
if (!canManage) {
  res.status(403).json({ success: false, message: 'Only Infra Manager can manage assets.' })
  return
}
```

### Get Accessible Categories
```typescript
const categories = await accessControl.getAccessibleCategories(
  req.user.id,
  req.user.role
)
```

---

## 🎯 Function Reference

### Category Functions
| Function | Purpose | Returns |
|----------|---------|---------|
| `canAccessCategory(userId, role, categoryId)` | Check category access | `boolean` |
| `getAccessibleCategories(userId, role)` | Get all accessible categories | `CategoryRow[]` |
| `canViewCategoryEmployees(userId, role, categoryId)` | Check employee view permission | `boolean` |
| `canManageTeams(userId, role)` | Check team management | `boolean` |
| `canViewTeam(userId, role, teamId)` | Check team view | `boolean` |

### Ticket Functions
| Function | Purpose | Returns |
|----------|---------|---------|
| `canAccessTicket(userId, role, ticket)` | Check ticket access | `boolean` |
| `canUpdateTicketStatus(userId, role, ticket, newStatus)` | Check status update | `boolean` |
| `canApproveTickets(userId, role)` | Check approval permission | `boolean` |
| `canAssignTickets(userId, role)` | Check assignment permission | `boolean` |

### Asset Functions
| Function | Purpose | Returns |
|----------|---------|---------|
| `canManageAssets(userId, role)` | Check asset management (infra only) | `boolean` |
| `canViewAsset(userId, role, assetId)` | Check asset view | `boolean` |
| `canTransferAssets(userId, role)` | Check asset transfer | `boolean` |

### Report Functions
| Function | Purpose | Returns |
|----------|---------|---------|
| `canViewReports(userId, role)` | Check report viewing | `boolean` |
| `canGenerateReports(userId, role)` | Check report generation | `boolean` |

### Data Portal Functions
| Function | Purpose | Returns |
|----------|---------|---------|
| `canAccessDataPortal(userId, role)` | Check portal access | `boolean` |
| `canUploadData(userId, role)` | Check data upload | `boolean` |
| `canDownloadData(userId, role)` | Check data download | `boolean` |

### Utility Functions
| Function | Purpose | Returns |
|----------|---------|---------|
| `hasPermission(userId, role, permissionKey)` | Check specific permission | `boolean` |
| `getUserPermissions(userId, role)` | Get all permissions | `string[]` |
| `getAccessControlSummary(userId, role)` | Get complete summary | `object` |
| `validateCategoryOwnership(managerId, categoryId)` | Validate manager owns category | `boolean` |

---

## 🔑 Permission Keys

### Category Permissions
- `category.view.all` - View all categories
- `category.view.owned` - View owned categories
- `category.view.assigned` - View assigned category
- `category.manage.all` - Manage all categories
- `category.manage.owned` - Manage owned categories

### Ticket Permissions
- `ticket.view.all` - View all tickets
- `ticket.view.owned` - View owned tickets
- `ticket.view.raised` - View raised tickets
- `ticket.view.assigned` - View assigned tickets
- `ticket.create` - Create tickets
- `ticket.update.all` - Update all tickets
- `ticket.update.assigned` - Update assigned tickets
- `ticket.approve` - Approve tickets
- `ticket.assign` - Assign tickets
- `ticket.close.raised` - Close raised tickets

### Asset Permissions
- `asset.view.all` - View all assets
- `asset.view.category` - View category assets
- `asset.view.assigned` - View assigned assets
- `asset.manage.all` - Manage all assets
- `asset.manage.infra` - Manage infra assets
- `asset.transfer` - Transfer assets

### Report Permissions
- `report.view.all` - View all reports
- `report.view.category` - View category reports
- `report.generate` - Generate reports

### Data Portal Permissions
- `data_portal.access` - Access data portal
- `data_portal.upload` - Upload data
- `data_portal.download` - Download data

---

## 🎭 Role Matrix

| Role | Category Access | Ticket Access | Asset Management | Reports | Data Portal |
|------|----------------|---------------|------------------|---------|-------------|
| **ADMIN** | All | All | Full | Full | Full |
| **MANAGER** | Owned only | Approval queue | Infra only | Full | No |
| **EMPLOYEE** | Assigned only | Raised + Assigned | View own | No | Upload only |
| **DATA_TEAM** | None | Assigned only | None | No | Full |

---

## 🔒 Business Rules

### Category Ownership
- If `category.manager_user_id` is set → **ONLY that manager** can access
- Employees can **ONLY** access their assigned category
- No team mapping fallback for explicit ownership

### Asset Management
- **ONLY** managers of `infra_team` can manage assets
- Other managers have **NO** asset management access
- Employees can view their own assets

### Ticket Access
- Users can access tickets they **raised**
- Users can access tickets **assigned** to them
- Managers can access tickets they're **approval owner** for
- Admin can access **all** tickets

---

## 💡 Examples

### Example 1: Protect Category Endpoint
```typescript
async function getEmployeesByCategory(req: Request, res: Response) {
  const categoryId = Number(req.params.categoryId)
  
  // Check access
  const canView = await accessControl.canViewCategoryEmployees(
    req.user.id,
    req.user.role,
    categoryId
  )
  
  if (!canView) {
    res.status(403).json({ success: false, message: 'Access denied.' })
    return
  }
  
  // Proceed with logic
  const employees = await userModel.findEmployeesByCategory(categoryId)
  res.json({ success: true, employees })
}
```

### Example 2: Protect Asset Endpoint
```typescript
async function createAsset(req: Request, res: Response) {
  // Check if user can manage assets
  if (req.user.role === ROLES.MANAGER) {
    const canManage = await accessControl.canManageAssets(
      req.user.id,
      req.user.role
    )
    if (!canManage) {
      res.status(403).json({ 
        success: false, 
        message: 'Only Infra Manager can create assets.' 
      })
      return
    }
  }
  
  // Proceed with asset creation
  const asset = await assetModel.create(req.body)
  res.json({ success: true, asset })
}
```

### Example 3: Get User's Access Summary
```typescript
async function getUserProfile(req: Request, res: Response) {
  const summary = await accessControl.getAccessControlSummary(
    req.user.id,
    req.user.role
  )
  
  res.json({
    success: true,
    user: req.user,
    access: summary
  })
}

// Returns:
// {
//   canManageAssets: false,
//   canApproveTickets: true,
//   canViewReports: true,
//   canAccessDataPortal: false,
//   accessibleCategoryCount: 2,
//   permissions: ['ticket.approve', 'ticket.assign', ...]
// }
```

---

## 🚨 Common Mistakes

### ❌ DON'T: Check role directly
```typescript
// BAD
if (req.user.role === ROLES.MANAGER) {
  // Complex logic here
}
```

### ✅ DO: Use access control service
```typescript
// GOOD
const canManage = await accessControl.canManageAssets(
  req.user.id,
  req.user.role
)
if (canManage) {
  // Logic here
}
```

### ❌ DON'T: Duplicate access logic
```typescript
// BAD - Logic in multiple places
const managedCategories = await categoryModel.findByManagerId(userId)
const canAccess = managedCategories.some(c => c.id === categoryId)
```

### ✅ DO: Use centralized function
```typescript
// GOOD - Single source of truth
const canAccess = await accessControl.canAccessCategory(
  userId,
  role,
  categoryId
)
```

---

## 📊 Migration Guide

### Old Code → New Code

| Old | New |
|-----|-----|
| `canAccessTicket(user, ticket)` | `accessControl.canAccessTicket(userId, role, ticket)` |
| `isInfraManager(userId)` | `accessControl.canManageAssets(userId, role)` |
| `resolveCanManageAssets(userId, role)` | `accessControl.canManageAssets(userId, role)` |

---

## 🔧 Database Setup

### Apply Migration
```bash
psql -U your_user -d etms_db -f etms-mvp/database/create_permissions_system.sql
```

### Verify Setup
```sql
-- Check permissions
SELECT COUNT(*) FROM permissions;  -- Should be 28

-- Check role assignments
SELECT role, COUNT(*) 
FROM role_permissions 
GROUP BY role;

-- Check specific user permissions
SELECT * FROM get_user_permissions(1, 'admin');
```

---

## 📚 Related Documentation

- **Full Implementation:** `CATEGORY_ACCESS_CONTROL_IMPLEMENTATION.md`
- **Analysis:** `CATEGORY_ACCESS_CONTROL_ANALYSIS.md`
- **Service Code:** `etms-mvp/server/services/accessControlService.ts`
- **Database Schema:** `etms-mvp/database/create_permissions_system.sql`

---

**Last Updated:** April 22, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
