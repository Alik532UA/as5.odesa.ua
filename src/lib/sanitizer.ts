/**
 * HTML Sanitization utility — SSR-safe, no external dependencies.
 *
 * For production-grade sanitization with user-generated HTML content,
 * install DOMPurify: npm install dompurify @types/dompurify
 * and wrap with a `browser` guard from '$app/environment'.
 */

export function escapeHtml(text: string): string {
if (!text) return '';
return text
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#039;');
}

export function stripHtml(html: string): string {
if (!html) return '';
return html.replace(/<[^>]*>/g, '');
}

export function sanitizeHtml(dirty: string): string {
if (!dirty) return '';
return stripHtml(dirty);
}

export function sanitizeText(text: string): string {
return escapeHtml(text);
}
