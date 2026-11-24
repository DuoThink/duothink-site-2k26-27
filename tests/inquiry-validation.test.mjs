import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldError, normalizeField, formatPhone } from '../public/assets/scripts/modules/inquiry-validation.js';
import { validateInquiry } from '../app/contact.js';

test('BR phone masks preserve numbers, partial input and pasted country codes', () => {
  for (const [raw, expected] of [['1','(1'],['11','(11'],['11987654321','(11) 98765-4321'],
    ['1134567890','(11) 3456-7890'],['+55 11 98765-4321','(11) 98765-4321'],
    ['005511987654321','(11) 98765-4321'],['5511987654321','(11) 98765-4321'],['','']])
    assert.equal(formatPhone(raw), expected);
});

test('phone mask caps typing and pasting at eleven local digits', () => {
  for (const raw of ['14998093060', '149980930609999', '(14) 99809-3060999', '+55 14 99809-3060999'])
    assert.equal(formatPhone(raw), '(14) 99809-3060');
  assert.equal(formatPhone('(55) 98765-43219'), '(55) 98765-4321');
  assert.ok(fieldError('phone', '149980930609999'));
});

test('phone rules reject invalid DDDs, repetitions, incomplete numbers and invalid prefixes', () => {
  for (const phone of ['11111111111','11999999999','00987654321','20987654321','119876','11887654321',
    '1164567890','+1 202 555 0123','abc11987654321','11987654321000']) assert.ok(fieldError('phone', phone), phone);
  for (const phone of ['11987654321','+55 11 98765-4321','(14) 3456-7890','(55) 98765-4321'])
    assert.equal(fieldError('phone', phone), '', phone);
});

test('names and company fields support accents and real business names without forced capitalization', () => {
  for (const name of ['João da Silva', "Ana D’Ávila", 'Érica', 'Li']) assert.equal(fieldError('name', name), '');
  for (const name of ['', '123', 'A', 'João 123', '<script>']) assert.ok(fieldError('name', name));
  for (const company of ['3M', 'DuoThink', 'A & B LTDA.']) assert.equal(fieldError('company', company), '');
  for (const company of ['', '.', '---', '<script>']) assert.ok(fieldError('company', company));
  assert.equal(normalizeField('name', '  João   da Silva '), 'João da Silva');
});

test('email validation catches malformed local parts and domains while allowing aliases', () => {
  for (const email of ['pessoa+site@example.com.br', 'a.b@example.com', "o'neil@example.com"]) assert.equal(fieldError('email', email), '');
  for (const email of ['abc','a@@example.com','a..b@example.com','.a@example.com','a@-example.com','a@example..com',
    'a@example.c','a@example.123','a b@example.com','a@example.com\nBcc:x@example.com']) assert.ok(fieldError('email', email), email);
  assert.equal(normalizeField('email', ' Ana@EXAMPLE.COM '), 'Ana@example.com');
});

test('server rejects the same invalid values and returns field-level feedback', () => {
  const valid = { flow: 'briefing', name: 'Ana Silva', company: 'DuoThink', email: 'ana@example.com',
    phone: '+55 11 98765 4321', service: 'Sites', budget: 'Preciso de orientação',
    submissionId: 'e70d7084-1b1b-4c46-b9e6-f5bde5428cc3' };
  assert.equal(validateInquiry(valid).fields.phone, '(11) 98765-4321');
  for (const [key, value] of [['name','123'],['company','---'],['email','a..b@x.com'],['phone','11111111111'],['phone','20987654321'],['service','other']]) {
    const result = validateInquiry({ ...valid, [key]: value });
    assert.equal(result.fieldErrors[key], fieldError(key, value));
  }
});
