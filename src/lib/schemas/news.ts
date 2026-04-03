import { z } from 'zod';

export const NewsItemSchema = z.object({
	id: z.number().int().positive("News ID must be positive"),
	title: z.string().min(3, "Назва занадто коротка").max(200, "Назва занадто довга"),
	date: z.string().min(1, "Дата обов'язкова"),
	category: z.string().optional().default('Загальне'),
	color: z.string().optional(),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;

export function validateNews(data: unknown[]): NewsItem[] {
	return data.map(item => NewsItemSchema.parse(item));
}
