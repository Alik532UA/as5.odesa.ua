import { COMMON_CHECKS } from './commonChecks';
import { PAGE_CHECKS } from './pageChecks';
import { COVERAGE_ORDER, type BetaCheck, type BetaTabId, type Coverage } from './types';

export * from './types';

/**
 * Усі пункти чеклиста в порядку оголошення.
 *
 * Файли розділені не за смаком, а через межу розміру `.ts` (250 рядків,
 * PROJECT-STRUCTURE-v8 § 7): один файл на всі пункти переріс би її вже на
 * третьому десятку, а список має рости.
 */
export const BETA_CHECKS: readonly BetaCheck[] = [...COMMON_CHECKS, ...PAGE_CHECKS];

/**
 * Пункти вкладки, згруповані за рівнем покриття в порядку
 * `manual → testable → covered`.
 *
 * Усередині рівня зберігається порядок ОГОЛОШЕННЯ: він тематичний, і
 * сортування за id чи за текстом розсипало б розділи. `filter` гарантує це
 * сам — він стабільний.
 */
export function checksByCoverage(tab: BetaTabId): { coverage: Coverage; checks: BetaCheck[] }[] {
	return COVERAGE_ORDER.map((coverage) => ({
		coverage,
		checks: BETA_CHECKS.filter((c) => c.tab === tab && c.coverage === coverage)
	})).filter((group) => group.checks.length > 0);
}
