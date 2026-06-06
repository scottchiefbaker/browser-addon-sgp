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

	function encode_base85(data) {
		const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~';

		// Convert string to byte array if needed
		const bytes = typeof data === 'string'
			? Uint8Array.from(data, c => c.charCodeAt(0))
			: data;

		const pad = (4 - bytes.length % 4) % 4;
		const padded = new Uint8Array(bytes.length + pad);
		padded.set(bytes);

		let result = '';
		for (let i = 0; i < padded.length; i += 4) {
			let val = (padded[i] * 0x1000000)   // avoid sign bit issues with
				+ (padded[i+1] << 16)
				+ (padded[i+2] << 8)
				+  padded[i+3];

			let chunk = '';
			for (let j = 0; j < 5; j++) {
				chunk = chars[val % 85] + chunk;
				val = Math.floor(val / 85);
			}
			result += chunk;
		}

		// Trim padding characters
		return pad > 0 ? result.slice(0, -pad) : result;
	}

	// SGP passwords are alpha-numeric only. Base64 uses: '+', '/', '=' so we
	// map those to other values
	function customBase64(value) {
		return value.replace(/\+/g, '9').replace(/\//g, '8').replace(/=/g, 'A');
	}

	// Generate the SGP password based on the provided input
	function generate_md5_sgp(value, use_special) {
		const digest = md5.digest(value);
		var ret      = false;

		if (use_special) {
			var digest_str = String.fromCharCode(...digest);
			ret            = encode_base85(digest_str);
		} else {
			ret = customBase64(bytesToBase64(digest));
		}

		return ret;
	}

	// Generate the SGP password based on the provided input
	function generate_sha1_sgp(value, use_special) {
		const digest = sha1.digest(value);
		var ret      = false;

		if (use_special) {
			var digest_str = String.fromCharCode(...digest);
			ret            = encode_base85(digest_str);
		} else {
			ret = customBase64(bytesToBase64(digest));
		}

		return ret;
	}

	// Generate the SGP password based on the provided input
	function generate_sha256_sgp(value, use_special) {
		const digest = sha256.digest(value);
		var ret      = false;

		if (use_special) {
			var digest_str = String.fromCharCode(...digest);
			ret            = encode_base85(digest_str);
		} else {
			ret = customBase64(bytesToBase64(digest));
		}

		return ret;
	}

	// A valid SGP password starts with a lowercase letter, contains an uppercase letter
	// and a digit
	function validatePassword(value, length, special) {
		const password = value.substring(0, length);
		var ret        = false;

		if (special) {
			ret = /^[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /\W/.test(password);
		} else {
			ret = /^[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password);
		}

		return ret;
	}

	function derivePassword(masterPassword, domain, options = {}) {
		var hashRounds  = Number.isInteger(options.hashRounds)  ? options.hashRounds : 10;
		var length      = Number.isInteger(options.length)      ? options.length     : 10;
		var secret      = typeof options.secret  === 'string'   ? options.secret     : '';
		var hash_algo   = typeof options.algo    === 'string'   ? options.algo       : 'md5';
		var use_special = options.special ?? 0;
		var mode        = options.mode    ?? 0;

		if (mode === 2) {
			length      = 15;
			hash_algo   = 'sha256';
			use_special = 1;
		}

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

		var total = 0;
		var start = get_unixtime_ms();

		// Loop for hashRounds number of times, and then keep going if the password
		// isn't in the correct format
		while (remainingRounds > 0 || !validatePassword(generated, length, use_special)) {
			if (hash_algo === "sha1") {
				generated = generate_sha1_sgp(generated, use_special);
			} else if (hash_algo === "sha256") {
				generated = generate_sha256_sgp(generated, use_special);
			} else {
				generated = generate_md5_sgp(generated, use_special);
			}

			if (total > 100) {
				console.log("Too many iterations");
				return "";
			}

			remainingRounds -= 1;
			total++;
		}

		var end = get_unixtime_ms();
		console.log("Generated password in %d iterations in %d ms", total, end - start);

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

	function get_unixtime_ms() {
		var date_obj = new Date;
		var ret      = date_obj.getTime();

		return ret;
	}

	return {
		derivePassword,
		domainFromUrl,
		extractHostname,
		normalizeDomain,
		validatePassword,
	};
});
