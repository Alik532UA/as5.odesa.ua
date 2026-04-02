import { z } from 'zod';

export const NewsItemSchema = z.object({
	id: z.number(),
	title: z.string().min(3, "Назва занадто коротка"),
	date: z.string(),
	category: z.string().optional().default('Загальне'),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;

export function validateNews(data: any[]): NewsItem[] {
	return data.map(item => NewsItemSchema.parse(item));
}
