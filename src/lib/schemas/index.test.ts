import { describe, it, expect } from 'vitest';
import {
	DepartmentSchema,
	GalleryImageSchema,
	SiteConfigSchema,
	validateDepartment,
	validateDepartmentArray,
	validateGalleryImageArray,
} from './index';

describe('DepartmentSchema', () => {
	it('accepts valid department', () => {
		expect(() => DepartmentSchema.parse({ id: 'piano', name: 'Фортепіано' })).not.toThrow();
	});

	it('accepts optional iconPath and description', () => {
		const dept = DepartmentSchema.parse({ id: '1', name: 'Piano', iconPath: '/icon.png', description: 'desc' });
		expect(dept.iconPath).toBe('/icon.png');
	});

	it('rejects empty id', () => {
		expect(() => DepartmentSchema.parse({ id: '', name: 'Piano' })).toThrow();
	});

	it('rejects empty name', () => {
		expect(() => DepartmentSchema.parse({ id: '1', name: '' })).toThrow();
	});
});

describe('GalleryImageSchema', () => {
	it('accepts valid image', () => {
		expect(() => GalleryImageSchema.parse({ src: '/photo.jpg', alt: 'Photo' })).not.toThrow();
	});

	it('rejects missing alt', () => {
		expect(() => GalleryImageSchema.parse({ src: '/photo.jpg' })).toThrow();
	});

	it('rejects missing src', () => {
		expect(() => GalleryImageSchema.parse({ alt: 'Photo' })).toThrow();
	});
});

describe('SiteConfigSchema', () => {
	it('accepts valid config', () => {
		const config = {
			schoolName: 'AS5',
			schoolPhone: '+380487238110',
			schoolEmail: 'dmsh-5odesa@ukr.net',
		};
		expect(() => SiteConfigSchema.parse(config)).not.toThrow();
	});

	it('rejects invalid email', () => {
		expect(() => SiteConfigSchema.parse({
			schoolName: 'AS5',
			schoolPhone: '123',
			schoolEmail: 'not-an-email',
		})).toThrow();
	});

	it('accepts optional socialLinks', () => {
		const config = SiteConfigSchema.parse({
			schoolName: 'AS5',
			schoolPhone: '123',
			schoolEmail: 'a@b.com',
			socialLinks: { facebook: 'https://facebook.com/test' },
		});
		expect(config.socialLinks?.facebook).toBe('https://facebook.com/test');
	});
});

describe('helper functions', () => {
	it('validateDepartment parses valid data', () => {
		expect(validateDepartment({ id: '1', name: 'Test' })).toEqual({ id: '1', name: 'Test' });
	});

	it('validateDepartmentArray parses array', () => {
		const arr = validateDepartmentArray([{ id: '1', name: 'A' }, { id: '2', name: 'B' }]);
		expect(arr).toHaveLength(2);
	});

	it('validateGalleryImageArray parses array', () => {
		const arr = validateGalleryImageArray([{ src: '/a.jpg', alt: 'A' }]);
		expect(arr).toHaveLength(1);
	});
});
