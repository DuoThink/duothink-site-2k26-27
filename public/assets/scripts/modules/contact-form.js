import { reducedMotion } from './dom.js?v=2.1.0';
import { fieldError, normalizeField, formatPhone } from './inquiry-validation.js?v=2.9.0';

const controls = (step) => [...step.querySelectorAll('input, textarea, select')];

export function initializeContactForm({
  selector = '[data-contact-form]',
  readFields = (form) => Object.fromEntries(new FormData(form)),
} = {}) {
  const pending = new WeakSet();
  const flows = new WeakMap();

  function animate(element) {
    if (reducedMotion.matches) return;
    element.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }],
      { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
  function valueFor(step, name) {
    const group = controls(step).filter(control => control.name === name);
    return group[0]?.type === 'radio' || group[0]?.type === 'checkbox'
      ? group.find(control => control.checked)?.value || '' : group[0]?.value || '';
  }
  function showError(step, name, message) {
    const error = step.querySelector(`[data-field-error="${name}"]`);
    if (error) { error.textContent = message; error.hidden = !message; }
    controls(step).filter(control => control.name === name).forEach(control => {
      control.setAttribute('aria-invalid', String(Boolean(message)));
    });
  }
  function validateStep(step, focus = true) {
    let first;
    for (const name of new Set(controls(step).filter(control => !control.disabled).map(control => control.name))) {
      const group = controls(step).filter(control => control.name === name);
      if (['name', 'company', 'email'].includes(name)) group[0].value = normalizeField(name, group[0].value);
      const message = fieldError(name, valueFor(step, name));
      showError(step, name, message);
      if (message && !first) first = group[0];
    }
    if (first && focus) {
      first.focus({ preventScroll: true });
      const box = step.getBoundingClientRect();
      if (box.top < 120 || box.bottom > innerHeight - 50)
        step.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    return !first;
  }
  function caretForDigits(text, count) {
    if (count <= 0) return text.startsWith('(') ? 1 : 0;
    let seen = 0;
    for (let index = 0; index < text.length; index++) {
      if (/\d/u.test(text[index]) && ++seen === count) return index + 1;
    }
    return text.length;
  }
  function maskPhone(control) {
    const before = control.value;
    const caret = control.selectionStart ?? before.length;
    const atEnd = caret === before.length;
    const digitCount = before.slice(0, caret).replace(/\D/gu, '').length;
    const masked = formatPhone(before);
    if (masked === before) return;
    control.value = masked;
    const next = atEnd ? masked.length : caretForDigits(masked, digitCount);
    control.setSelectionRange(next, next);
  }

  function start(form) {
    const steps = [...form.querySelectorAll('[data-briefing-step]')];
    const state = { steps, index: 0 };
    flows.set(form, state);
    form.noValidate = true;
    form.elements.submissionId.value = crypto.randomUUID();
    steps.forEach((step, index) => {
      step.hidden = index > 0;
      controls(step).forEach((control) => { control.disabled = index > 0; showError(step, control.name, ''); });
    });
    refresh(form, state);
  }
  function refresh(form, state) {
    form.querySelector('[data-submit-label]').textContent = state.index === state.steps.length - 1
      ? 'Enviar' : 'Continuar';
  }
  document.querySelectorAll(`${selector}[data-briefing]`).forEach(start);

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches(selector)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending.has(form)) return;
    const state = flows.get(form);
    if (state) {
      if (!validateStep(state.steps[state.index])) return;
      if (state.index < state.steps.length - 1) {
        state.index += 1;
        const step = state.steps[state.index];
        step.hidden = false;
        controls(step).forEach((control) => { control.disabled = false; });
        refresh(form, state);
        animate(step);
        controls(step)[0]?.focus({ preventScroll: true });
        if (step.getBoundingClientRect().bottom > innerHeight - 100) {
          step.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        }
        return;
      }
      let valid = true;
      for (const step of state.steps) {
        if (!validateStep(step, valid)) valid = false;
      }
      if (!valid) return;
    } else if (!form.reportValidity()) return;

    const button = form.querySelector('[type="submit"]');
    const label = button.querySelector('[data-submit-label], p') || button;
    const originalLabel = label.textContent;
    let status = form.querySelector('.form-status');
    if (!status) {
      status = document.createElement('p'); status.className = 'form-status';
      status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); form.append(status);
    }
    pending.add(form);
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    label.textContent = 'Enviando…';
    status.replaceChildren();
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(readFields(form)), signal: AbortSignal.timeout(25_000),
      });
      const result = await response.json().catch(() => ({}));
      if (state && result.fieldErrors) {
        for (const [name, message] of Object.entries(result.fieldErrors)) {
          const step = state.steps.find(step => controls(step).some(control => control.name === name));
          if (step) showError(step, name, message);
        }
        form.querySelector('[aria-invalid="true"]')?.focus();
      }
      if (!response.ok || result.ok !== true)
        throw new Error(result.message || 'Não foi possível enviar seu pedido. Seus dados foram mantidos; tente novamente.');
      if (state) {
        const success = document.createElement('div');
        success.className = 'briefing-success'; success.tabIndex = -1;
        success.innerHTML = '<h2 class="rich-text">Seu projeto começa aqui.</h2><p class="text-body text-muted">Recebemos suas informações. A equipe da DuoThink vai entrar em contato em até um dia útil para conversar sobre os próximos passos.</p><button type="button" class="submit-button submit-button__disabled submit-button--disabled submit-button--appearance">Enviar outro projeto</button>';
        [...form.children].forEach((element) => { element.hidden = true; });
        form.append(success); animate(success); success.focus();
        success.querySelector('button').addEventListener('click', () => {
          success.remove(); form.reset();
          [...form.children].forEach((element) => { element.hidden = false; });
          status.replaceChildren(); start(form); form.elements.name.focus();
        });
      } else { form.reset(); status.textContent = 'Obrigado! Sua mensagem foi recebida.'; }
    } catch (error) {
      status.textContent = ['TimeoutError', 'AbortError'].includes(error.name)
        ? 'Não foi possível confirmar o envio a tempo. Seus dados foram mantidos. Tente novamente.'
        : error.message;
    } finally {
      pending.delete(form); button.disabled = false; button.removeAttribute('aria-busy'); label.textContent = originalLabel;
    }
  }, true);
  function briefingControl(event) {
    const control = event.target;
    return control instanceof HTMLInputElement && control.form && flows.has(control.form) ? control : null;
  }
  document.addEventListener('input', (event) => {
    const control = briefingControl(event);
    if (!control || event.isComposing) return;
    if (control.name === 'phone') maskPhone(control);
    if (control.getAttribute('aria-invalid') === 'true') {
      const step = control.closest('[data-briefing-step]');
      showError(step, control.name, fieldError(control.name, valueFor(step, control.name)));
    }
  });
  document.addEventListener('change', (event) => {
    const control = briefingControl(event);
    if (!control || !['radio', 'checkbox'].includes(control.type)) return;
    const step = control.closest('[data-briefing-step]');
    showError(step, control.name, fieldError(control.name, valueFor(step, control.name)));
  });
  document.addEventListener('focusout', (event) => {
    const control = briefingControl(event);
    if (!control || ['radio', 'checkbox', 'hidden'].includes(control.type)) return;
    if (control.name === 'phone') maskPhone(control);
    else control.value = normalizeField(control.name, control.value);
    const step = control.closest('[data-briefing-step]');
    showError(step, control.name, fieldError(control.name, valueFor(step, control.name)));
  });
  // Backspace/Delete on mask punctuation removes the adjacent digit instead of trapping the caret.
  document.addEventListener('beforeinput', (event) => {
    const control = briefingControl(event);
    if (!control || control.name !== 'phone' || !['deleteContentBackward', 'deleteContentForward'].includes(event.inputType)
      || control.selectionStart !== control.selectionEnd) return;
    const caret = control.selectionStart;
    const backward = event.inputType === 'deleteContentBackward';
    let index = caret - (backward ? 1 : 0);
    if (index < 0 || index >= control.value.length || /\d/u.test(control.value[index])) return;
    while (index >= 0 && index < control.value.length && !/\d/u.test(control.value[index])) index += backward ? -1 : 1;
    if (index < 0 || index >= control.value.length) return;
    event.preventDefault();
    const digitsBefore = control.value.slice(0, index).replace(/\D/gu, '').length;
    control.value = formatPhone(control.value.slice(0, index) + control.value.slice(index + 1));
    const next = caretForDigits(control.value, digitsBefore);
    control.setSelectionRange(next, next);
    if (control.getAttribute('aria-invalid') === 'true')
      showError(control.closest('[data-briefing-step]'), 'phone', fieldError('phone', control.value));
  });
}
