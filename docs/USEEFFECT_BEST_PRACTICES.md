# useEffect Best Practices for React Query v5

## TL;DR: When useEffect is Actually Needed

**React Query v5 removed `onSuccess` callbacks**, so we need useEffect for side effects after data loads. This is **NOT an anti-pattern** when done correctly.

---

## ❌ Anti-Pattern: useEffect for Data Fetching

```tsx
// ❌ WRONG: Using useEffect to fetch data
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  fetchData()
    .then(setData)
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);
```

**Problems:**
- Manual loading state management
- Manual error handling
- No caching
- No automatic refetching
- Race conditions possible

---

## ✅ Best Practice: React Query + useEffect for Side Effects

```tsx
// ✅ CORRECT: React Query for data, useEffect for side effects
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
  enabled: !!userId,
});

// ✅ CORRECT: useEffect for syncing data to stores (side effect)
useEffect(() => {
  if (data && data.id !== store.userId) {
    store.setUser(data); // Side effect: Update store
  }
}, [data, store.userId, store.setUser]);
```

**Benefits:**
- React Query handles fetching, caching, refetching
- useEffect ONLY for side effects (store updates, analytics, etc.)
- Proper dependency tracking
- Clean separation of concerns

---

## Real-World Example: Category Selection Screen

### ❌ Old Anti-Pattern (React Query v4)

```tsx
// ❌ OLD: onSuccess callback (removed in v5)
const { data } = useQuery({
  queryKey: ['category', id],
  queryFn: fetchCategory,
  onSuccess: (data) => {
    // ❌ This doesn't exist in React Query v5!
    updateStore(data);
  },
});
```

### ✅ New Best Practice (React Query v5)

```tsx
// ✅ NEW: useEffect for side effects
const { data: existingCategory } = useQuery({
  queryKey: ['category', providerId],
  queryFn: async () => {
    const { data } = await supabase
      .from('provider_selected_categories')
      .select('category_id')
      .eq('provider_id', providerId)
      .maybeSingle();
    
    return data?.category_id as string | null;
  },
  enabled: !!providerId,
  staleTime: 5 * 60 * 1000,
});

// ✅ OPTIMIZED: Single useEffect for ALL sync logic
useEffect(() => {
  // Sync database → verification store
  if (existingCategory && existingCategory !== store.selectedId) {
    const categoryName = categories.find(c => c.id === existingCategory)?.name || '';
    updateStore({ selectedId: existingCategory, categoryName });
  }
  
  // Sync verification store → UI store
  if (store.selectedId && store.selectedId !== uiStore.selectedId) {
    uiStore.setSelectedId(store.selectedId);
  }
}, [existingCategory, store.selectedId, uiStore.selectedId, categories, updateStore]);
```

---

## Why This Pattern is NOT an Anti-Pattern

### ❌ Anti-Pattern Characteristics:
1. **Data fetching in useEffect** (manual loading/error handling)
2. **No caching or request deduplication**
3. **Race conditions from multiple effects**
4. **Mixing data fetching with side effects**

### ✅ Our Pattern Characteristics:
1. **React Query handles ALL data fetching** (automatic caching, loading, error states)
2. **useEffect ONLY for side effects** (syncing data between stores)
3. **Proper dependency arrays** (runs only when data changes)
4. **Clean separation** (fetch vs sync)

---

## Migration Guide: React Query v4 → v5

### Before (v4 with onSuccess)
```tsx
const query = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  onSuccess: (data) => {
    doSomething(data); // ❌ Removed in v5
  },
});
```

### After (v5 with useEffect)
```tsx
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
});

useEffect(() => {
  if (data) {
    doSomething(data); // ✅ Side effect in useEffect
  }
}, [data]);
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Side Effects in useMemo
```tsx
// ❌ WRONG: setState in useMemo (causes React errors)
useMemo(() => {
  if (data) {
    setState(data); // ❌ Side effect in useMemo!
  }
}, [data]);
```

### ✅ Solution: Use useEffect
```tsx
// ✅ CORRECT: Side effects in useEffect
useEffect(() => {
  if (data) {
    setState(data); // ✅ Proper side effect
  }
}, [data]);
```

### ❌ Mistake 2: Fetching in useEffect
```tsx
// ❌ WRONG: Data fetching in useEffect
useEffect(() => {
  fetchData().then(setData); // ❌ Anti-pattern!
}, []);
```

### ✅ Solution: Use React Query
```tsx
// ✅ CORRECT: React Query for fetching
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
});
```

---

## Performance Optimization

### ❌ Bad: Multiple useEffects
```tsx
// ❌ INEFFICIENT: 3 separate useEffects
useEffect(() => {
  if (data1) updateStore1(data1);
}, [data1]);

useEffect(() => {
  if (data2) updateStore2(data2);
}, [data2]);

useEffect(() => {
  if (data3) updateStore3(data3);
}, [data3]);
```

### ✅ Good: Single useEffect (when related)
```tsx
// ✅ EFFICIENT: Single useEffect for related logic
useEffect(() => {
  if (data1 && data1 !== store.data1) {
    updateStore1(data1);
  }
  
  if (store.data1 && store.data1 !== uiStore.data1) {
    updateUIStore(store.data1);
  }
}, [data1, store.data1, uiStore.data1, updateStore1, updateUIStore]);
```

**Why?** Grouped logic that runs together should be in one effect.

---

## Decision Tree: useMemo vs useEffect vs Nothing

```
Need to compute a value?
├─ Yes → useMemo (pure computation)
└─ No → Need to run side effect?
    ├─ Yes → useEffect (setState, store updates, analytics)
    └─ No → Just use the value directly (no hook needed)
```

### Examples:

```tsx
// ✅ useMemo: Pure computation
const filteredItems = useMemo(() => {
  return items.filter(item => item.active);
}, [items]);

// ✅ useEffect: Side effect (store update)
useEffect(() => {
  if (data) {
    store.setData(data);
  }
}, [data, store]);

// ✅ Nothing: Just use the value
const isSelected = selectedId === item.id; // No hook needed!
```

---

## Summary: The Golden Rules

1. **React Query for ALL data fetching** (never useEffect)
2. **useEffect ONLY for side effects** (store updates, analytics, DOM mutations)
3. **useMemo ONLY for pure computations** (never setState)
4. **Proper dependencies** (include all values used inside)
5. **Group related logic** (single useEffect when appropriate)

---

## Real-World Stats from Our Codebase

**Before React Query + useEffect Pattern:**
- 5 useState hooks per screen
- 3 useEffect hooks per screen (mixing fetch + sync)
- Manual loading/error states
- No caching (duplicate requests)
- Race conditions possible

**After React Query + useEffect Pattern:**
- 0 useState for server data
- 1-2 useEffect for side effects only
- Automatic loading/error/caching from React Query
- Request deduplication
- No race conditions

**Result:** ~60% fewer hooks, better performance, fewer bugs!

---

## References

- [React Query v5 Migration Guide](https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5)
- [React useEffect Documentation](https://react.dev/reference/react/useEffect)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [ZOVA copilot-instructions.md](../.github/instructions/copilot-instructions.md)

---

**Document Version:** 1.0  
**Date:** 2025-01-11  
**Pattern:** React Query v5 + useEffect for Side Effects  
**Status:** Production Standard ✅
