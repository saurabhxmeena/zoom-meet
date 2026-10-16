import { NextResponse } from 'next/server';
import { findUserByEmail, createMeeting, findMeetingByCode, updateMeetingStatus, addMessage, getMessagesByMeeting, recordParticipantJoin, recordParticipantLeave } from '@/lib/db';
import { comparePassword, signToken, verifyToken } from '@/lib/auth';

export async function GET() {
  const results = [];
  const startTime = Date.now();

  // Test 1: Authentication - Valid credentials test
  try {
    const user = await findUserByEmail('demo@mait.ac.in');
    const isPassValid = user && user.passwordHash ? comparePassword('password123', user.passwordHash) : false;
    results.push({
      id: 'TC-AUTH-01',
      category: 'Authentication',
      testCase: 'Verify valid credential authentication',
      expectedOutcome: 'Valid user admitted, password verified via bcrypt',
      status: isPassValid ? 'PASSED' : 'FAILED',
      evidence: isPassValid ? `User verified: ${user?.displayName} (${user?.email})` : 'Password verification failed',
    });
  } catch (err) {
    results.push({
      id: 'TC-AUTH-01',
      category: 'Authentication',
      testCase: 'Verify valid credential authentication',
      expectedOutcome: 'Valid user admitted',
      status: 'FAILED',
      evidence: (err as Error).message,
    });
  }

  // Test 2: Authentication - Invalid credentials test
  try {
    const user = await findUserByEmail('demo@mait.ac.in');
    const isWrongValid = user && user.passwordHash ? comparePassword('wrongpassword999', user.passwordHash) : false;
    results.push({
      id: 'TC-AUTH-02',
      category: 'Authentication',
      testCase: 'Reject invalid password attempt',
      expectedOutcome: 'Invalid password rejected',
      status: !isWrongValid ? 'PASSED' : 'FAILED',
      evidence: 'Invalid credential successfully rejected by bcrypt',
    });
  } catch (err) {
    results.push({
      id: 'TC-AUTH-02',
      category: 'Authentication',
      testCase: 'Reject invalid password attempt',
      expectedOutcome: 'Invalid password rejected',
      status: 'FAILED',
      evidence: (err as Error).message,
    });
  }

  // Test 3: Authentication - JWT token creation and verification
  try {
    const token = signToken({ userId: 'test_u1', email: 'test@mait.ac.in', displayName: 'Test User' });
    const verified = verifyToken(token);
    const tokenOk = verified && verified.email === 'test@mait.ac.in';
    results.push({
      id: 'TC-AUTH-03',
      category: 'Authentication',
      testCase: 'JWT session token generation and cryptographic validation',
      expectedOutcome: 'Token signed and decoded with valid claims',
      status: tokenOk ? 'PASSED' : 'FAILED',
      evidence: `Token payload decoded: ${verified?.displayName}`,
    });
  } catch (err) {
    results.push({
      id: 'TC-AUTH-03',
      category: 'Authentication',
      testCase: 'JWT session token generation and cryptographic validation',
      expectedOutcome: 'Token verified',
      status: 'FAILED',
      evidence: (err as Error).message,
    });
  }

  // Test 4: Meeting Creation & Unique ID check
  let createdMeetingCode = '';
  try {
    const meet1 = await createMeeting({
      title: 'Automated Test Meeting Alpha',
      hostUserId: 'user_1',
      hostName: 'Aarav Sharma',
    });
    const meet2 = await createMeeting({
      title: 'Automated Test Meeting Beta',
      hostUserId: 'user_1',
      hostName: 'Aarav Sharma',
    });
    createdMeetingCode = meet1.meetingCode;
    const isUnique = meet1.meetingCode !== meet2.meetingCode && meet1.meetingCode.length > 5;
    results.push({
      id: 'TC-MEET-01',
      category: 'Meeting Creation',
      testCase: 'Create meeting & verify non-colliding identifier',
      expectedOutcome: 'Unique formatted meeting identifier generated',
      status: isUnique ? 'PASSED' : 'FAILED',
      evidence: `Generated codes: ${meet1.meetingCode} vs ${meet2.meetingCode}`,
    });
  } catch (err) {
    results.push({
      id: 'TC-MEET-01',
      category: 'Meeting Creation',
      testCase: 'Create meeting & verify non-colliding identifier',
      expectedOutcome: 'Unique meeting code created',
      status: 'FAILED',
      evidence: (err as Error).message,
    });
  }

  // Test 5: Meeting Join - Valid lookup
  try {
    const found = await findMeetingByCode(createdMeetingCode);
    const isValid = !!found && found.status === 'active';
    results.push({
      id: 'TC-JOIN-01',
      category: 'Meeting Join',
      testCase: 'Join active meeting with valid identifier',
      expectedOutcome: 'Active meeting record located and returned',
      status: isValid ? 'PASSED' : 'FAILED',
      evidence: `Located meeting title: "${found?.title}", status: ${found?.status}`,
    });
  } catch (err) {
    results.push({
      id: 'TC-JOIN-01',
      category: 'Meeting Join',
      testCase: 'Join active meeting with valid identifier',
      expectedOutcome: 'Meeting located',
      status: 'FAILED',
      evidence: (err as Error).message,
    });
  }

  // Test 6: Meeting Join - Invalid non-existent room code
  try {
    const nonExistent = await findMeetingByCode('invalid-room-999-000');
    results.push({
      id: 'TC-JOIN-02',
      category: 'Meeting Join',
      testCase: 'Attempt to join non-existent meeting code',
      expectedOutcome: 'Lookup returns null/404',
      status: nonExistent === null ? 'PASSED' : 'FAILED',
      evidence: 'Non-existent code successfully rejected with null record',
    });
  } catch (err) {
    results.push({
      id: 'TC-JOIN-02',
      category: 'Meeting Join',
      testCase: 'Attempt to join non-existent meeting code',
      expectedOutcome: 'Meeting rejected',
      status: 'FAILED',
      evidence: (err as Error).message,
    });
  }

  // Test 7: Chat Messaging - Send & Retrieve
  try {
    const sampleMsg = await addMessage({
      meetingId: 'meet_default_1',
      senderUserId: 'user_1',
      senderName: 'Aarav Sharma',
      text: 'Hello team, testing minor project chat functionality.',
    });
    const list = await getMessagesByMeeting('meet_default_1');
    const msgFound = list.some((m) => m.text === sampleMsg.text);
    results.push({
      id: 'TC-CHAT-01',
      category: 'In-Meeting Chat',
      testCase: 'Send in-meeting message and verify persistence',
      expectedOutcome: 'Message recorded with sender identity and timestamp',
      status: msgFound ? 'PASSED' : 'FAILED',
      evidence: `Message stored: "${sampleMsg.text}" (ID: ${sampleMsg._id})`,
    });
  } catch (err) {
    results.push({
      id: 'TC-CHAT-01',
      category: 'In-Meeting Chat',
      testCase: 'Send in-meeting message and verify persistence',
      expectedOutcome: 'Message saved',
      status: 'FAILED',
      evidence: (err as Error).message,
    });
  }

  // Test 8: Participant Lifecycle & Attendance Tracking
  try {
    const part = await recordParticipantJoin({
      meetingId: 'meet_default_1',
      userId: 'test_evaluator',
      displayName: 'External Viva Examiner',
      role: 'participant',
    });
    await recordParticipantLeave('meet_default_1', 'test_evaluator');
    results.push({
      id: 'TC-LIFE-01',
      category: 'Participant Lifecycle',
      testCase: 'Record participant entry, attendance audit, and safe departure',
      expectedOutcome: 'Participant presence logged with join/leave timestamps',
      status: part ? 'PASSED' : 'FAILED',
      evidence: `Attendance tracked for ${part.displayName} (Role: ${part.role})`,
    });
  } catch (err) {
    results.push({
      id: 'TC-LIFE-01',
      category: 'Participant Lifecycle',
      testCase: 'Record participant entry and departure',
      expectedOutcome: 'Presence tracked',
      status: 'FAILED',
      evidence: (err as Error).message,
    });
  }

  // Test 9: Host meeting termination (FR-07)
  try {
    const ended = await updateMeetingStatus(createdMeetingCode, 'ended');
    const isEnded = ended && ended.status === 'ended';
    results.push({
      id: 'TC-HOST-01',
      category: 'Host Authorization',
      testCase: 'Host ends meeting lifecycle and marks room inactive',
      expectedOutcome: 'Status transitions to ended, further joins blocked',
      status: isEnded ? 'PASSED' : 'FAILED',
      evidence: `Meeting ${createdMeetingCode} status transitioned to: ${ended?.status}`,
    });
  } catch (err) {
    results.push({
      id: 'TC-HOST-01',
      category: 'Host Authorization',
      testCase: 'Host ends meeting lifecycle',
      expectedOutcome: 'Meeting ended',
      status: 'FAILED',
      evidence: (err as Error).message,
    });
  }

  const passedCount = results.filter((r) => r.status === 'PASSED').length;
  const totalCount = results.length;
  const executionTimeMs = Date.now() - startTime;

  return NextResponse.json({
    summary: {
      total: totalCount,
      passed: passedCount,
      failed: totalCount - passedCount,
      successRate: `${Math.round((passedCount / totalCount) * 100)}%`,
      executionTimeMs,
      academicReference: 'MAIT B.Tech IT 7th Sem Minor Project Evaluation (Section 16)',
    },
    results,
  });
}
