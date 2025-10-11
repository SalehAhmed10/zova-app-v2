# 🔍 Full-Text Search Implementation Guide

## Overview
Complete keyword-based search system with **108 keywords** across **12 service subcategories**, enabling users to find services using colloquial terms like "nail tech" to discover manicure/pedicure services.

---

## ✅ What's Implemented

### Database Layer
- **108 keywords** populated across 12 subcategories
- **4 tsvector search columns**: services, providers, subcategories, keywords
- **4 GIN indexes** for O(log n) search performance
- **2 search functions**:
  - `search_services()` - Full-text service search with keyword matching
  - `search_providers()` - Provider discovery with service keyword matching

### Frontend Layer
- **TypeScript types** generated with service_keywords table
- **2 React Query hooks**:
  - `useServiceSearch` - Service search with caching
  - `useProviderSearch` - Provider search with caching
- **Exported from** `@/hooks`:
  - `useServiceSearch`, `useProviderSearch`
  - Types: `ServiceSearchResult`, `ProviderSearchResult`

---

## 🎯 Search Capabilities

### Keyword Matching Examples
```typescript
// ✅ All these queries find relevant services:
"nail tech"      → Nails (manicure, pedicure, acrylics, gels)
"hair stylist"   → Hair services (cuts, braids, color)
"MUA"            → Makeup services
"photographer"   → Photography services
"event planner"  → Event planning services
"massage"        → Spa & Massage services
"DJ"             → DJs & Music services
```

### Primary vs Secondary Keywords
- **Primary keywords** (is_primary=true): Boosted in relevance ranking
  - Examples: "nail tech", "hair stylist", "photographer"
- **Secondary keywords** (is_primary=false): Variations and colloquialisms
  - Examples: "nail technician", "MUA", "barber"

---

## 📝 Usage Examples

### 1. Basic Service Search
```tsx
import { useServiceSearch } from '@/hooks';
import { useState } from 'react';

function ServiceSearchScreen() {
  const [query, setQuery] = useState('');
  
  const { data, isLoading, error } = useServiceSearch({
    query,
    limit: 20,
    enabled: query.length > 0
  });

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search services (e.g., 'nail tech', 'photographer')"
      />
      
      {isLoading && <ActivityIndicator />}
      
      {data?.map(service => (
        <Card key={service.service_id}>
          <Text className="font-semibold">{service.service_title}</Text>
          <Text className="text-muted-foreground">
            by {service.provider_name}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {service.category_name} › {service.subcategory_name}
          </Text>
        </Card>
      ))}
    </View>
  );
}
```

### 2. Debounced Search (Recommended)
```tsx
import { useServiceSearch } from '@/hooks';
import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

function SmartSearchScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300); // 300ms delay
  
  const { data, isLoading } = useServiceSearch({
    query: debouncedQuery,
    limit: 20,
    enabled: debouncedQuery.length > 0
  });

  return (
    <View>
      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search services..."
        className="mb-4"
      />
      
      {isLoading && <LoadingSpinner />}
      
      <FlashList
        data={data}
        renderItem={({ item }) => <ServiceCard service={item} />}
        estimatedItemSize={100}
      />
    </View>
  );
}
```

### 3. Provider Search
```tsx
import { useProviderSearch } from '@/hooks';

function ProviderSearchScreen() {
  const [query, setQuery] = useState('');
  
  const { data, isLoading } = useProviderSearch({
    query,
    limit: 15,
    enabled: query.length > 0
  });

  return (
    <View>
      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Find providers..."
      />
      
      <FlashList
        data={data}
        renderItem={({ item }) => (
          <ProviderCard
            provider={item}
            verified={item.verification_status === 'approved'}
          />
        )}
        estimatedItemSize={120}
      />
    </View>
  );
}
```

### 4. Infinite Scroll Search
```tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

function InfiniteSearchScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['services', 'search-infinite', debouncedQuery],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('search_services', {
        search_query: debouncedQuery,
        limit_results: 20,
        offset_results: pageParam,
      });
      if (error) throw error;
      return { data, nextOffset: pageParam + 20 };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: debouncedQuery.length > 0,
  });

  const allServices = data?.pages.flatMap(page => page.data) ?? [];

  return (
    <FlashList
      data={allServices}
      renderItem={({ item }) => <ServiceCard service={item} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator /> : null
      }
      estimatedItemSize={100}
    />
  );
}
```

### 5. Search with Filters (Coming Soon)
```tsx
// Future implementation with category/price/location filters
function AdvancedSearchScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  // Custom combined query that filters results
  const { data } = useServiceSearch({
    query,
    limit: 20,
    enabled: query.length > 0
  });

  const filteredData = data?.filter(service => {
    if (category && service.category_name !== category) return false;
    if (maxPrice && parseFloat(service.base_price) > maxPrice) return false;
    return true;
  });

  return (
    <View>
      <SearchInput value={query} onChangeText={setQuery} />
      <CategoryFilter value={category} onChange={setCategory} />
      <PriceFilter maxPrice={maxPrice} onChange={setMaxPrice} />
      <SearchResults data={filteredData} />
    </View>
  );
}
```

---

## 🎨 UI Components Pattern

### Modern Card-Based Search Results
```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ChevronRight, MapPin } from 'lucide-react-native';

function ServiceSearchCard({ service }: { service: ServiceSearchResult }) {
  return (
    <Card className="bg-card border border-border mb-3">
      <CardContent className="p-4">
        <View className="flex-row items-start gap-4">
          {/* Service Icon/Image */}
          <View className="w-16 h-16 bg-primary/10 rounded-xl items-center justify-center">
            <Icon as={Scissors} size={24} className="text-primary" />
          </View>

          {/* Service Details */}
          <View className="flex-1">
            <Text className="font-semibold text-foreground mb-1">
              {service.service_title}
            </Text>
            <Text className="text-muted-foreground text-sm mb-2">
              by {service.provider_name}
            </Text>
            <View className="flex-row items-center gap-1">
              <Icon as={MapPin} size={14} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground">
                {service.category_name} › {service.subcategory_name}
              </Text>
            </View>
          </View>

          {/* Arrow */}
          <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
        </View>
      </CardContent>
    </Card>
  );
}
```

---

## 📊 Performance Characteristics

### Search Performance
- **Index Type**: GIN (Generalized Inverted Index)
- **Time Complexity**: O(log n) lookup
- **Search Vector Size**: 108 keywords + 26 services/providers = 134 indexed items
- **Cache Strategy**: 5-minute stale time, 10-minute garbage collection

### React Query Caching
```typescript
{
  queryKey: ['services', 'search', query, limit, offset],
  staleTime: 5 * 60 * 1000,  // 5 minutes - data considered fresh
  gcTime: 10 * 60 * 1000,    // 10 minutes - cache persists
  enabled: query.length > 0   // Conditional fetching
}
```

---

## 🔧 Customization Options

### Adjusting Search Behavior
```typescript
// More aggressive caching (for relatively stable data)
const { data } = useServiceSearch({
  query,
  limit: 20,
  enabled: query.length > 0,
  staleTime: 15 * 60 * 1000, // 15 minutes
});

// Real-time search (no caching)
const { data } = useServiceSearch({
  query,
  limit: 20,
  enabled: query.length > 0,
  staleTime: 0, // Always fresh
});

// Minimum query length
const { data } = useServiceSearch({
  query,
  limit: 20,
  enabled: query.length >= 3, // At least 3 characters
});
```

### Custom Ranking (Future Enhancement)
```sql
-- Future: Boost specific keywords or categories
SELECT *, 
  CASE
    WHEN keyword = 'nail tech' THEN relevance_rank * 1.5
    WHEN is_primary = true THEN relevance_rank * 1.2
    ELSE relevance_rank
  END as boosted_rank
FROM search_services('query');
```

---

## ✅ Testing Checklist

### Manual Testing
- [ ] Search "nail tech" returns nail services ✅
- [ ] Search "MUA" returns makeup services ✅
- [ ] Search "photographer" returns photography services ✅
- [ ] Debounced search prevents excessive API calls ✅
- [ ] Empty query doesn't trigger search ✅
- [ ] Results update when query changes ✅
- [ ] Pagination works correctly ✅

### Performance Testing
- [ ] Search completes in < 100ms (typical)
- [ ] Cache prevents redundant API calls
- [ ] Infinite scroll doesn't cause jank
- [ ] Works smoothly on lower-end devices

---

## 🚀 Next Steps

### Immediate (Priority 1)
1. ✅ **Create Search UI components** (in-progress)
   - SearchInput with debounce
   - SearchResults with FlashList
   - SearchFilters for categories

2. **Integrate into customer flow**
   - Add search to home screen
   - Add search to category browsing
   - Add search to provider discovery

### Short-term (Priority 2)
3. **Add location-based search**
   - Filter by distance
   - Sort by proximity
   - Show provider service radius

4. **Add advanced filters**
   - Price range filtering
   - Availability filtering
   - Rating/review filtering

### Long-term (Priority 3)
5. **Search analytics**
   - Track popular searches
   - Identify missing keywords
   - Monitor search performance

6. **AI-powered search**
   - Natural language queries
   - "I need a haircut tomorrow" → Find available hair stylists
   - Intent detection

---

## 📚 Related Documentation
- [SCHEMA_OPTIMIZATION_COMPLETE.md](./SCHEMA_OPTIMIZATION_COMPLETE.md) - Full optimization journey
- [supabase/migrations/20251018000003_populate_service_keywords.sql](../supabase/migrations/20251018000003_populate_service_keywords.sql) - Keyword population
- [src/hooks/shared/use-service-search.ts](../src/hooks/shared/use-service-search.ts) - Service search hook
- [src/hooks/shared/use-provider-search.ts](../src/hooks/shared/use-provider-search.ts) - Provider search hook

---

## 💡 Pro Tips

1. **Always debounce search inputs** (300ms recommended)
2. **Use conditional fetching** (`enabled` prop)
3. **Implement infinite scroll** for large result sets
4. **Show loading states** for better UX
5. **Cache aggressively** to reduce API calls
6. **Monitor search performance** in production
7. **Add search analytics** to improve keywords

---

**Status**: ✅ Phase 1 (Database) Complete | ⏳ Phase 2 (Frontend) In Progress  
**Last Updated**: October 18, 2024  
**Keywords**: 108 across 12 subcategories  
**Search Functions**: search_services(), search_providers()  
**Frontend Hooks**: useServiceSearch, useProviderSearch
