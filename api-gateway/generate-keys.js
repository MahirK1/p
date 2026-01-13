#!/usr/bin/env node

/**
 * Skripta za generisanje sigurnih API_KEY i JWT_SECRET
 * Koristi: node generate-keys.js
 */

import crypto from 'crypto';

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('base64').replace(/[+/=]/g, '').substring(0, length);
}

const apiKey = generateSecureKey(32);
const jwtSecret = generateSecureKey(64);

console.log('\n🔑 Generisani sigurni ključevi:\n');
console.log('API_KEY=' + apiKey);
console.log('JWT_SECRET=' + jwtSecret);
console.log('\n📋 Kopiraj ove vrednosti u .env fajl!\n');
console.log('⚠️  VAŽNO: Čuvaj ove ključeve na sigurnom mestu!');
console.log('⚠️  VAŽNO: Koristi ISTE ključeve u cloud server .env fajlu!\n');

