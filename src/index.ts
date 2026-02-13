import { inventoryGenerator } from "./inventory-generator";
import { sriHashes } from "./sri-hashes";

(async () => {
  try {
    await inventoryGenerator();
    console.log("Inventory generation completed successfully.");
  } catch (error) {
    console.error("Error during inventory generation:", error);
  }

  try {
    await sriHashes();
    console.log("SRI hashes added successfully.");
  } catch (error) {
    console.error("Error adding SRI hashes:", error);
  }
})();
