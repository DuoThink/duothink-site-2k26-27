import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fieldError, normalizeField, formatPhone } from '../public/assets/scripts/modules/inquiry-validation.js';

function setup(deliver) {
  class Input {
    constructor(name, value, type = 'text') {
      Object.assign(this, { name, value, type, checked: type === 'radio' || type === 'checkbox', disabled: false,
        focused: false, attributes: {}, selectionStart: value.length, selectionEnd: value.length });
    }
    reportValidity() { throw new Error('Native validation must not run for a briefing.'); }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] ?? null; }
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
    focus() { this.focused = true; }
    closest() { return this.step; }
  }
  const entries = [['name','Ana'],['company','Empresa'],['email','ana@example.com','email'],
    ['phone','(11) 98765-4321','tel'],['service','Sites','radio'],['budget','Preciso de orientação','radio']]
    .map(args => new Input(...args));
  const steps = entries.map((control, index) => {
    const group = [control];
    const errors = Object.fromEntries(group.map(input => [input.name, { textContent: '', hidden: true }]));
    const step = { hidden: false, errors, querySelectorAll: () => group,
      querySelector: selector => errors[selector.match(/data-field-error="([^"]+)"/u)?.[1]],
      getBoundingClientRect: () => ({ top: 150, bottom: 300 }), scrollIntoView() {} };
    group.forEach(input => { input.step = step; });
    return step;
  });
  const label = { textContent: 'Enviar' };
  const button = { disabled: false, querySelector: () => label, setAttribute() {}, removeAttribute() {} };
  const status = { className: 'form-status', textContent: '', replaceChildren() { this.textContent = ''; } };
  let success;
  class Form {
    constructor() { this.elements = { submissionId: { value: '' }, phone: entries[3] }; this.children = [...steps, button, status]; }
    matches() { return true; }
    querySelectorAll() { return steps; }
    querySelector(selector) {
      if (selector.includes('aria-invalid')) return entries.find(control => control.getAttribute('aria-invalid') === 'true');
      return selector === '[data-submit-label]' ? label : selector === '.form-status' ? status : button;
    }
    append(element) { success = element; }
  }
  const form = new Form(); entries.forEach(control => { control.form = form; });
  const handlers = {}; let calls = 0;
  const context = {
    reducedMotion: { matches: true }, fieldError, normalizeField, formatPhone,
    HTMLFormElement: Form, HTMLInputElement: Input, crypto: { randomUUID: () => 'generated-id' },
    document: { querySelectorAll: () => [form], addEventListener: (name, listener) => { handlers[name] = listener; },
      createElement: () => ({ focus() { this.focused = true; }, querySelector: () => ({ addEventListener() {} }) }) },
    innerHeight: 900, AbortSignal, fetch: async (...args) => { calls += 1; return deliver(...args); },
  };
  const source = readFileSync(new URL('../public/assets/scripts/modules/contact-form.js', import.meta.url), 'utf8')
    .replace(/^import[^\n]+\n/gmu, '').replace('export function', 'function');
  vm.runInNewContext(source + '\nthis.initialize = initializeContactForm;', context);
  context.initialize({ readFields: () => ({ name: entries[0].value }) });
  const submit = () => handlers.submit({ target: form, preventDefault() {}, stopImmediatePropagation() {} });
  return { entries, steps, label, status, button, form, submit, handlers, calls: () => calls, success: () => success };
}

test('custom errors block empty/invalid steps without native validation and retain earlier answers', async () => {
  const ui = setup(() => { throw new Error('Not yet a submission'); });
  assert.equal(ui.steps.filter(s => !s.hidden).length, 1);
  ui.entries[0].value = '';
  await ui.submit();
  assert.equal(ui.steps[1].hidden, true);
  assert.equal(ui.steps[0].errors.name.textContent, 'Informe seu nome.');
  assert.equal(ui.entries[0].getAttribute('aria-invalid'), 'true');
  ui.entries[0].value = 'Ana';
  for (let index = 1; index < ui.entries.length; index++) {
    await ui.submit();
    assert.equal(ui.steps.filter(s => !s.hidden).length, index + 1);
    assert.equal(ui.entries[index].focused, true);
  }
  assert.equal(ui.entries[0].value, 'Ana');
  assert.equal(ui.steps[0].errors.name.hidden, true);
  assert.equal(ui.calls(), 0);
  assert.equal(ui.label.textContent, 'Enviar');
});

test('pending submissions cannot repeat and network errors retain all answers', async () => {
  let resolve;
  const ui = setup(() => new Promise(done => { resolve = done; }));
  for (let index = 1; index < ui.entries.length; index++) await ui.submit();
  const request = ui.submit();
  assert.equal(ui.button.disabled, true);
  await ui.submit(); assert.equal(ui.calls(), 1);
  resolve({ ok: false, json: async () => ({ message: 'Não foi possível registrar.' }) });
  await request;
  assert.equal(ui.status.textContent, 'Não foi possível registrar.');
  assert.equal(ui.entries[0].value, 'Ana');
  assert.equal(ui.steps[5].hidden, false);
  assert.equal(ui.button.disabled, false);
});

test('confirmation appears only after the server explicitly confirms success', async () => {
  const ui = setup(async () => ({ ok: true, json: async () => ({ ok: true }) }));
  for (let index = 1; index < ui.entries.length; index++) await ui.submit();
  await ui.submit();
  assert.match(ui.success().innerHTML, /Seu projeto começa aqui/u);
  assert.equal(ui.success().focused, true);
});

test('invalid phone/radio choices prevent advancement and submission', async () => {
  const ui = setup(() => { throw new Error('Invalid form must not send.'); });
  for (let index = 1; index < 4; index++) await ui.submit();
  ui.entries[3].value = '11111111111';
  await ui.submit();
  assert.equal(ui.steps[4].hidden, true);
  assert.ok(ui.steps[3].errors.phone.textContent);
  ui.entries[3].value = '(11) 98765-4321'; await ui.submit();
  ui.entries[4].checked = false; await ui.submit();
  assert.equal(ui.steps[5].hidden, true);
  ui.entries[4].checked = true; await ui.submit();
  ui.entries[5].checked = false; await ui.submit();
  assert.equal(ui.calls(), 0);
  assert.ok(ui.steps[5].errors.budget.textContent);
});

test('phone mask handles pasted +55, middle editing and backspace on punctuation', () => {
  const ui = setup(() => {}); const phone = ui.entries[3];
  phone.value = '+55 11 98765 4321'; phone.selectionStart = phone.value.length;
  ui.handlers.input({ target: phone });
  assert.equal(phone.value, '(11) 98765-4321');
  assert.equal(phone.selectionStart, phone.value.length);
  phone.value = '(14) 99809-30609999'; phone.selectionStart = phone.value.length;
  ui.handlers.input({ target: phone });
  assert.equal(phone.value, '(14) 99809-3060');
  assert.equal(phone.selectionStart, 15);
  phone.value = '(11) '; phone.selectionStart = phone.selectionEnd = 5;
  let prevented = false;
  ui.handlers.beforeinput({ target: phone, inputType: 'deleteContentBackward', preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(phone.value, '(1');
});

test('server field errors appear beside the field and never discard user input', async () => {
  const ui = setup(async () => ({ ok: false, json: async () => ({ message: 'Confira o WhatsApp.', fieldErrors: { phone: 'Confira o DDD.' } }) }));
  for (let index = 1; index < ui.entries.length; index++) await ui.submit();
  await ui.submit();
  assert.equal(ui.steps[3].errors.phone.textContent, 'Confira o DDD.');
  assert.equal(ui.entries[3].value, '(11) 98765-4321');
});
