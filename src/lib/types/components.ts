/**
 * Shared TypeScript types for components across the project.
 */

// ─── Department ───────────────────────────────────────────────────────────────

export interface Department {
	id: string;
	name: string;
	iconPath?: string;
	description?: string;
}

export interface DepartmentCardProps {
	department: Department;
	isSelected?: boolean;
}

// ─── News ─────────────────────────────────────────────────────────────────────

export interface NewsItem {
	id: number;
	title: string;
	date: string;
	category: string;
	color?: string;
}

export interface NewsCardProps {
	item: NewsItem;
	isActive?: boolean;
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

export interface GalleryImage {
	src: string;
	alt: string;
	title?: string;
}

export interface GalleryProps {
	images: GalleryImage[];
	columns?: number;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export interface ButtonProps {
	variant?: 'primary' | 'secondary' | 'danger';
	size?: 'sm' | 'md' | 'lg';
	disabled?: boolean;
	type?: 'button' | 'submit' | 'reset';
}

export interface ErrorBoundaryProps {
	title?: string;
	retryable?: boolean;
}

// ─── SEO / Site ───────────────────────────────────────────────────────────────

export interface SiteConfig {
	schoolName: string;
	schoolPhone: string;
	schoolEmail: string;
	socialLinks?: {
		facebook?: string;
		youtube?: string;
		instagram?: string;
	};
}
