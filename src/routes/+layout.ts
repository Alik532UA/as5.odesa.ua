export const prerender = true;
export const ssr = true;

export function load({ url }: { url: URL }) {
	// Generate canonical URL on server side to prevent hydration mismatch
	const SITE_FALLBACK_ORIGIN = 'https://as5.odesa.ua';
	const canonicalUrl = `${SITE_FALLBACK_ORIGIN}${url.pathname}`;

	return {
		canonicalUrl,
	};
}
