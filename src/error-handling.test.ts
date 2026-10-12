// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
	AppError,
	ValidationError,
	NotFoundError,
	NetworkError,
	AuthError,
	errorToMessageKey
} from '$lib/errors';

const ROOT = process.cwd();

const walk = (dir: string, out: string[] = []): string[] => {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(ts|svelte)$/.test(entry)) out.push(full.replace(/\\/g, '/'));
	}
	return out;
};

const withoutComments = (source: string): string =>
	source
		.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
		.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
		.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + m.slice(p1.length).replace(/./g, ' '));

const sources = walk('src').filter((f) => !/\.(test|spec)\.ts$/.test(f));

describe('обробка помилок (ERROR-HANDLING-v10)', () => {
	it('кореневий +error.svelte існує', () => {
		expect(existsSync(join(ROOT, 'src/routes/+error.svelte'))).toBe(true);
	});

	it('доменні класи наслідують AppError', () => {
		const base = new AppError('CODE', 'msg');
		expect(base).toBeInstanceOf(Error);
		expect(base.code).toBe('CODE');

		const val = new ValidationError({ email: 'invalid' });
		expect(val).toBeInstanceOf(AppError);
		expect(val.code).toBe('VALIDATION_ERROR');
		expect(errorToMessageKey(val)).toBe('errors.validation');

		const nf = new NotFoundError('Item');
		expect(nf).toBeInstanceOf(AppError);
		expect(errorToMessageKey(nf)).toBe('errors.notFound');

		const net = new NetworkError('offline', { status: 503 });
		expect(net).toBeInstanceOf(AppError);
		expect(net.status).toBe(503);
		expect(errorToMessageKey(net)).toBe('errors.network');

		const auth = new AuthError();
		expect(auth).toBeInstanceOf(AppError);
		expect(errorToMessageKey(auth)).toBe('errors.auth');

		expect(errorToMessageKey(new Error('raw'))).toBe('errors.unexpected');
		expect(errorToMessageKey('str')).toBe('errors.unexpected');
	});

	it('немає throw рядків замість Error', () => {
		const bad: string[] = [];
		for (const f of sources) {
			const text = withoutComments(readFileSync(f, 'utf8'));
			if (/throw\s+['"`]/.test(text)) {
				bad.push(f);
			}
		}
		expect(bad).toEqual([]);
	});
});
