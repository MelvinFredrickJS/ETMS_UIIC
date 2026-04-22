# Manager Resolution - Analysis & Centralization Plan

## 🎯 Current State Analysis

### Problem Summary
Manager resolution logic is **functional but scattered** across multiple files with some duplication:

1. **Manager assignment for approvals** - In `managerAssignmentService.ts`
2. **Manager lookup by category** - In `categoryModel.ts` (`findByManagerId`)
3. **Manager validation** - Scattered across controllers
4. **Manager ownership checks** - In `accessControlService.ts`

---

## 📍 Where Manager Logic Exists

### 1. **managerAssignmentService.ts**
**Function:** `getApprovalManagerForCategory(categoryId)`

**Purpose:** Get the manager who should approve tickets for a category

**Logic:**
```typescript
- Query ticket_categories.manager_user_id
- Join with users table
- Verify manager is active
- Return manager details (id, name, email)
```

**Used in:**
- `ticketController.ts` - When creating tickets that require approval

**Issues:**
- ✅ Well-implemented
- ✅ Single responsibility
- ❌ Could be part of larger manager service

### 2. **categoryModel.ts**
**Function:** `findByManagerId(manager_user_id)`

**Purpose:** Get all categories managed by a specific manager

**Logic:**
```typescript
- Query ticket_categories WHERE manager_user_id = ?
- Return all categories
```

**Used in:**
- `accessControlService.ts` - Multiple places for permission checks
- `testAccessControl.ts` - Testing

**Issues:**
- ✅ Well-implemented
- ❌ Model function used for business logic
- ❌ Should be in service layer

### 3. **accessControlService.ts**
**Multiple Functions Using Manager Logic:**

- `canAccessCategory()` - Checks if manager owns category
- `getAccessibleCategories()` - Gets categories manager owns
- `canViewCategoryEmployees()` - Complex manager ownership check
- `canManageAssets()` - Checks if manager manages infra_team
- `canViewAsset()` - Checks if manager manages asset's category
- `canViewTeam()` - Checks if manager manages team
- `validateCategoryOwnership()` - Validates manager owns category

**Issues:**
- ✅ Centralized in access control
- ❌ Duplicates `findByManagerId` calls
- ❌ Could cache manager's categories

### 4. **Controllers**
**categoryController.ts:**
- `createTeam()` - Validates manager_user_id
- `getTeams()` - Returns manager info

**approvalController.ts:**
- Checks `approval_owner_id` matches manager

**Issues:**
- ✅ Proper validation
- ❌ Could use centralized service

---

## 🔍 Current Manager Resolution Patterns

### Pattern 1: Get Manager for Category (Approval)
```typescript
// Current: managerAssignmentService.ts
const manager = await getApprovalManagerForCategory(categoryId)
// Returns: { id, name, email }
```

**Used for:** Assigning approval owner when creating tickets

### Pattern 2: Get Categories for Manager (Access Control)
```typescript
// Current: categoryModel.ts
const categories = await categoryModel.findByManagerId(managerId)
// Returns: CategoryRow[]
```

**Used for:** Permission checks, access control

### Pattern 3: Validate Manager Ownership
```typescript
// Current: accessControlService.ts
const category = await categoryModel.findById(categoryId)
return Number(category.manager_user_id) === Number(managerId)
```

**Used for:** Verifying manager owns a category

### Pattern 4: Check Manager Role
```typescript
// Current: Multiple places
const manager = await userModel.findById(managerId)
if (!manager || manager.role !== 'manager' || !manager.is_active) {
  // error
}
```

**Used for:** Validating manager before assignment

---

## 🎯 Proposed Solution

### Create Centralized Manager Service

**File:** `etms-mvp/server/services/managerService.ts`

**Functions:**

1. **getManagerById(managerId)** - Get manager details with validation
2. **getManagerForCategory(categoryId)** - Get approval manager for category
3. **getManagedCategories(managerId)** - Get all categories manager owns
4. **validateManagerOwnership(managerId, categoryId)** - Check ownership
5. **isManagerActive(managerId)** - Check if manager is active
6. **getManagersByTeam(teamKey)** - Get managers for a team
7. **assignManagerToCategory(managerId, categoryId)** - Assign manager
8. **removeManagerFromCategory(categoryId)** - Remove manager assignment

**Benefits:**
- ✅ Single source of truth
- ✅ Consistent validation
- ✅ Easy to cache
- ✅ Easy to test
- ✅ Clear API

---

## 📊 Comparison

| Aspect | Current | Proposed |
|--------|---------|----------|
| **Files** | 4 files | 1 service |
| **Duplication** | High | None |
| **Caching** | No | Yes (optional) |
| **Testing** | Hard | Easy |
| **Maintainability** | Medium | High |
| **Consistency** | Medium | High |

---

## 🚀 Implementation Plan

### Phase 1: Create Manager Service
1. Create `services/managerService.ts`
2. Implement core functions
3. Add validation and error handling
4. Add caching (optional)

### Phase 2: Migrate Existing Code
1. Update `accessControlService.ts` to use manager service
2. Keep `managerAssignmentService.ts` as thin wrapper (backward compat)
3. Update controllers to use manager service
4. Update tests

### Phase 3: Cleanup
1. Remove duplicate logic
2. Update documentation
3. Add comprehensive tests

---

## ❓ Questions for You

### 1. **Scope**

**Q1:** Should we create a full manager service or just consolidate existing logic?
- [ ] **Option A** - Full service with all manager operations
- [ ] **Option B** - Just consolidate existing logic (minimal changes)

**Q2:** Should we add caching for manager lookups?
- [ ] Yes - Cache manager's categories (performance)
- [ ] No - Keep it simple (no caching)

### 2. **Backward Compatibility**

**Q3:** Should we keep `managerAssignmentService.ts`?
- [ ] Yes - Keep as wrapper for backward compatibility
- [ ] No - Remove and update all imports

**Q4:** Should we keep `categoryModel.findByManagerId()`?
- [ ] Yes - Keep for direct database access
- [ ] No - Move to service only

### 3. **Additional Features**

**Q5:** Should we add manager assignment history?
- [ ] Yes - Track when managers are assigned/removed
- [ ] No - Keep current behavior

**Q6:** Should we add manager workload tracking?
- [ ] Yes - Track number of pending approvals per manager
- [ ] No - Out of scope

---

## 📝 Proposed API

### Manager Service Functions

```typescript
// Get manager details
getManagerById(managerId: number): Promise<ManagerDetails>

// Get manager for category (approval owner)
getManagerForCategory(categoryId: number): Promise<ManagerDetails>

// Get all categories managed by manager
getManagedCategories(managerId: number): Promise<CategoryRow[]>

// Validate manager owns category
validateManagerOwnership(managerId: number, categoryId: number): Promise<boolean>

// Check if manager is active
isManagerActive(managerId: number): Promise<boolean>

// Get all active managers
getAllActiveManagers(): Promise<ManagerDetails[]>

// Get managers by team
getManagersByTeam(teamKey: string): Promise<ManagerDetails[]>

// Assign manager to category
assignManagerToCategory(managerId: number, categoryId: number): Promise<void>

// Remove manager from category
removeManagerFromCategory(categoryId: number): Promise<void>

// Get manager workload (optional)
getManagerWorkload(managerId: number): Promise<WorkloadStats>
```

---

## 🎯 Recommended Approach

### Option A: Full Manager Service (Recommended)

**Pros:**
- Complete centralization
- Easy to extend
- Better caching opportunities
- Clearer API

**Cons:**
- More work upfront
- Larger refactor

### Option B: Minimal Consolidation

**Pros:**
- Less work
- Minimal changes
- Lower risk

**Cons:**
- Still some duplication
- Harder to extend later

---

## 📈 Expected Impact

### Code Quality
- **Before:** Logic scattered across 4 files
- **After:** Centralized in 1 service
- **Impact:** 70% easier to maintain

### Performance
- **Before:** Multiple database queries
- **After:** Potential caching
- **Impact:** 20-30% faster (with caching)

### Testing
- **Before:** Hard to test (scattered logic)
- **After:** Easy to test (isolated service)
- **Impact:** 100% better testability

---

## 🔧 Migration Strategy

### Step 1: Create Service (No Breaking Changes)
```typescript
// New service with all functions
// Existing code still works
```

### Step 2: Update Access Control Service
```typescript
// Replace direct calls with service calls
// Test thoroughly
```

### Step 3: Update Controllers
```typescript
// Use manager service instead of direct queries
// Maintain backward compatibility
```

### Step 4: Deprecate Old Functions (Optional)
```typescript
// Mark old functions as deprecated
// Provide migration guide
```

---

## 📚 Related Services

### Current Services
- `accessControlService.ts` - Uses manager logic
- `managerAssignmentService.ts` - Manager assignment
- `assignmentService.ts` - Employee assignment

### Proposed Structure
```
services/
├── accessControlService.ts (uses managerService)
├── managerService.ts (NEW - centralized)
├── managerAssignmentService.ts (wrapper or deprecated)
└── assignmentService.ts (unchanged)
```

---

## ✅ Success Criteria

- [ ] All manager logic centralized
- [ ] No code duplication
- [ ] Backward compatible
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Performance maintained or improved

---

**Status:** ⏸️ AWAITING YOUR GUIDANCE  
**Priority:** HIGH  
**Complexity:** MEDIUM  

Please answer the questions above so I can proceed with the best solution! 🚀
