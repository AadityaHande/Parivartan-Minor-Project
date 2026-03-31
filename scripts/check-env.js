#!/usr/bin/env node

console.log('\n🛣️  PMC Road Damage Reporting System\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const fs = require('fs');
const path = require('path');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Check for placeholder values
const hasPlaceholders = envContent.includes('your_gemini_api_key_here') || 
                        envContent.includes('your_firebase_api_key');

if (hasPlaceholders) {
  console.log('⚠️  CONFIGURATION REQUIRED\n');
  console.log('Your .env file contains placeholder values. To run this app, you need to:');
  console.log('');
  console.log('📋 Setup Steps:');
  console.log('  1. Create a Firebase project at https://console.firebase.google.com');
  console.log('  2. Enable Authentication (Google provider)');
  console.log('  3. Create a Firestore database');
  console.log('  4. Get a Gemini API key from https://ai.google.dev');
  console.log('  5. Update .env file with your credentials');
  console.log('');
  console.log('📖 For detailed instructions, see: SETUP.md');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
}

console.log('✅ Configuration looks good!\n');
console.log('Starting development server...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
