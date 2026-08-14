import { waitLocale } from 'svelte-i18n';
import '$lib/i18n';
import { canonicalUrl } from '$lib/config/site';

export const prerender = true;
export const ssr = true;

export async function load({ url }: { url: URL }) {
	// svelte-i18n loads dictionaries lazily, and the layout used to wrap the
	// whole page in {#await waitLocale()}. During prerendering that promise is
	// still pending, so every page shipped the empty placeholder branch: no
	// header, no nav, no headings. Crawlers saw a blank document, and with no
	// links to follow the prerender crawler only ever produced the home page.
	// Awaiting here means the dictionary is ready before anything renders.
	await waitLocale();

	// Generate canonical URL on server side to prevent hydration mismatch.
	// The origin lives in one place now — see lib/config/site.ts for why
	// concatenating it with pathname by hand produced /as5.odesa.ua/as5.odesa.ua/.
	return {
		canonicalUrl: canonicalUrl(url.pathname)
	};
}
