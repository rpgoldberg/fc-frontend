/**
 * FigureForm Module
 *
 * Main form component with extracted sub-components for maintainability.
 * Each sub-component is kept under 750 lines per project standards.
 */
export { default } from './FigureFormMain';
export { default as MfcAuthSection } from './MfcAuthSection';
export { default as CoreFieldsSection } from './CoreFieldsSection';
export { default as CollectionDetailsSection } from './CollectionDetailsSection';
export { default as CatalogPurchaseSection } from './CatalogPurchaseSection';
export type { StorageType } from './MfcAuthSection';
