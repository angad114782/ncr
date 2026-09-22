// Default cities and property types. The admin can change both (Admin → Settings) and the site
// reads the live lists from SettingsContext; the build scripts (sitemap, pre-render, llms.txt)
// use these defaults because they run without a browser.
// NCR cities first — the brand (NCR Estates) and domain (propertyinncr.com) are NCR-focused, so NCR
// keyword/landing pages get priority; the rest keep the platform honest about its other-city listings
// without making them the headline. A city with zero real listings never gets a page on its own
// (landingCombos() in utils/listingsUrl.js only builds a page when there's at least one match) — so
// adding Noida / Ghaziabad / Faridabad here just makes them selectable; their pages appear once real
// listings exist there, never before.
export const DEFAULT_CITIES = ['Gurugram', 'Noida', 'Delhi', 'Ghaziabad', 'Faridabad', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai']
export const DEFAULT_PROPERTY_TYPES = ['Apartment', 'Villa', 'Studio', 'Commercial', 'Penthouse', 'House']
