import { db } from './server/db';

/**
 * Migration script to add isManualEntry field to tournaments table
 * This field tracks whether a tournament was created via manual entry to prevent recalculation
 */
async function addManualEntryField() {
  console.log('Starting migration: Add isManualEntry field to tournaments table');

  try {
    // Add the isManualEntry column with default false
    await db.execute(`
      ALTER TABLE tournaments 
      ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT false NOT NULL;
    `);

    // Update any existing tournaments that appear to be manual entries
    // (This is optional - you can manually identify and update specific tournaments)
    console.log('isManualEntry field added to tournaments table');
    console.log('All existing tournaments marked as non-manual entry (default)');

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  addManualEntryField()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { addManualEntryField };
