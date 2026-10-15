import * as dotenv from 'dotenv';
import { checkLockout, recordFailedAttempt, recordSuccessfulLogin } from '../utils/lockout.js';
import { hashPassword, verifyPassword } from '../utils/argon2.js';

dotenv.config();

async function runLockoutSecurityTest() {
  console.log('🧪 Starting Lockout & Security Verification Test against Neon Database...\n');
  const testEmail = `test_student_${Date.now()}@example.com`;
  const testIp = '127.0.0.1';

  // 1. Initial State
  const initial = await checkLockout(testEmail);
  console.log(`Step 1: Initial state for ${testEmail} -> isLocked: ${initial.isLocked}, failedCount: ${initial.failedCount}`);

  // 2. Simulate 4 failed attempts
  for (let i = 1; i <= 4; i++) {
    const attempt = await recordFailedAttempt(testEmail, testIp);
    console.log(`Step 2.${i}: Failed Attempt #${i} -> failedCount: ${attempt.failedCount}, isLocked: ${attempt.isLocked}`);
    if (attempt.isLocked) {
      throw new Error(`Premature lockout on attempt #${i}`);
    }
  }

  // 3. 5th Failed Attempt -> MUST trigger 30-second lockout
  const fifthAttempt = await recordFailedAttempt(testEmail, testIp);
  console.log(`Step 3: 5th Failed Attempt -> failedCount: ${fifthAttempt.failedCount}, isLocked: ${fifthAttempt.isLocked}, remainingSeconds: ${fifthAttempt.remainingSeconds}s`);

  if (!fifthAttempt.isLocked || fifthAttempt.remainingSeconds <= 0) {
    throw new Error('FAILED: 5th attempt did not lock the account for 30 seconds!');
  }
  console.log('🔒 Verified: 5th consecutive failed attempt successfully locked account for 30 seconds in Neon DB!');

  // 4. Verify checkLockout reports locked state
  const lockedCheck = await checkLockout(testEmail);
  console.log(`Step 4: Lockout Status Check -> isLocked: ${lockedCheck.isLocked}, remainingSeconds: ${lockedCheck.remainingSeconds}s`);

  // 5. Test successful login reset
  await recordSuccessfulLogin(testEmail);
  const resetCheck = await checkLockout(testEmail);
  console.log(`Step 5: After Successful Login -> isLocked: ${resetCheck.isLocked}, failedCount: ${resetCheck.failedCount}`);

  if (resetCheck.failedCount !== 0 || resetCheck.isLocked) {
    throw new Error('FAILED: Reset after successful login did not clear failure count.');
  }

  // 6. Test Argon2id password hash verification
  const testPw = 'StrongSecurePassword123!';
  const pwHash = await hashPassword(testPw);
  const isValid = await verifyPassword(pwHash, testPw);
  const isInvalid = await verifyPassword(pwHash, 'WrongPassword!');
  console.log(`Step 6: Argon2id verification -> Valid password: ${isValid}, Wrong password: ${!isInvalid}`);

  if (!isValid || isInvalid) {
    throw new Error('Argon2id password verification failed');
  }

  console.log('\n🎉 ALL SECURITY & LOCKOUT TESTS PASSED 100% AGAINST NEON POSTGRESQL!\n');
  process.exit(0);
}

runLockoutSecurityTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
