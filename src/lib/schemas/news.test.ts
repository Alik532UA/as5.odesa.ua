import { describe, it, expect } from 'vitest';
import { NewsItemSchema, validateNews } from './news';

describe('NewsItemSchema', () => {
	it('accepts a valid news item', () => {
		const valid = { id: 1, title: 'Осінній фестиваль', date: '15 жов. 2024', category: 'Фестиваль', color: '#FF6B6B' };
		expect(() => NewsItemSchema.parse(valid)).not.toThrow();
	});

	it('applies default category when omitted', () => {
		const item = NewsItemSchema.parse({ id: 1, title: 'Test', date: '01-01' });
		expect(item.category).toBe('Загальне');
	});

	it('rejects negative id', () => {
		expect(() => NewsItemSchema.parse({ id: -1, title: 'X', date: '01' })).toThrow();
	});

	it('rejects title shorter than 3 characters', () => {
		expect(() => NewsItemSchema.parse({ id: 1, title: 'AB', date: '01' })).toThrow();
	});

	it('rejects empty date', () => {
		expect(() => NewsItemSchema.parse({ id: 1, title: 'Test title', date: '' })).toThrow();
	});

	it('accepts optional color field', () => {
		const without = NewsItemSchema.parse({ id: 1, title: 'Test', date: '01' });
		expect(without.color).toBeUndefined();
	});
});

describe('validateNews', () => {
	it('validates an array of news items', () => {
		const data = [
			{ id: 1, title: 'First', date: '01' },
			{ id: 2, title: 'Second', date: '02' },
		];
		const result = validateNews(data);
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe(1);
	});

	it('throws on invalid item in array', () => {
		expect(() => validateNews([{ id: 'bad', title: 'X', date: '01' }])).toThrow();
	});
});
