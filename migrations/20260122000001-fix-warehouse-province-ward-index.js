/**
 * Migration: Fix warehouse province/ward index - remove unique constraint
 * 
 * Background:
 * The warehouse schema incorrectly had or was thought to have a unique compound index 
 * on 'province.code' and 'ward.code', which prevented multiple warehouses from being 
 * created in the same geographical area. This migration removes any such unique index 
 * and ensures only a non-unique index exists for query optimization.
 * 
 * Business requirement:
 * Multiple warehouses should be allowed in the same province/ward.
 * Only warehouse 'code' (and combination with 'tenantId') should be unique.
 */

module.exports = {
  async up(db, client) {
    console.log('Starting migration: fix-warehouse-province-ward-index');
    
    try {
      // Get existing indexes on the warehouses collection
      const indexes = await db.collection('warehouses').indexes();
      console.log('Current indexes on warehouses collection:');
      indexes.forEach(index => {
        console.log(`  - ${index.name}:`, JSON.stringify(index.key), index.unique ? '(UNIQUE)' : '');
      });

      // Check if there's a unique index on province.code and ward.code
      const problematicIndex = indexes.find(index => {
        const hasProvinceCode = index.key['province.code'] !== undefined;
        const hasWardCode = index.key['ward.code'] !== undefined;
        return hasProvinceCode && hasWardCode && index.unique === true;
      });

      if (problematicIndex) {
        console.log(`Found problematic unique index: ${problematicIndex.name}`);
        console.log('Dropping unique index on province.code and ward.code...');
        await db.collection('warehouses').dropIndex(problematicIndex.name);
        console.log(`Successfully dropped index: ${problematicIndex.name}`);
      } else {
        console.log('No problematic unique index found on province.code and ward.code');
      }

      // Ensure a non-unique compound index exists for query optimization
      const nonUniqueIndex = indexes.find(index => {
        const hasProvinceCode = index.key['province.code'] !== undefined;
        const hasWardCode = index.key['ward.code'] !== undefined;
        return hasProvinceCode && hasWardCode && !index.unique;
      });

      if (!nonUniqueIndex) {
        console.log('Creating non-unique compound index on province.code and ward.code...');
        await db.collection('warehouses').createIndex(
          { 'province.code': 1, 'ward.code': 1 },
          { unique: false, name: 'province.code_1_ward.code_1' }
        );
        console.log('Successfully created non-unique index');
      } else {
        console.log('Non-unique compound index already exists');
      }

      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  },

  async down(db, client) {
    console.log('Starting rollback: fix-warehouse-province-ward-index');
    
    try {
      // Get existing indexes
      const indexes = await db.collection('warehouses').indexes();
      
      // Find the non-unique compound index we created
      const indexToRemove = indexes.find(index => {
        const hasProvinceCode = index.key['province.code'] !== undefined;
        const hasWardCode = index.key['ward.code'] !== undefined;
        return hasProvinceCode && hasWardCode && !index.unique;
      });

      if (indexToRemove) {
        console.log(`Dropping non-unique index: ${indexToRemove.name}`);
        await db.collection('warehouses').dropIndex(indexToRemove.name);
        console.log('Successfully dropped non-unique index');
      }

      // Note: We do NOT recreate the unique index as it was incorrect
      // If you need to restore it for some reason, do so manually
      console.log('Rollback completed - note: unique index NOT restored as it was incorrect');
    } catch (error) {
      console.error('Error during rollback:', error);
      throw error;
    }
  }
};
