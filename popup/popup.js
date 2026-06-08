(function () {
	const extensionApi = globalThis.browser || globalThis.chrome;

	const domainInput           = document.getElementById('domain');
	const masterInput           = document.getElementById('master');
	const masterImage           = document.getElementById('master-image');
	const generatedInput        = document.getElementById('generated');
	const toggleGeneratedButton = document.getElementById('toggle-generated');
	const statusElement         = document.getElementById('status');

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
		const domain     = domainInput.value.trim();
		const master_pwd = masterInput.value;

		if (!domain) {
			domainInput.classList.add('bg-warning');
			setStatus('Please enter a domain');
			return '';
		} else {
			domainInput.classList.remove('bg-warning');
		}

		if (!master_pwd) {
			setStatus('Enter your master password');
			return '';
		}

		try {
			const generated = SGP.derivePassword(master_pwd, domain);
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
		update_color_box(masterInput.value);

		return;

		// FIXME: The image/logo stuff is disabled for now...
		//if (!masterImage || !globalThis.SGPImage || typeof globalThis.SGPImage.renderIdenticon !== 'function') {
		//    return;
		//}

		//const rendered = globalThis.SGPImage.renderIdenticon(masterImage, masterInput.value);
		//masterImage.style.display = rendered ? 'block' : 'none';
	}

	function update_color_box(input) {

		var nums = sha256.digest(input);
		var elem = document.getElementById('color_box_wrapper');
		var rgb  = 0;

		// Set the color box to black if there is NO input
		if (!input) {
			const divs = document.querySelectorAll('#color_box_wrapper > div');
			divs.forEach(div => div.style.backgroundColor = 'black');

			return "";
		}

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

			//console.log("Setting %d to %s", i, color_str);
		}

	}

	function intToColor(value) {
		// Keep only the low 24 bits
		value &= 0xFFFFFF;

		return '#' + value.toString(16).padStart(6, '0');
	}

	function create_and_fill_password() {
		generatePassword();

		// Swap generate -> copy buttons
		show_copy_button();

		// Find any <input type="password"> tags and fill them in
		fill_inputs();
	}

	document.getElementById('generate').addEventListener('click', () => {
		create_and_fill_password();
	});

	function show_copy_button() {
		document.getElementById('generate').classList.add('d-none');
		document.getElementById('copy').classList.remove('d-none');
	}

	function show_generate_button() {
		document.getElementById('generate').classList.remove('d-none');
		document.getElementById('copy').classList.add('d-none');
	}

	domainInput.addEventListener('keydown', (event) => {
		show_generate_button();
		setStatus("");
	});

	masterInput.addEventListener('keydown', (event) => {
		// Enter sends the password to the tab
		if (event.key === 'Enter') {
			event.preventDefault();

			create_and_fill_password();
		// Everything else is an update of the pwd
		} else {
			show_generate_button();
			setStatus("");
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

	async function load_saved_password() {
		// If we don't have the browser object we're not in extension mode
		try {
			browser
		} catch {
			// Hide the save button
			var elem = document.getElementById('save_button');
			elem.classList.add('d-none');
			return "";
		}

		//var pwd = localStorage.getItem('sgp_master_pwd') ?? "";
		var x     = await browser.storage.session.get(['sgp_master_pwd']);
		var pwd   = x.sgp_master_pwd ?? "";

		masterInput.value = pwd;
		update_color_box(pwd);
	}

	document.getElementById('save_button').addEventListener('click', save_master_pwd);

	async function save_master_pwd() {
		// If we don't have the browser object we're not in extension mode
		try {
			browser
		} catch {
			return "";
		}

		var pwd  = masterInput.value;
		var elem = document.getElementById('save_button');
		var ret  = 0;

		try {
			//localStorage.setItem('sgp_master_pwd', pwd);
			await browser.storage.session.set({ sgp_master_pwd: pwd});
			elem.classList.remove('bg-secondary');
			elem.classList.add('bg-success');

			ret = 1;
		} catch(err) {
			console.log(err);

			elem.classList.remove('bg-secondary');
			elem.classList.add('bg-danger');
		}

		return ret;
	}

	document.getElementById('fill').addEventListener('click', fill_inputs);

	async function fill_inputs() {
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
	}

	setGeneratedVisibility(false);
	initDomain();
	updateMasterImage();
	load_saved_password();

})();
