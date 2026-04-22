# Category Access Control - Analysis & Simplification Plan

## 🎯 Current State Analysis

### Problem Summary
The category access control logic is **complex and scattered** across multiple files with inconsistent patterns:

1. **Complex conditional logic** in `getEmployeesByCategory()` 
2. **Implicit access rules** that are hard to understand
3. **Mixed concerns** - team mapping + manager ownership + legacy fallbacks
4. **No centralized service** - logic duplicated across controllers

---

## 📍 Where Access Control Exists

### 1. **categoryController.ts** - `getEmployeesByCategory()`
**Location:** Lines 66-84  
**Complexity:** HIGH ⚠️

```typescript
if (req.user.role === ROLES.MANAGER) {
  const managedCategories = await categoryModel.findByManagerId(req.user.id)
  const managedCategoryIds = new Set(managedCategories.map(c => Number(c.id)))
  const requestedCategoryId = Number(categoryId)
  const effectiveCategoryId = Number(teamId ?? categoryId)
  const hasExplicitCategoryOwner = Number(category.manager_user_id ?? 0) > 0

  const canViewRequestedCategory = managedCategoryIds.has(requestedCategoryId)
  const canViewMappedTeam = managedCategoryIds.has(effectiveCategoryId)

  // If a category has an explicit manager owner, enforce that owner boundary.
  // Team mapping is only a fallback for legacy/unowned categories.
  const canView = hasExplicitCategoryOwner
    ? canViewRequestedCategory
    : (canViewRequestedCategory || canViewMappedTeam)

  if (!canView) {
    res.status(403).json({ success: false, message: 'Access denied for this category.' }); return
  }
}
```

**Issues:**
- ❌ 3 levels of conditional logic
- ❌ Unclear business rules (explicit owner vs team mapping)
- ❌ Hard to test
- ❌ Hard to extend

### 2. **ticketController.ts** - `canAccessTicket()`
**Location:** Lines 545-553  
**Complexity:** MEDIUM

```typescript
async function canAccessTicket(user: Request['user'], ticket: TicketRow): Promise<boolean> {
  if (user.role === ROLES.ADMIN)                          return true
  if (Number(ticket.raised_by)   === Number(user.id))    return true
  if (Number(ticket.assigned_to) === Number(user.id))    return true
  if (user.role === ROLES.DATA_TEAM)                     return false
  if (user.role === ROLES.MANAGER)                       return Number(ticket.approval_owner_id) === Number(user.id)
  return false
}
```

**Issues:**
- ✅ Simple and clear
- ❌ Only checks ticket-level access, not category-level
- ❌ Doesn't validate manager's category ownership

### 3. **authController.ts** - `resolveCanManageAssets()`
**Location:** Lines 8-12  
**Complexity:** LOW

```typescript
async function resolveCanManageAssets(userId: number, role: string): Promise<boolean> {
  if (role !== 'manager') return false
  const managedCategories = await categoryModel.findByManagerId(userId)
  return managedCategories.some(category => category.category_key === 'infra_team')
}
```

**Issues:**
- ✅ Simple logic
- ❌ Hardcoded 'infra_team' - not flexible
- ❌ Should be generalized

---

## 🔍 Business Rules (Current Understanding)

### Category Ownership Model

```
┌─────────────────────────────────────────────────────────┐
│                    CATEGORY ACCESS                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. ADMIN → Access to ALL categories                    │
│                                                          │
│  2. MANAGER → Access based on:                          │
│     ┌──────────────────────────────────────────┐       │
│     │ IF category.manager_user_id IS SET:      │       │
│     │   → ONLY that manager can access         │       │
│     │                                           │       │
│     │ IF category.manager_user_id IS NULL:     │       │
│     │   → Check assigned_team_key              │       │
│     │   → Any manager of that team can access  │       │
│     └──────────────────────────────────────────┘       │
│                                                          │
│  3. EMPLOYEE → Access to:                               │
│     - Tickets they raised                               │
│     - Tickets assigned to them                          │
│     - Categories they belong to                         │
│                                                          │
│  4. DATA_TEAM → Restricted access                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Proposed Solution

### Option A: Centralized Access Control Service (RECOMMENDED)

Create a dedicated service: `etms-mvp/server/services/accessControlService.ts`

**Benefits:**
- ✅ Single source of truth
- ✅ Easy to test
- ✅ Easy to extend
- ✅ Consistent across all controllers
- ✅ Clear business rules

**Structure:**
```typescript
// Core functions:
- canAccessCategory(userId, role, categoryId)
- canAccessTicket(userId, role, ticket)
- canManageTeam(userId, role, teamId)
- canManageAssets(userId, role)
- getManagedCategories(userId, role)
```

### Option B: Middleware-Based Access Control

Create middleware: `etms-mvp/server/middleware/categoryAccessMiddleware.ts`

**Benefits:**
- ✅ Declarative route protection
- ✅ Consistent enforcement
- ❌ Less flexible for complex checks

### Option C: Keep Current + Document

Just add comprehensive documentation and simplify the existing logic.

**Benefits:**
- ✅ Minimal changes
- ❌ Still scattered
- ❌ Still complex

---

## 📊 Comparison

| Aspect | Option A (Service) | Option B (Middleware) | Option C (Document) |
|--------|-------------------|----------------------|---------------------|
| **Complexity** | Low | Medium | High |
| **Testability** | Excellent | Good | Poor |
| **Maintainability** | Excellent | Good | Poor |
| **Flexibility** | High | Medium | Low |
| **Effort** | Medium | Medium | Low |
| **Recommended** | ✅ YES | ⚠️ Maybe | ❌ NO |

---

## 🚀 Recommended Implementation Plan

### Phase 1: Create Access Control Service
1. Create `services/accessControlService.ts`
2. Implement core functions with clear business rules
3. Add comprehensive unit tests

### Phase 2: Refactor Controllers
1. Replace inline logic in `categoryController.ts`
2. Enhance `canAccessTicket()` in `ticketController.ts`
3. Generalize `resolveCanManageAssets()` in `authController.ts`

### Phase 3: Documentation
1. Document all access rules
2. Add inline comments
3. Create access control matrix

---

## ❓ Questions for You

Before I proceed with implementation, please answer:

### 1. **Business Rules Clarification**

**Q1:** Is this the correct understanding of manager access?
- If `category.manager_user_id` is set → ONLY that manager
- If `category.manager_user_id` is NULL → ANY manager of the assigned team

**Q2:** Should employees be able to view categories they don't belong to?
- Currently: No explicit check in most places
- Proposed: Restrict to their own category

**Q3:** For asset management, should we keep the hardcoded `infra_team` check?
- Currently: Only managers of `infra_team` can manage assets
- Proposed: Make it configurable or role-based

### 2. **Implementation Approach**

**Q4:** Which option do you prefer?
- [ ] **Option A** - Centralized Service (Recommended)
- [ ] **Option B** - Middleware-Based
- [ ] **Option C** - Document Only

**Q5:** Should we add role-based permissions table in the database?
- Currently: Hardcoded in code
- Future: Database-driven permissions (more flexible)

### 3. **Scope**

**Q6:** Should we also handle:
- [ ] Ticket assignment permissions
- [ ] Asset transfer permissions
- [ ] Report access permissions
- [ ] Data portal access permissions

**Q7:** Do you want backward compatibility?
- [ ] Yes - Keep legacy behavior for existing data
- [ ] No - Apply new rules to all

---

## 📝 Next Steps

**Once you answer the questions above, I will:**

1. ✅ Create the access control service
2. ✅ Refactor all controllers
3. ✅ Add comprehensive tests
4. ✅ Document all rules
5. ✅ Verify no regressions

**Estimated Time:** 2-3 hours  
**Risk Level:** Low (with proper testing)  
**Impact:** High (much cleaner codebase)

---

## 📚 Additional Context

### Current Database Schema (Relevant Fields)

```sql
ticket_categories:
  - id
  - manager_user_id (nullable) ← Explicit owner
  - assigned_team_key (nullable) ← Team mapping
  - is_team (boolean)

users:
  - id
  - role (admin, manager, employee, data_team)
  - category_id (nullable) ← Employee's team

tickets:
  - raised_by
  - assigned_to
  - approval_owner_id
  - category_id
```

---

**Status:** ⏸️ AWAITING YOUR GUIDANCE  
**Priority:** HIGH  
**Complexity:** MEDIUM  

Please answer the questions above so I can proceed with the best solution! 🚀
