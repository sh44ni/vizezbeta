import { COUNTRY_MAP } from './countryMap.js';

const getCountryId = (name) => {
  if (!name) return '0';
  const upName = name.toUpperCase();
  if (COUNTRY_MAP[upName]) return COUNTRY_MAP[upName];
  
  // Fuzzy match (e.g., "NEPALI" -> "NEPAL")
  for (const [country, id] of Object.entries(COUNTRY_MAP)) {
    if (upName.includes(country) || country.includes(upName)) {
      return id;
    }
  }
  return '0';
};

console.log("NEPALI:", getCountryId("NEPALI"));
console.log("EMPTY:", getCountryId(""));
console.log("FILIPINO:", getCountryId("FILIPINO"));
