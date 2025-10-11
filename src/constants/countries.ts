import { Country, State, City } from 'country-state-city';

// Country data for picker
export const COUNTRIES = Country.getAllCountries().map(country => ({
  value: country.isoCode,
  label: country.name,
  code: country.isoCode,
  flag: country.flag,
}));

// Helper to get states/provinces for a country
export const getStatesForCountry = (countryCode: string) => {
  return State.getStatesOfCountry(countryCode).map(state => ({
    value: state.isoCode,
    label: state.name,
    code: state.isoCode,
  }));
};

// Helper to get cities for a state
export const getCitiesForState = (countryCode: string, stateCode: string) => {
  return City.getCitiesOfState(countryCode, stateCode).map(city => ({
    value: `${countryCode}-${stateCode}-${city.name}`, // Unique key
    label: city.name,
  }));
};

// Helper to get all cities for a country (when no state is selected)
export const getCitiesForCountry = (countryCode: string) => {
  return City.getCitiesOfCountry(countryCode).map(city => ({
    value: `${countryCode}-${city.stateCode || 'no-state'}-${city.name}`, // Unique key
    label: city.name,
  }));
};

// Helper to get country info by code
export const getCountryByCode = (code: string) => {
  return Country.getCountryByCode(code);
};