(function () {
	const extensionApi = globalThis.browser || globalThis.chrome;

	const domainInput = document.getElementById('domain');
	const masterInput = document.getElementById('master');
	const masterImage = document.getElementById('master-image');
	const generatedInput = document.getElementById('generated');
	const toggleGeneratedButton = document.getElementById('toggle-generated');
	const statusElement = document.getElementById('status');

	function setStatus(message) {
		statusElement.textContent = message;
	}

	function queryActiveTab() {
		return new Promise((resolve, reject) => {
			let settled = false;
			const done = (tabs) => {
				if (settled) {
					return;
				}
				settled = true;
				const error = extensionApi.runtime && extensionApi.runtime.lastError;
				if (error) {
					reject(new Error(error.message));
					return;
				}
				resolve(tabs || []);
			};

			try {
				const result = extensionApi.tabs.query({ active: true, currentWindow: true }, done);
				if (result && typeof result.then === 'function') {
					result.then(done).catch(reject);
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	function sendMessageToTab(tabId, message) {
		return new Promise((resolve, reject) => {
			let settled = false;
			const done = (response) => {
				if (settled) {
					return;
				}
				settled = true;
				const error = extensionApi.runtime && extensionApi.runtime.lastError;
				if (error) {
					reject(new Error(error.message));
					return;
				}
				resolve(response || {});
			};

			try {
				const result = extensionApi.tabs.sendMessage(tabId, message, done);
				if (result && typeof result.then === 'function') {
					result.then(done).catch(reject);
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	function setGeneratedVisibility(isVisible) {
		generatedInput.type = isVisible ? 'text' : 'password';
	}

	function generatePassword() {
		const domain = domainInput.value.trim();
		const masterPassword = masterInput.value;

		if (!domain) {
			domainInput.classList.add('bg-warning');
			setStatus('Please enter a domain');
			return '';
		} else {
			domainInput.classList.remove('bg-warning');
		}

		if (!masterPassword) {
			setStatus('Enter your master password');
			return '';
		}

		try {
			const generated = SGP.derivePassword(masterPassword, domain);
			generatedInput.value = generated;
			setGeneratedVisibility(false);
			setStatus('Password generated locally');
			return generated;
		} catch (error) {
			setStatus(error.message);
			return '';
		}
	}

	async function initDomain() {
		try {
			const [tab] = await queryActiveTab();
			const tabUrl = tab && tab.url ? tab.url : '';
			domainInput.value = SGP.domainFromUrl(tabUrl);
			setStatus('Ready.');
		} catch (_) {
			domainInput.value = '';
			setStatus('Open a regular tab to detect domain');
		}
	}

	function updateMasterImage() {
		if (!masterImage || !globalThis.SGPImage || typeof globalThis.SGPImage.renderIdenticon !== 'function') {
			return;
		}

		update_color_box(masterInput.value);

		const rendered = globalThis.SGPImage.renderIdenticon(masterImage, masterInput.value);
		masterImage.style.display = rendered ? 'block' : 'none';
	}

	function update_color_box(input) {

		if (!input) {
			return "";
		}

		var nums = SGP.md5DigestBytes(input);
		var elem = document.getElementById('color_box_wrapper');
		var rgb  = 0;

		// Show the color box
		elem.classList.remove('d-none');

		for (i = 0; i < elem.children.length; i++) {
			var x = elem.children[i];

			// build an RGB color from three of the bytes of the hash
			rgb = nums.shift();
			rgb = rgb << 8;
			rgb = rgb | nums.shift();
			rgb = rgb << 8;
			rgb = rgb | nums.shift();

			var color_str = intToColor(rgb);
			x.setAttribute("style", "background-color: " + color_str);

			console.log("Setting %d to %s", i, color_str);
		}

	}

	function intToColor(value) {
		// Keep only the low 24 bits
		value &= 0xFFFFFF;

		return '#' + value.toString(16).padStart(6, '0');
	}

	document.getElementById('generate').addEventListener('click', () => {
		generatePassword();
	});

	masterInput.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			generatePassword();
		}
	});

	masterInput.addEventListener('input', updateMasterImage);
	toggleGeneratedButton.addEventListener('click', () => {
		setGeneratedVisibility(generatedInput.type === 'password');
	});

	document.getElementById('copy').addEventListener('click', async () => {
		const generated = generatedInput.value || generatePassword();
		if (!generated) {
			return;
		}

		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(generated);
			} else {
				generatedInput.select();
				document.execCommand('copy');
			}
			setStatus('Copied to clipboard');
		} catch (_) {
			setStatus('Copy failed');
		}
	});

	document.getElementById('fill').addEventListener('click', async () => {
		const generated = generatedInput.value || generatePassword();
		if (!generated) {
			return;
		}

		try {
			const [tab] = await queryActiveTab();
			if (!tab || typeof tab.id !== 'number') {
				setStatus('No active tab found');
				return;
			}

			const response = await sendMessageToTab(tab.id, {
				type: 'FILL_PASSWORD',
				password: generated,
			});

			if (response.filled == 1) {
				setStatus("Filled 1 password field");
			} else if (response.filled > 1) {
				setStatus(`Filled ${response.filled} password field(s)`);
			} else {
				setStatus('No editable password fields found');
			}
		} catch (_) {
			setStatus('Fill failed on this page');
		}
	});

	setGeneratedVisibility(false);
	initDomain();
	updateMasterImage();
})();
