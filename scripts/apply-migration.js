/* global __dirname */
// Apply database migration script
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials in .env.local');
      process.exit(1);
    }
    
    console.log('📡 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '0002_fix_schema_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log('🔧 Applying migration...\n');
    
    // Execute the migration using RPC (Supabase's SQL execution method)
    // We need to break it into parts because of the DO block
    
    // First, check if the column exists
    const { data: columnCheck, error: checkError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'events' AND column_name = 'photo_url';
        `
      });
    
    if (checkError) {
      // RPC might not be available, try direct approach
      console.log('ℹ️  RPC not available, attempting direct SQL execution...');
      
      // Try using the REST API with a simpler approach
      const { error: addColumnError } = await supabase
        .from('events')
        .select('photo_url')
        .limit(1);
      
      if (addColumnError && addColumnError.message.includes('column')) {
        console.log('✅ Column photo_url does not exist, needs to be added');
        console.log('\n⚠️  Cannot execute DDL statements via Supabase client directly.');
        console.log('\n📋 Please apply the migration manually:');
        console.log('\n1. Go to: https://supabase.com/dashboard/project/jephwdsmehrmninpaggs/sql/new');
        console.log('2. Copy and paste the contents of: migrations/0002_fix_schema_columns.sql');
        console.log('3. Click "Run" or press Cmd+Enter\n');
        process.exit(1);
      } else {
        console.log('✅ Column photo_url already exists or table structure is correct');
        console.log('✅ Migration already applied or not needed');
        process.exit(0);
      }
    }
    
    if (columnCheck && columnCheck.length > 0) {
      console.log('✅ Column photo_url already exists');
      console.log('✅ Migration already applied');
    } else {
      console.log('⚠️  Column photo_url needs to be added');
      console.log('\n📋 Please apply the migration manually via Supabase Dashboard SQL Editor');
      console.log('URL: https://supabase.com/dashboard/project/jephwdsmehrmninpaggs/sql/new\n');
    }
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.log('\n📋 Manual application required:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run the SQL from: migrations/0002_fix_schema_columns.sql\n');
    process.exit(1);
  }
}

applyMigration();
