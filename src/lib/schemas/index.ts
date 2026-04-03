import { z } from 'zod';

export { NewsItemSchema, type NewsItem, validateNews } from './news';

/**
 * Схема для відділення
 */
export const DepartmentSchema = z.object({
	id: z.string().min(1, "Department ID required"),
	name: z.string().min(1, "Department name required"),
	iconPath: z.string().optional(),
	description: z.string().optional(),
});

export type Department = z.infer<typeof DepartmentSchema>;

/**
 * Схема для зображення в галереї
 */
export const GalleryImageSchema = z.object({
	src: z.string().min(1, "Image src required"),
	alt: z.string().min(1, "Alt text required"),
	title: z.string().optional(),
});

export type GalleryImage = z.infer<typeof GalleryImageSchema>;

/**
 * Схема для загальних налаштувань сайту
 */
export const SiteConfigSchema = z.object({
	schoolName: z.string(),
	schoolPhone: z.string(),
	schoolEmail: z.string().email(),
	socialLinks: z.object({
		facebook: z.string().url().optional(),
		youtube: z.string().url().optional(),
		instagram: z.string().url().optional(),
	}).optional(),
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;

/**
 * Helper функції для безпечного парсингу
 */
export function validateDepartment(data: unknown): Department {
	return DepartmentSchema.parse(data);
}

export function validateDepartmentArray(data: unknown[]): Department[] {
	return data.map(item => DepartmentSchema.parse(item));
}

export function validateGalleryImageArray(data: unknown[]): GalleryImage[] {
	return data.map(item => GalleryImageSchema.parse(item));
}
