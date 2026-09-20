// Default cities and property types. The admin can change both (Admin → Settings) and the site
// reads the live lists from SettingsContext; the build scripts (sitemap, pre-render, llms.txt)
// use these defaults because they run without a browser.
export const DEFAULT_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Gurugram']
export const DEFAULT_PROPERTY_TYPES = ['Apartment', 'Villa', 'Studio', 'Commercial', 'Penthouse', 'House']
