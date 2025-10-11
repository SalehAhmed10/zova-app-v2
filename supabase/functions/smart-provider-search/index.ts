import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare Deno global for TypeScript
declare const Deno: any

interface SearchRequest {
  query?: string
  category?: string
  subcategory?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  maxDistance?: number
  userLat?: number
  userLng?: number
  houseCallOnly?: boolean
  sortBy?: 'relevance' | 'rating' | 'distance' | 'price' | 'name'
  sortOrder?: 'asc' | 'desc'
  maxResults?: number
}

// Haversine distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const url = new URL(req.url)
    const filters: SearchRequest = {}

    // Parse query parameters (for GET requests)
    for (const [key, value] of url.searchParams) {
      if (key === 'query' || key === 'category' || key === 'subcategory') {
        (filters as any)[key] = value
      } else if (key === 'sortBy') {
        filters[key] = value as 'relevance' | 'rating' | 'distance' | 'price' | 'name'
      } else if (key === 'sortOrder') {
        filters[key] = value as 'asc' | 'desc'
      } else if (key === 'houseCallOnly') {
        filters[key] = value === 'true'
      } else {
        const numValue = parseFloat(value)
        if (!isNaN(numValue)) {
          (filters as any)[key] = numValue
        }
      }
    }

    // Parse JSON body (for POST requests)
    if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json()
        Object.assign(filters, body)
      } catch (err) {
        console.log('🔍 Smart Search - Error parsing JSON body:', err)
      }
    }

    const {
      query,
      category,
      subcategory,
      minPrice,
      maxPrice,
      minRating = 0,
      maxDistance,
      userLat,
      userLng,
      houseCallOnly = false,
      sortBy = 'relevance',
      sortOrder = 'desc',
      maxResults = 50
    } = filters

    console.log('🔍 Smart Search Edge Function - Starting with filters:', filters)

    // Build expanded search terms
    const searchTerms = query ? [query.toLowerCase()] : []
    console.log('🔍 Smart Search - Search terms:', searchTerms)

    // For text-based searches, disable distance filtering to allow global results
    // GPS is only used for proximity sorting when no specific search query is provided
    const effectiveMaxDistance = searchTerms.length > 0 ? undefined : maxDistance
    console.log('🔍 Smart Search - Text search detected:', searchTerms.length > 0, 'Effective max distance:', effectiveMaxDistance)

    console.log('🔍 Smart Search - Executing database function call')

    const { data: rawData, error } = await supabase.rpc('get_providers_with_coordinates', {
      p_limit: maxResults * 2,
      p_house_call_only: houseCallOnly,
      p_category: category,
      p_subcategory: subcategory,
      p_min_price: minPrice,
      p_max_price: maxPrice
    })

    if (error) {
      console.error('🔍 Smart Search - Database function error:', error)
      throw error
    }

    console.log('🔍 Smart Search - Raw database results:', rawData?.length || 0)
    if (rawData && rawData.length > 0) {
      console.log('🔍 Smart Search - First provider coordinates data:', {
        id: rawData[0].id,
        provider_lat: rawData[0].provider_lat,
        provider_lng: rawData[0].provider_lng,
        coordinates: rawData[0].coordinates
      })
    }

    // Patch: If provider_lat/provider_lng are null, but coordinates is a hex string, parse it using PostGIS EWKB
    let processedData: any[] = (rawData || []).map((provider: any) => {
      let { provider_lat, provider_lng, coordinates } = provider;
      // If provider_lat/lng are null and coordinates is a hex string, try to parse
      if ((provider_lat == null || provider_lng == null) && typeof coordinates === 'string' && coordinates.length === 48) {
        // Try to parse EWKB hex string (PostGIS geography)
        // Example: "0101000020E61000004182E2C7988F5DC0F46C567DAE064140"
        try {
          // Extract X (lng) and Y (lat) from hex
          // Bytes 16-23: X (lng), 24-31: Y (lat)
          const hexToDouble = (hex: string) => {
            const buf = new ArrayBuffer(8);
            const view = new DataView(buf);
            for (let i = 0; i < 8; i++) {
              view.setUint8(i, parseInt(hex.substr(i * 2, 2), 16));
            }
            return view.getFloat64(0, true);
          };
          provider_lng = hexToDouble(coordinates.substr(16, 16));
          provider_lat = hexToDouble(coordinates.substr(32, 16));
        } catch (err) {
          console.log('🔍 Smart Search - Failed to parse EWKB hex:', coordinates, err);
        }
      }
      return { ...provider, provider_lat, provider_lng };
    });

    // Debug coordinates
    if (processedData.length > 0) {
      console.log('🔍 Smart Search - First provider coordinates:', processedData[0])
    }

    // Apply search term filtering
    if (searchTerms.length > 0) {
      processedData = processedData.filter(provider => {
        // Search in service titles (existing functionality)
        const serviceMatch = provider.provider_services?.some((service: any) => {
          const title = service?.title?.toLowerCase() || ''
          return searchTerms.some(term => title.includes(term))
        })

        // Search in provider information (business name, city, country, bio)
        const providerMatch = searchTerms.some(term => {
          const businessName = provider.business_name?.toLowerCase() || ''
          const city = provider.city?.toLowerCase() || ''
          const country = provider.country?.toLowerCase() || ''
          const bio = provider.bio?.toLowerCase() || ''
          const firstName = provider.first_name?.toLowerCase() || ''
          const lastName = provider.last_name?.toLowerCase() || ''

          return businessName.includes(term) ||
                 city.includes(term) ||
                 country.includes(term) ||
                 bio.includes(term) ||
                 `${firstName} ${lastName}`.includes(term)
        })

        return serviceMatch || providerMatch
      })
      console.log('🔍 Smart Search - After search filtering:', processedData.length)
    }

    // Calculate distances and filter by max distance if coordinates provided
    if (processedData.length > 0 && userLat !== undefined && userLng !== undefined) {
      console.log('🔍 Smart Search - Calculating distances for', processedData.length, 'providers')

      processedData = processedData.map((provider: any) => {
        let distance = null
        let providerLat = provider.provider_lat
        let providerLng = provider.provider_lng

        // If SQL extraction didn't work, try fallback parsing
        if ((providerLat === null || providerLng === null) && provider.coordinates) {
          try {
            // If coordinates is a string like "POINT(lng lat)"
            if (typeof provider.coordinates === 'string') {
              const match = provider.coordinates.match(/POINT\(([^ ]+) ([^)]+)\)/)
              if (match) {
                providerLng = parseFloat(match[1])
                providerLat = parseFloat(match[2])
              }
            }
            // If coordinates is an array [lng, lat]
            else if (Array.isArray(provider.coordinates) && provider.coordinates.length === 2) {
              providerLng = provider.coordinates[0]
              providerLat = provider.coordinates[1]
            }
            // If coordinates is a PostGIS point object
            else if (typeof provider.coordinates === 'object' && provider.coordinates.coordinates) {
              [providerLng, providerLat] = provider.coordinates.coordinates
            }
          } catch (err) {
            console.log('🔍 Smart Search - Error parsing coordinates for provider', provider.id, err)
          }
        }

        // Calculate distance if we have coordinates
        if (providerLat !== null && providerLng !== null && !isNaN(providerLat) && !isNaN(providerLng)) {
          distance = calculateDistance(userLat, userLng, providerLat, providerLng)
          console.log(`🔍 Smart Search - Provider ${provider.business_name}: distance ${distance?.toFixed(2)}km`)
        }

        return {
          ...provider,
          distance,
          provider_lat: providerLat,
          provider_lng: providerLng
        }
      })

      // Filter by max distance if specified
      if (effectiveMaxDistance !== undefined) {
        const beforeFilter = processedData.length
        processedData = processedData.filter(provider => {
          return provider.distance === null || provider.distance <= effectiveMaxDistance
        })
        console.log(`🔍 Smart Search - Filtered by max distance ${effectiveMaxDistance}km: ${beforeFilter} -> ${processedData.length}`)
      }
    }

    // Calculate average ratings
    processedData = processedData.map(provider => {
      const reviews = provider.reviews || []
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0

      return {
        ...provider,
        avg_rating: Math.round(avgRating * 10) / 10,
        review_count: reviews.length
      }
    })

    // Apply rating filter
    if (minRating > 0) {
      processedData = processedData.filter(provider => provider.avg_rating >= minRating)
    }

    // Sort results
    processedData.sort((a: any, b: any) => {
      let comparison = 0

      switch (sortBy) {
        case 'rating':
          comparison = b.avg_rating - a.avg_rating
          break
        case 'distance':
          if (a.distance === null && b.distance === null) comparison = 0
          else if (a.distance === null) comparison = 1
          else if (b.distance === null) comparison = -1
          else comparison = a.distance - b.distance
          break
        case 'price':
          const aPrice = a.provider_services?.[0]?.base_price || 0
          const bPrice = b.provider_services?.[0]?.base_price || 0
          comparison = aPrice - bPrice
          break
        case 'name':
          comparison = (a.business_name || a.first_name || '').localeCompare(b.business_name || b.first_name || '')
          break
        case 'relevance':
        default:
          // Default relevance sorting (could be improved)
          comparison = b.avg_rating - a.avg_rating
          break
      }

      return sortOrder === 'desc' ? comparison : -comparison
    })

    // Format final results
    const finalResults = processedData.slice(0, maxResults).map(provider => ({
      id: provider.id,
      first_name: provider.first_name,
      last_name: provider.last_name,
      business_name: provider.business_name,
      avatar_url: provider.avatar_url,
      bio: provider.bio,
      address: provider.address,
      city: provider.city,
      country: provider.country,
      distance: provider.distance !== null && provider.distance !== undefined ? Math.round(provider.distance * 10) / 10 : null,
      avg_rating: provider.avg_rating,
      review_count: provider.review_count,
      services: provider.provider_services?.map((service: any) => ({
        id: service.id,
        title: service.title,
        base_price: service.base_price,
        price_type: service.price_type,
        description: service.description,
        house_call_available: service.house_call_available,
        category: service.service_subcategories?.service_categories?.name,
        subcategory: service.service_subcategories?.name
      })) || []
    }))

    console.log('🔍 Smart Search - Final results:', finalResults.length)

    return new Response(
      JSON.stringify({
        data: finalResults,
        count: finalResults.length,
        query: filters
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('🔍 Smart Search - Error:', error)
    return new Response(
      JSON.stringify({
        data: null,
        error: (error as Error).message || 'Unknown error'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})