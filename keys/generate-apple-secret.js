// Generate Apple Client Secret JWT for Supabase
// Run: node keys/generate-apple-secret.js

const crypto = require('crypto');

const TEAM_ID = 'KYU8SN53P4';
const KEY_ID = 'U66UH44Z6R';
const CLIENT_ID = 'app.phonetransfer.PhoneTransfer';
const KEY_FILE = __dirname + '/AuthKey_U66UH44Z6R.p8';

const fs = require('fs');
const privateKey = fs.readFileSync(KEY_FILE, 'utf8');

// JWT Header
const header = {
    alg: 'ES256',
    kid: KEY_ID,
    typ: 'JWT'
};

// JWT Payload — valid for 180 days (max Apple allows)
const now = Math.floor(Date.now() / 1000);
const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + (86400 * 180), // 180 days
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID
};

function base64url(obj) {
    const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return Buffer.from(json).toString('base64url');
}

// Create JWT
const headerB64 = base64url(header);
const payloadB64 = base64url(payload);
const signingInput = headerB64 + '.' + payloadB64;

const sign = crypto.createSign('SHA256');
sign.update(signingInput);
const signature = sign.sign(privateKey, 'base64url');

const jwt = signingInput + '.' + signature;

console.log('\n=== Apple Client Secret (JWT) for Supabase ===\n');
console.log(jwt);
console.log('\n=== Config ===');
console.log('Team ID:', TEAM_ID);
console.log('Key ID:', KEY_ID);
console.log('Client ID:', CLIENT_ID);
console.log('Expires:', new Date((now + 86400 * 180) * 1000).toISOString());
console.log('\nPaste this JWT into Supabase → Auth → Providers → Apple → Secret Key');
