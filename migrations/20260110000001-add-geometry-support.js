module.exports = {
  /**
   * Migration: Add geometry fields and indexes to provinces, districts, and wards
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async up(db, client) {
    console.log('Adding geometry fields to provinces, districts, and wards...');

    // Create geometry_versions collection
    await db.createCollection('geometry_versions', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['entityType', 'entityCode', 'version', 'geometry', 'snapshotDate'],
          properties: {
            entityType: {
              bsonType: 'string',
              enum: ['province', 'district', 'ward'],
              description: 'Type of administrative entity',
            },
            entityCode: {
              bsonType: 'string',
              description: 'Code of the administrative entity',
            },
            version: {
              bsonType: 'number',
              description: 'Version number',
            },
            geometry: {
              bsonType: 'object',
              description: 'GeoJSON geometry snapshot',
            },
            updatedBy: {
              bsonType: 'string',
              description: 'User ID who updated the geometry',
            },
            changeDescription: {
              bsonType: 'string',
              description: 'Description of the change',
            },
            geometryMeta: {
              bsonType: 'object',
              description: 'Metadata about the geometry',
            },
            snapshotDate: {
              bsonType: 'date',
              description: 'Date of the snapshot',
            },
          },
        },
      },
    });

    // Create indexes for geometry_versions
    await db.collection('geometry_versions').createIndexes([
      { key: { entityType: 1 } },
      { key: { entityCode: 1 } },
      { key: { entityType: 1, entityCode: 1, version: -1 } },
      { key: { snapshotDate: -1 } },
    ]);

    console.log('Created geometry_versions collection with indexes');

    // Add geometry fields to provinces (set as optional, won't fail if field exists)
    // The schema will be enforced by Mongoose, not by MongoDB validation
    
    // Create 2dsphere index on provinces.geometry
    try {
      await db.collection('provinces').createIndex({ geometry: '2dsphere' });
      console.log('Created 2dsphere index on provinces.geometry');
    } catch (err) {
      console.log('2dsphere index on provinces.geometry already exists or error:', err.message);
    }

    // Create centroid index on provinces
    try {
      await db.collection('provinces').createIndex({ 'centroid.lat': 1, 'centroid.lon': 1 });
      console.log('Created centroid index on provinces');
    } catch (err) {
      console.log('Centroid index on provinces already exists or error:', err.message);
    }

    // Create 2dsphere index on districts.geometry
    try {
      await db.collection('districts').createIndex({ geometry: '2dsphere' });
      console.log('Created 2dsphere index on districts.geometry');
    } catch (err) {
      console.log('2dsphere index on districts.geometry already exists or error:', err.message);
    }

    // Create centroid index on districts
    try {
      await db.collection('districts').createIndex({ 'centroid.lat': 1, 'centroid.lon': 1 });
      console.log('Created centroid index on districts');
    } catch (err) {
      console.log('Centroid index on districts already exists or error:', err.message);
    }

    // Create 2dsphere index on wards.geometry
    try {
      await db.collection('wards').createIndex({ geometry: '2dsphere' });
      console.log('Created 2dsphere index on wards.geometry');
    } catch (err) {
      console.log('2dsphere index on wards.geometry already exists or error:', err.message);
    }

    // Create centroid index on wards
    try {
      await db.collection('wards').createIndex({ 'centroid.lat': 1, 'centroid.lon': 1 });
      console.log('Created centroid index on wards');
    } catch (err) {
      console.log('Centroid index on wards already exists or error:', err.message);
    }

    console.log('Migration completed successfully');
  },

  /**
   * Rollback: Remove geometry fields and indexes
   * @param db {import('mongodb').Db}
   * @param client {import('mongodb').MongoClient}
   * @returns {Promise<void>}
   */
  async down(db, client) {
    console.log('Rolling back geometry fields and indexes...');

    // Drop geometry_versions collection
    try {
      await db.collection('geometry_versions').drop();
      console.log('Dropped geometry_versions collection');
    } catch (err) {
      console.log('geometry_versions collection does not exist or error:', err.message);
    }

    // Drop indexes from provinces
    try {
      await db.collection('provinces').dropIndex('geometry_2dsphere');
      console.log('Dropped 2dsphere index from provinces');
    } catch (err) {
      console.log('2dsphere index on provinces does not exist or error:', err.message);
    }

    try {
      await db.collection('provinces').dropIndex('centroid.lat_1_centroid.lon_1');
      console.log('Dropped centroid index from provinces');
    } catch (err) {
      console.log('Centroid index on provinces does not exist or error:', err.message);
    }

    // Drop indexes from districts
    try {
      await db.collection('districts').dropIndex('geometry_2dsphere');
      console.log('Dropped 2dsphere index from districts');
    } catch (err) {
      console.log('2dsphere index on districts does not exist or error:', err.message);
    }

    try {
      await db.collection('districts').dropIndex('centroid.lat_1_centroid.lon_1');
      console.log('Dropped centroid index from districts');
    } catch (err) {
      console.log('Centroid index on districts does not exist or error:', err.message);
    }

    // Drop indexes from wards
    try {
      await db.collection('wards').dropIndex('geometry_2dsphere');
      console.log('Dropped 2dsphere index from wards');
    } catch (err) {
      console.log('2dsphere index on wards does not exist or error:', err.message);
    }

    try {
      await db.collection('wards').dropIndex('centroid.lat_1_centroid.lon_1');
      console.log('Dropped centroid index from wards');
    } catch (err) {
      console.log('Centroid index on wards does not exist or error:', err.message);
    }

    // Note: We don't remove the geometry fields from documents as they may contain data
    // If you want to remove the fields, uncomment the following:
    /*
    await db.collection('provinces').updateMany({}, { $unset: { 
      geometry: '', geometrySimplified: '', centroid: '', bbox: '', 
      areaSqKm: '', geometrySource: '', geometryVersion: '', 
      geometryUpdatedAt: '', geometryUpdatedBy: '', geometryMeta: '' 
    }});
    await db.collection('districts').updateMany({}, { $unset: { 
      geometry: '', geometrySimplified: '', centroid: '', bbox: '', 
      areaSqKm: '', geometrySource: '', geometryVersion: '', 
      geometryUpdatedAt: '', geometryUpdatedBy: '', geometryMeta: '' 
    }});
    await db.collection('wards').updateMany({}, { $unset: { 
      geometry: '', geometrySimplified: '', centroid: '', bbox: '', 
      areaSqKm: '', geometrySource: '', geometryVersion: '', 
      geometryUpdatedAt: '', geometryUpdatedBy: '', geometryMeta: '' 
    }});
    */

    console.log('Rollback completed successfully');
  },
};
