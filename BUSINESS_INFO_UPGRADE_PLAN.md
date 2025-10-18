# Business Info Screen Upgrade Plan

## 🎯 Goal
Upgrade provider business info screen to match the quality and features of the customer personal info screen.

## 📊 Feature Comparison

### Customer Personal Info ✅ (Reference)
- ✅ Searchable Country Select with flags
- ✅ Searchable City Select (dependent on country)
- ✅ Searchable Country Code Select for phone
- ✅ Address Geocoding Validation
- ✅ Coordinates Saving (latitude/longitude)
- ✅ Success Toast after save
- ✅ Validation Status Indicators (CheckCircle, AlertCircle, AlertTriangle)
- ✅ Loading State with Loader2 icon
- ✅ Lenient Address Validation (allows partial address)
- ✅ Character Counter for bio field
- ✅ Card-based Layout with CardHeader/CardContent

### Provider Business Info ⚠️ (Current)
- ✅ React Hook Form validation
- ✅ Zustand + React Query architecture
- ✅ Database data fetching and merging
- ⚠️ Hardcoded country code (+44)
- ⚠️ Simple text inputs (no searchable dropdowns)
- ❌ No address geocoding
- ❌ No coordinates saving
- ❌ No success toast
- ❌ No validation status indicators
- ❌ No loading overlay during submission

## 🔧 Required Changes

### 1. Add Searchable Dropdowns

**Import Components**:
```tsx
import { SearchableCountrySelect } from '@/components/ui/searchable-country-select';
import { SearchableCitySelect } from '@/components/ui/searchable-city-select';
import { SearchableCountryCodeSelect } from '@/components/ui/searchable-country-code-select';
```

**Update Form Interface**:
```tsx
interface BusinessInfoForm {
  businessName: string;
  phone_country_code?: {
    name: string;
    dial_code: string;
    code: string;
    flag: string;
  };
  phone_number: string;
  address: string;
  city: string;
  postalCode: string;
  country_code: string; // For country selection
}
```

**Replace Hardcoded Phone Country Code**:
```tsx
// Current: <Input value="+44" editable={false} />
// New: <SearchableCountryCodeSelect />
<Controller
  control={control}
  name="phone_country_code"
  rules={{ required: 'Please select a country code' }}
  render={({ field: { onChange, value } }) => (
    <SearchableCountryCodeSelect
      value={value}
      onValueChange={onChange}
      placeholder="Select"
      error={!!errors.phone_country_code}
    />
  )}
/>
```

**Add Country Selection**:
```tsx
<Controller
  control={control}
  name="country_code"
  rules={{ required: 'Please select your country' }}
  render={({ field: { onChange, value } }) => (
    <SearchableCountrySelect
      value={value}
      onValueChange={onChange}
      placeholder="Select country"
      error={!!errors.country_code}
    />
  )}
/>
```

**Add City Selection** (dependent on country):
```tsx
<Controller
  control={control}
  name="city"
  rules={{ required: 'City is required' }}
  render={({ field: { onChange, value } }) => (
    <SearchableCitySelect
      countryCode={selectedCountryCode}
      value={value}
      onValueChange={onChange}
      placeholder="Select city"
      disabled={!selectedCountryCode}
      error={!!errors.city}
    />
  )}
/>
```

### 2. Add Geocoding Validation

**Import Hook**:
```tsx
import { useGeocoding } from '@/hooks/shared/useGeocoding';
import { COUNTRIES, getCountryByCode } from '@/constants/countries';
```

**Add State**:
```tsx
const { 
  validateAddress: validateGeocoding, 
  isValidating: isGeocoding, 
  validationError: geocodingError, 
  validationWarning: geocodingWarning 
} = useGeocoding();

const [addressValidated, setAddressValidated] = useState(false);
```

**Validate in onSubmit**:
```tsx
const onSubmit = async (data: BusinessInfoForm) => {
  if (!user?.id) return;
  
  try {
    // Validate address if any address fields provided
    let coordinates = null;
    if (data.address || data.city || data.country_code) {
      const countryInfo = getCountryByCode(data.country_code);
      const addressComponents = {
        address: data.address,
        city: data.city,
        postal_code: data.postalCode,
        country: countryInfo?.name || data.country_code,
      };
      
      const validationResult = await validateGeocoding(addressComponents);
      
      if (validationResult.isValid) {
        coordinates = validationResult.coordinates;
        setAddressValidated(true);
      }
    }
    
    // Save with coordinates
    await saveBusinessInfoMutation.mutateAsync({
      providerId: user.id,
      step: 'business-info',
      data: {
        ...data,
        coordinates, // Add coordinates
      },
    });
    
    // ... rest of save logic
  } catch (error) {
    console.error('[Business Info] Error:', error);
  }
};
```

### 3. Add Validation Status Indicators

**Import Icons**:
```tsx
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Loader2 
} from 'lucide-react-native';
```

**Add Validation Status Display**:
```tsx
{/* Address Validation Status */}
{(isGeocoding || geocodingError || geocodingWarning || addressValidated) && (
  <View className={cn(
    "flex-row items-center gap-2 p-3 rounded-lg",
    isGeocoding && "bg-muted",
    geocodingError && "bg-destructive/10",
    geocodingWarning && "bg-yellow-500/10",
    addressValidated && "bg-green-500/10"
  )}>
    {isGeocoding && (
      <>
        <Icon as={Loader2} className="text-muted-foreground animate-spin" size={16} />
        <Text className="text-sm text-muted-foreground">Validating address...</Text>
      </>
    )}
    {geocodingError && (
      <>
        <Icon as={AlertCircle} className="text-destructive" size={16} />
        <Text className="text-sm text-destructive">{geocodingError}</Text>
      </>
    )}
    {geocodingWarning && !geocodingError && (
      <>
        <Icon as={AlertTriangle} className="text-yellow-500" size={16} />
        <Text className="text-sm text-yellow-700 dark:text-yellow-300">{geocodingWarning}</Text>
      </>
    )}
    {addressValidated && !geocodingError && !geocodingWarning && (
      <>
        <Icon as={CheckCircle} className="text-green-500" size={16} />
        <Text className="text-sm text-green-700 dark:text-green-300">Address verified</Text>
      </>
    )}
  </View>
)}
```

### 4. Update Database Schema

**Add Coordinates Columns**:
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

COMMENT ON COLUMN profiles.latitude IS 'Latitude coordinate for business location (from geocoding)';
COMMENT ON COLUMN profiles.longitude IS 'Longitude coordinate for business location (from geocoding)';

CREATE INDEX IF NOT EXISTS idx_profiles_coordinates 
ON profiles(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

### 5. Add Success Toast

**Import Toast** (assuming you have a toast system):
```tsx
import { useToast } from '@/hooks/shared/useToast'; // Or your toast implementation
```

**Show Success**:
```tsx
const { toast } = useToast();

const onSubmit = async (data: BusinessInfoForm) => {
  try {
    // ... save logic
    
    toast({
      title: 'Success',
      description: 'Business information saved successfully',
      variant: 'success',
    });
    
    // Navigate to next step
    navigateNext();
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to save business information',
      variant: 'destructive',
    });
  }
};
```

### 6. Add Loading Overlay

**Add State**:
```tsx
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Update Button**:
```tsx
<Button
  onPress={handleSubmit(onSubmit)}
  disabled={!isValid || isSubmitting || isGeocoding}
  className="mt-6"
>
  {isSubmitting ? (
    <View className="flex-row items-center gap-2">
      <Icon as={Loader2} className="text-primary-foreground animate-spin" size={20} />
      <Text className="text-primary-foreground">Saving...</Text>
    </View>
  ) : (
    <Text className="text-primary-foreground">Continue</Text>
  )}
</Button>
```

## 📝 Implementation Checklist

- [ ] Import searchable dropdown components
- [ ] Update form interface with phone_country_code and country_code
- [ ] Replace hardcoded +44 with SearchableCountryCodeSelect
- [ ] Add country selection dropdown
- [ ] Add city selection dropdown (dependent on country)
- [ ] Import and setup useGeocoding hook
- [ ] Add address validation in onSubmit
- [ ] Create database migration for latitude/longitude columns
- [ ] Update saveBusinessInfoMutation to include coordinates
- [ ] Add validation status indicators UI
- [ ] Add success toast after save
- [ ] Add loading state and overlay
- [ ] Update form default values to handle new fields
- [ ] Test full flow with real address
- [ ] Test error cases (invalid address, network failure)

## 🎨 UI Enhancement Checklist

- [ ] Use Card components for better visual hierarchy
- [ ] Add section titles with CardHeader
- [ ] Group related fields (Basic Info, Business Address)
- [ ] Add field helpers/hints
- [ ] Improve error message positioning
- [ ] Add proper spacing and padding
- [ ] Test dark mode compatibility
- [ ] Test on different screen sizes

## ⚠️ Important Notes

1. **Lenient Validation**: Allow saving even if geocoding fails (like customer screen)
2. **Phone Number Format**: Combine country code + number before saving
3. **Country Code Priority**: Use phone_country_code.dial_code for saving
4. **Database Sync**: Parse existing phone_number to extract country code on load
5. **City Dependency**: Disable city select until country is chosen
6. **Coordinates**: Save to profiles table if validation succeeds

## 🧪 Testing Scenarios

1. **Happy Path**:
   - Fill all fields correctly
   - Select country, city, phone country code
   - Enter valid address
   - Verify geocoding succeeds
   - Check coordinates saved to database
   - Verify navigation to next step

2. **Invalid Address**:
   - Enter non-existent address
   - Verify warning shown but save still allowed
   - Check coordinates are NULL in database

3. **Partial Address**:
   - Fill only city and country
   - Verify lenient validation allows save
   - Check warning shown

4. **Network Failure**:
   - Simulate network error during geocoding
   - Verify error shown gracefully
   - Allow save to proceed

5. **Existing Data**:
   - Load screen with existing business info
   - Verify fields pre-populated
   - Verify country code parsed correctly from phone_number

---

**Status**: Ready for Implementation
**Estimated Time**: 2-3 hours
**Priority**: Medium (UI enhancement, not critical bug fix)
