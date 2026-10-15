import * as dotenv from 'dotenv';
import { client } from '../db/index.js';
import { hashPassword } from '../utils/argon2.js';

dotenv.config();

async function seedOwner() {
  const args = process.argv.slice(2);
  const [email, password, fullName, providedSecret] = args;

  if (!email || !password || !fullName || !providedSecret) {
    console.error(`
❌ Usage:
  npm run seed:owner <email> <password> "<fullName>" <ownerSetupSecret>

Example:
  npm run seed:owner admin@example.com StrongPass123! "Platform Owner" my_secret_key
`);
    process.exit(1);
  }

  const expectedSecret = process.env.OWNER_SETUP_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
    console.error('❌ Error: Invalid owner setup secret. Check OWNER_SETUP_SECRET in backend/.env.');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 1. Check if an owner already exists in the system
    const existingOwner = await client`
      SELECT id, email FROM users WHERE role = 'owner' LIMIT 1
    `;

    if (existingOwner && existingOwner.length > 0 && existingOwner[0].email !== normalizedEmail) {
      console.log(`🔄 Reassigning primary ownership from ${existingOwner[0].email} to ${normalizedEmail}...`);
      await client`
        UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = ${existingOwner[0].id}
      `;
    }

    // 2. Hash password with Argon2id
    console.log('🔒 Hashing password with Argon2id...');
    const passwordHash = await hashPassword(password);

    // 3. Create or promote user
    const existingUser = await client`
      SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `;

    let ownerId: string;

    if (existingUser && existingUser.length > 0) {
      ownerId = existingUser[0].id;
      await client`
        UPDATE users
        SET role = 'owner',
            password_hash = ${passwordHash},
            full_name = ${fullName},
            is_email_verified = true,
            email_verified_at = NOW(),
            updated_at = NOW()
        WHERE id = ${ownerId}
      `;
      console.log(`✅ User ${normalizedEmail} successfully promoted to OWNER!`);
    } else {
      const inserted = await client`
        INSERT INTO users (
          email,
          password_hash,
          full_name,
          role,
          is_email_verified,
          email_verified_at,
          learner_type
        )
        VALUES (
          ${normalizedEmail},
          ${passwordHash},
          ${fullName},
          'owner',
          true,
          NOW(),
          'self_directed'
        )
        RETURNING id
      `;
      ownerId = inserted[0].id;
      console.log(`✅ New OWNER account created for ${normalizedEmail}!`);
    }

    // 4. Record audit log entry
    await client`
      INSERT INTO audit_logs (
        admin_id,
        action,
        target_type,
        target_id,
        metadata
      )
      VALUES (
        ${ownerId},
        'owner_bootstrap_cli',
        'user',
        ${ownerId},
        ${JSON.stringify({ initiatedVia: 'CLI', timestamp: new Date().toISOString() })}
      )
    `;

    console.log('📜 Audit log record written to PostgreSQL.');
    console.log('✨ Owner account initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create owner:', error);
    process.exit(1);
  }
}

seedOwner();
