import { pool } from './server/db';

async function runMigration() {
  console.log('Starting migration to change score columns to real type...');

  try {
    // Begin transaction
    await pool.query('BEGIN');

    // Alter table to change columns from integer to real
    await pool.query(`
      ALTER TABLE player_results 
      ALTER COLUMN gross_score TYPE real USING gross_score::real,
      ALTER COLUMN net_score TYPE real USING net_score::real
    `);

    // Commit the transaction
    await pool.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    // Rollback in case of error
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

runMigration();
