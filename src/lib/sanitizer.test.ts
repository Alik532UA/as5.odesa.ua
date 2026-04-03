import { describe, it, expect } from 'vitest';
import { escapeHtml, stripHtml, sanitizeHtml, sanitizeText } from './sanitizer';

describe('escapeHtml', () => {
	it('escapes all HTML special characters', () => {
		expect(escapeHtml('<script>alert("XSS")</script>'))
			.toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
	});

	it('escapes ampersands', () => {
		expect(escapeHtml('AT&T')).toBe('AT&amp;T');
	});

	it('escapes single quotes', () => {
		expect(escapeHtml("it's")).toBe("it&#039;s");
	});

	it('returns empty string for empty input', () => {
		expect(escapeHtml('')).toBe('');
	});

	it('returns plain text unchanged', () => {
		expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
	});
});

describe('stripHtml', () => {
	it('removes all HTML tags', () => {
		expect(stripHtml('<p>Hello</p><script>evil()</script>'))
			.toBe('Helloevil()');
	});

	it('removes self-closing tags', () => {
		expect(stripHtml('Hello<br/>World')).toBe('HelloWorld');
	});

	it('returns empty string for empty input', () => {
		expect(stripHtml('')).toBe('');
	});

	it('preserves plain text', () => {
		expect(stripHtml('No tags here')).toBe('No tags here');
	});
});

describe('sanitizeHtml', () => {
	it('strips tags (delegates to stripHtml)', () => {
		expect(sanitizeHtml('<b>Bold</b>')).toBe('Bold');
	});

	it('returns empty string for empty input', () => {
		expect(sanitizeHtml('')).toBe('');
	});
});

describe('sanitizeText', () => {
	it('escapes HTML entities (delegates to escapeHtml)', () => {
		expect(sanitizeText('<img src=x onerror="alert(1)">')).toBe(
			'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
		);
	});
});
