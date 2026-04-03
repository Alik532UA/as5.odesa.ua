/**
 * Lazy loading utilities using IntersectionObserver.
 * All functions are SSR-safe (check `typeof window`).
 */

/**
 * Observe an element and call callback when it enters the viewport.
 * Returns a cleanup function.
 */
export function lazyLoad(element: HTMLElement, callback: () => void, margin = '50px'): () => void {
	if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
		callback();
		return () => {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0]?.isIntersecting) {
				callback();
				observer.unobserve(element);
			}
		},
		{ rootMargin: margin, threshold: 0.01 }
	);

	observer.observe(element);
	return () => observer.disconnect();
}

/**
 * Svelte action: lazy-load an <img> from its data-src attribute.
 * 
 * Usage:
 *   <img use:lazyLoadImage data-src="/path/to/image.jpg" alt="..." />
 */
export function lazyLoadImage(img: HTMLImageElement): { destroy: () => void } {
	const cleanup = lazyLoad(img, () => {
		const src = img.dataset.src;
		if (src) {
			img.src = src;
			img.removeAttribute('data-src');
		}
	});
	return { destroy: cleanup };
}

/**
 * Svelte action: progressively load an image.
 * Shows a blurred low-quality placeholder first, then full resolution.
 * 
 * Usage:
 *   <img use:progressiveImage data-src="/full.jpg" src="/blur.jpg" alt="..." />
 */
export function progressiveImage(img: HTMLImageElement): { destroy: () => void } {
	const dataSrc = img.dataset.src;

	if (!dataSrc) return { destroy: () => {} };

	img.style.transition = 'filter 0.4s ease';
	if (!img.src) {
		img.style.filter = 'blur(10px)';
	}

	const cleanup = lazyLoad(img, () => {
		const tempImg = new Image();
		tempImg.onload = () => {
			img.src = dataSrc;
			img.style.filter = 'blur(0)';
			img.removeAttribute('data-src');
		};
		tempImg.src = dataSrc;
	});

	return { destroy: cleanup };
}
