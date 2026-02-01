/**
 * Store module - re-exports from inspectionRepository for backward compatibility.
 * Now uses MongoDB for persistence when configured.
 */
export {
  saveInspection,
  getInspection,
  getAllInspections,
  getInspectionImage,
} from "./inspectionRepository.js";
