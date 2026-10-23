jest.mock('../src/config/supabase', () => ({}));
jest.mock('../src/controllers/emailController', () => ({}));
const express = require('express');
const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { createSignupController } = require('../src/controllers/signupController');

let app, clock, database, sendCode, insert, codeGenerator;
const identity = { display_name: ' Test Student ', email: ' STUDENT@example.test ' };
const email = 'student@example.test';
const password = 'test-password-123';
const post = (path, body) => request(app).post('/' + path).send(body);
const start = () => post('send', identity);
const verify = (code = '123456', address = email) => post('verify', { email: address, code });
const complete = (proof, overrides = {}) => post('complete', { email, password, verification_token: proof, ...overrides });
const getProof = async () => { await start(); return (await verify()).body.verification_token; };

beforeEach(() => {
  clock = Date.now();
  codeGenerator = jest.spyOn(crypto, 'randomInt').mockReturnValue(123456);
  insert = jest.fn().mockResolvedValue({ error: null });
  database = { from: jest.fn().mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }), insert }) };
  sendCode = jest.fn().mockResolvedValue(undefined);
  const controller = createSignupController({ database, sendCode, now: () => clock });
  app = express(); app.use(express.json());
  for (const key of ['send', 'verify', 'complete']) app.post('/' + key, controller[key]);
});
afterEach(() => jest.restoreAllMocks());

test('sends six digits without creating a user or returning the code', async () => {
  const response = await start();
  expect(response.status).toBe(200);
  expect(sendCode).toHaveBeenCalledWith(email, '123456');
  expect(JSON.stringify(response.body)).not.toContain('123456');
  expect(response.headers['cache-control']).toBe('no-store');
  expect(insert).not.toHaveBeenCalled();
});

test('requires verification before creating a user, even if a code is submitted as proof', async () => {
  await start();
  expect((await complete('123456')).status).toBe(400);
  expect((await complete('ab'.repeat(32))).status).toBe(400);
  expect(insert).not.toHaveBeenCalled();
});

test('creates a verified donor with the original name, normalized email, and bcrypt password', async () => {
  const proof = await getProof();
  const response = await complete(proof, { role: 'admin', display_name: 'Injected name' });
  expect(response.status).toBe(201);
  const user = insert.mock.calls[0][0];
  expect(user).toMatchObject({ email, display_name: 'Test Student', is_verified: true });
  expect(user).not.toHaveProperty('role');
  expect(await bcrypt.compare(password, user.password_hash)).toBe(true);
  expect(bcrypt.getRounds(user.password_hash)).toBe(12);
  expect((await complete(proof)).status).toBe(400);
  expect(insert).toHaveBeenCalledTimes(1);
});

test('binds the verification proof and code to the email address', async () => {
  await start();
  expect((await verify('123456', 'other@example.test')).status).toBe(400);
  const proof = (await verify()).body.verification_token;
  expect((await complete(proof, { email: 'other@example.test' })).status).toBe(400);
  expect(insert).not.toHaveBeenCalled();
});

test('expires codes after five minutes', async () => {
  await start(); clock += 300000;
  expect((await verify()).status).toBe(400);
});

test('locks a code after five incorrect attempts', async () => {
  await start();
  for (let i = 0; i < 5; i++) expect((await verify('000000')).status).toBe(400);
  expect((await verify()).status).toBe(429);
});

test('enforces resend cooldown and replaces earlier codes', async () => {
  await start();
  expect((await start()).status).toBe(429);
  clock += 60000; codeGenerator.mockReturnValue(654321);
  expect((await start()).status).toBe(200);
  expect((await verify('123456')).status).toBe(400);
  expect((await verify('654321')).status).toBe(200);
});

test('consumes a code once and expires the verified proof after ten minutes', async () => {
  const proof = await getProof();
  expect((await verify()).status).toBe(400);
  clock += 600000;
  expect((await complete(proof)).status).toBe(400);
  expect(insert).not.toHaveBeenCalled();
});

test('resending invalidates a previously verified proof', async () => {
  const proof = await getProof(); clock += 60000;
  await start();
  expect((await complete(proof)).status).toBe(400);
});

test('only one simultaneous create request can consume a proof', async () => {
  const proof = await getProof();
  const results = await Promise.all([complete(proof), complete(proof)]);
  expect(results.map(r => r.status).sort()).toEqual([201, 400]);
  expect(insert).toHaveBeenCalledTimes(1);
});

test('allows a valid proof to retry a database failure without returning private details', async () => {
  const proof = await getProof();
  insert.mockResolvedValueOnce({ error: { message: 'private details' } });
  const response = await complete(proof);
  expect(response.status).toBe(503);
  expect(JSON.stringify(response.body)).not.toContain('private details');
  expect((await complete(proof)).status).toBe(201);
});

test('rejects duplicate accounts without sending another email', async () => {
  database.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'existing' } }) }) }) });
  expect((await start()).status).toBe(409);
  expect(sendCode).not.toHaveBeenCalled();
});

test('reports SMTP failure without creating an account and lets the user retry', async () => {
  sendCode.mockRejectedValueOnce(new Error('private SMTP details'));
  const response = await start();
  expect(response.status).toBe(503);
  expect(JSON.stringify(response.body)).not.toContain('private');
  expect((await verify()).status).toBe(400);
  expect((await start()).status).toBe(200);
  expect(insert).not.toHaveBeenCalled();
});

test.each(['short', 'é'.repeat(37)])('rejects invalid password %# without consuming the proof', async invalid => {
  const proof = await getProof();
  expect((await complete(proof, { password: invalid })).status).toBe(400);
  expect(insert).not.toHaveBeenCalled();
  expect((await complete(proof)).status).toBe(201);
});

test.each([{ ...identity, email: 'invalid' }, { ...identity, display_name: '' }])('rejects invalid signup details %#', async body => {
  expect((await post('send', body)).status).toBe(400);
  expect(sendCode).not.toHaveBeenCalled();
});
