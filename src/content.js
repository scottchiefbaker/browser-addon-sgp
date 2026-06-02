(function () {
  const extensionApi = globalThis.browser || globalThis.chrome;

  function isEditablePasswordInput(input) {
    if (!input || input.tagName !== 'INPUT' || input.type !== 'password') {
      return false;
    }
    if (input.disabled || input.readOnly) {
      return false;
    }
    return input.getClientRects().length > 0;
  }

  function fillPassword(password) {
    const candidates = [];
    const active = document.activeElement;

    if (isEditablePasswordInput(active)) {
      candidates.push(active);
    }

    if (!candidates.length) {
      document.querySelectorAll('input[type="password"]').forEach((element) => {
        if (isEditablePasswordInput(element)) {
          candidates.push(element);
        }
      });
    }

    candidates.forEach((input) => {
      input.focus();
      input.value = password;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    return candidates.length;
  }

  extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'FILL_PASSWORD') {
      return;
    }

    const count = fillPassword(message.password || '');
    sendResponse({ filled: count });
  });
})();
