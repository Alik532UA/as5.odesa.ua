import rawPrograms from './educationalPrograms.json';

export interface CurriculumRow {
	subject: string;
	h1: string;
	h2: string;
	h3: string;
	h4: string;
	h5?: string;
	isTotal?: boolean;
}

export interface EducationalProgram {
	id: string;
	level: 'elementary' | 'basic';
	year: number;
	isCurrent: boolean;
	title: { uk: string; en: string };
	duration: { uk: string; en: string };
	weeklyHours: string;
	instruments: { uk: string; en: string };
	pdfUrl: string;
	pdfSize: string;
	pdfPages: number;
	stampScanUrl: string;
	curriculum: CurriculumRow[];
}

export const EDUCATIONAL_PROGRAMS: readonly EducationalProgram[] =
	rawPrograms as EducationalProgram[];
