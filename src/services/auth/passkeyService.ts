import api from '@/services/api';

type PasskeyTransport = AuthenticatorTransport;

interface PasskeyDescriptorJSON {
	id: string;
	type: PublicKeyCredentialType;
	transports?: PasskeyTransport[];
}

interface PasskeyCreationOptionsJSON
	extends Omit<PublicKeyCredentialCreationOptions, 'challenge' | 'user' | 'excludeCredentials'> {
	challenge: string;
	user: Omit<PublicKeyCredentialUserEntity, 'id'> & { id: string };
	excludeCredentials?: PasskeyDescriptorJSON[];
}

interface PasskeyRequestOptionsJSON
	extends Omit<PublicKeyCredentialRequestOptions, 'challenge' | 'allowCredentials'> {
	challenge: string;
	allowCredentials?: PasskeyDescriptorJSON[];
}

interface PasskeyLoginOptionsResponse {
	options: PasskeyRequestOptionsJSON;
}

interface PasskeyRegisterOptionsResponse {
	options: PasskeyCreationOptionsJSON;
}

interface PasskeyLoginResponse {
	token: string;
	user: {
		id?: number;
		id_usuario?: number;
		nombre: string;
		rol?: string;
		empresa_id?: number | null;
	};
}

function base64UrlToBuffer(value: string): ArrayBuffer {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
	const binary = window.atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	bytes.forEach((byte) => {
		binary += String.fromCharCode(byte);
	});
	return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function normalizeCreationOptions(
	options: PasskeyCreationOptionsJSON,
): PublicKeyCredentialCreationOptions {
	return {
		...options,
		challenge: base64UrlToBuffer(options.challenge),
		user: {
			...options.user,
			id: base64UrlToBuffer(options.user.id),
		},
		excludeCredentials: options.excludeCredentials?.map((credential) => ({
			...credential,
			id: base64UrlToBuffer(credential.id),
		})),
	};
}

function normalizeRequestOptions(
	options: PasskeyRequestOptionsJSON,
): PublicKeyCredentialRequestOptions {
	return {
		...options,
		challenge: base64UrlToBuffer(options.challenge),
		allowCredentials: options.allowCredentials?.map((credential) => ({
			...credential,
			id: base64UrlToBuffer(credential.id),
		})),
	};
}

function publicKeyCredentialToJSON(credential: PublicKeyCredential) {
	const response = credential.response;
	const payload: Record<string, unknown> = {
		id: credential.id,
		rawId: bufferToBase64Url(credential.rawId),
		type: credential.type,
	};

	if (response instanceof AuthenticatorAttestationResponse) {
		payload.response = {
			attestationObject: bufferToBase64Url(response.attestationObject),
			clientDataJSON: bufferToBase64Url(response.clientDataJSON),
			transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
		};
	}

	if (response instanceof AuthenticatorAssertionResponse) {
		payload.response = {
			authenticatorData: bufferToBase64Url(response.authenticatorData),
			clientDataJSON: bufferToBase64Url(response.clientDataJSON),
			signature: bufferToBase64Url(response.signature),
			userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : null,
		};
	}

	return payload;
}

export function isPasskeySupported(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof window.PublicKeyCredential !== 'undefined' &&
		typeof navigator.credentials?.create === 'function' &&
		typeof navigator.credentials?.get === 'function'
	);
}

export async function canUsePlatformAuthenticator(): Promise<boolean> {
	if (!isPasskeySupported()) return false;
	if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
		return true;
	}
	return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}

export async function registerPasskey() {
	const { data } = await api.post<PasskeyRegisterOptionsResponse>(
		'/auth/passkeys/register/options',
	);
	const credential = await navigator.credentials.create({
		publicKey: normalizeCreationOptions(data.options),
	});

	if (!(credential instanceof PublicKeyCredential)) {
		throw new Error('No se pudo crear la credencial biométrica.');
	}

	await api.post('/auth/passkeys/register/verify', {
		credential: publicKeyCredentialToJSON(credential),
	});
}

export async function loginWithPasskey(email?: string): Promise<PasskeyLoginResponse> {
	const { data } = await api.post<PasskeyLoginOptionsResponse>(
		'/auth/passkeys/login/options',
		{ email: email || undefined },
	);
	const credential = await navigator.credentials.get({
		publicKey: normalizeRequestOptions(data.options),
	});

	if (!(credential instanceof PublicKeyCredential)) {
		throw new Error('No se recibió una credencial biométrica válida.');
	}

	const response = await api.post<PasskeyLoginResponse>('/auth/passkeys/login/verify', {
		credential: publicKeyCredentialToJSON(credential),
	});
	return response.data;
}
