import { validateCatalog } from './catalog.mjs';
console.log(JSON.stringify(await validateCatalog(), null, 2));
