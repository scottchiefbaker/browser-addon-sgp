(function (root, factory) {
	if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else {
		root.SGP = factory();
	}
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	const COMMON_SECOND_LEVEL_TLDS = new Set([
		'ac', 'co', 'com', 'edu', 'gov', 'mil', 'net', 'nom', 'org'
	]);

	function bytesToBase64(bytes) {
		if (typeof btoa === 'function') {
			let binary = '';
			for (let i = 0; i < bytes.length; i += 1) {
				binary += String.fromCharCode(bytes[i]);
			}
			return btoa(binary);
		}

		if (typeof Buffer !== 'undefined') {
			return Buffer.from(bytes).toString('base64');
		}

		throw new Error('No base64 encoder available in this environment.');
	}

	// SGP passwords are alpha-numeric only. Base64 uses: '+', '-', '=' so we
	// map those to other values
	function customBase64(value) {
		return value.replace(/\+/g, '9').replace(/\//g, '8').replace(/=/g, 'A');
	}

	// Generate the SGP password based on the provided input
	function generate_md5_sgp(value) {
		const digest = md5.digest(value);

		return customBase64(bytesToBase64(digest));
	}

	// A valid SGP password starts with a lowercase letter, contains an uppercase letter
	// and a digit
	function validatePassword(value, length) {
		const password = value.substring(0, length);

		return /^[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password);
	}

	function derivePassword(masterPassword, domain, options = {}) {
		const hashRounds = Number.isInteger(options.hashRounds) ? options.hashRounds : 10;
		const length     = Number.isInteger(options.length)     ? options.length     : 10;
		const secret     = typeof options.secret === 'string'   ? options.secret     : '';
		const hash_algo  = typeof options.algo   === 'string'   ? options.algo       : 'MD5';

		if (typeof masterPassword !== 'string' || typeof domain !== 'string') {
			throw new Error('masterPassword and domain must be strings.');
		}

		if (!masterPassword.length && !secret.length) {
			throw new Error('Combined password input must not be empty.');
		}

		if (length < 4 || length > 24) {
			throw new Error('Password length must be between 4 and 24 characters.');
		}

		let generated       = `${masterPassword}${secret}:${domain}`;
		let remainingRounds = hashRounds;

		// Loop for hashRounds number of times, and then keep going if the password
		// isn't in the correct format
		while (remainingRounds > 0 || !validatePassword(generated, length)) {
			generated        = generate_md5_sgp(generated);
			remainingRounds -= 1;
		}

		return generated.substring(0, length);
	}

	function extractHostname(value) {
		const input = (value || '').trim();
		if (!input) {
			return '';
		}

		try {
			return new URL(input).hostname.toLowerCase();
		} catch (_) {
			try {
				return new URL(`https://${input}`).hostname.toLowerCase();
			} catch (_) {
				return input
					.replace(/^\w+:\/\//, '')
						.split('/')[0]
						.split('@').pop()
						.split(':')[0]
						.toLowerCase();
					}
		}
	}

	function normalizeDomain(hostname) {
		const host = (hostname || '').toLowerCase().replace(/\.$/, '');
		if (!host) {
			return '';
		}

		if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
			return host;
		}

		const parts = host.split('.').filter(Boolean);
		if (parts.length <= 2) {
			return host;
		}

		const tld         = parts[parts.length - 1];
		const secondLevel = parts[parts.length - 2];

		if (tld.length === 2 && COMMON_SECOND_LEVEL_TLDS.has(secondLevel) && parts.length >= 3) {
			return parts.slice(-3).join('.');
		}

		return parts.slice(-2).join('.');
	}

	function domainFromUrl(urlOrHost) {
		return normalizeDomain(extractHostname(urlOrHost));
	}

	return {
		derivePassword,
		domainFromUrl,
		extractHostname,
		normalizeDomain,
	};
});
