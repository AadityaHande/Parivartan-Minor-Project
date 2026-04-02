import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/server';
import { sendSMS } from '@/lib/twilio';

const DEPARTMENTS = ['Engineering', 'Drainage', 'Electricity', 'Sanitation', 'Roads'];
const SKILL_TYPES = ['Garbage', 'Road Repair', 'Electrical'];

function normalizeSegment(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizePhoneNumber(value: string) {
  const compact = value.replace(/[\s()-]/g, '');

  if (compact.startsWith('+')) {
    return compact;
  }

  const digitsOnly = compact.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  return compact;
}

function generatePassword(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#';
  let output = '';
  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}

async function generateWorkerId(firestore: FirebaseFirestore.Firestore) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const serial = Math.floor(1000 + Math.random() * 9000);
    const candidate = `WRK-${serial}`;

    const existing = await firestore
      .collection('users')
      .where('employeeId', '==', candidate)
      .limit(1)
      .get();

    if (existing.empty) {
      return candidate;
    }
  }

  throw new Error('Could not generate a unique worker ID. Please retry.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const fullName = normalizeSegment(String(body.fullName || ''));
    const phoneNumber = normalizeSegment(String(body.phoneNumber || ''));
    const emailInput = normalizeSegment(String(body.email || ''));
    const department = normalizeSegment(String(body.department || ''));
    const designation = normalizeSegment(String(body.designation || ''));
    const skillType = normalizeSegment(String(body.skillType || ''));
    const assignedContractor = normalizeSegment(String(body.assignedContractor || ''));
    const wardArea = normalizeSegment(String(body.wardArea || ''));
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    if (!fullName || !phoneNumber || !department || !designation || !skillType || !assignedContractor || !wardArea) {
      return NextResponse.json(
        { error: 'Missing required worker fields.' },
        { status: 400 }
      );
    }

    if (!normalizedPhoneNumber.startsWith('+')) {
      return NextResponse.json(
        { error: 'Phone number must include a country code or be a valid 10-digit Indian mobile number.' },
        { status: 400 }
      );
    }

    if (!DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: 'Invalid department.' }, { status: 400 });
    }

    if (!SKILL_TYPES.includes(skillType)) {
      return NextResponse.json({ error: 'Invalid skill type.' }, { status: 400 });
    }

    const { auth, firestore } = await getFirebaseAdmin();

    const workerId = await generateWorkerId(firestore);
    const password = generatePassword();
    const loginEmail = emailInput || `${workerId.toLowerCase()}@workers.parivartan.local`;

    const createdAuthUser = await auth.createUser({
      email: loginEmail,
      password,
      displayName: fullName,
      phoneNumber: normalizedPhoneNumber,
    });

    await firestore.collection('users').doc(createdAuthUser.uid).set({
      id: createdAuthUser.uid,
      name: fullName,
      phoneNumber,
      email: loginEmail,
      role: 'worker',
      points: 0,
      department,
      designation,
      skillType,
      assignedContractor,
      wardArea,
      organization: assignedContractor,
      employeeId: workerId,
      createdAt: new Date().toISOString(),
    });

    let smsStatus: 'sent' | 'failed' = 'sent';

    try {
      await sendSMS({
        phoneNumber: normalizedPhoneNumber,
        message: `Congrats! Your worker account is ready. ID: ${workerId} Pass: ${password}`,
      });
    } catch (error) {
      console.error('Worker onboarding SMS failed:', error);
      smsStatus = 'failed';
    }

    return NextResponse.json({
      success: true,
      workerId,
      password,
      smsStatus,
    });
  } catch (error) {
    console.error('Failed to create worker account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Worker creation failed.' },
      { status: 500 }
    );
  }
}
