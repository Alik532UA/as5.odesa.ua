import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

/**
 * Базовий набір за CODE-QUALITY-v8 § 6.4.1.
 *
 * До цього конфіг починався блоком із семи `'off'` без жодного коментаря —
 * вимкнено було рівно те, чим пакет виражає власні CRITICAL і HIGH. `npm run
 * lint` давав нуль попереджень, і саме цей нуль ішов у звіт про якість. Порожній
 * звіт означав не «порушень немає», а «ніхто не питав».
 *
 * Правило з нулем порушень стоїть у `error` — щоб нуль лишався перевіреним.
 * Там, де борг є, стоїть `warn` із числом у коментарі: `off` ховає борг і
 * робить його невимірним, `warn` лишає його в звіті. Числа мають лише
 * зменшуватися.
 */
export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		rules: {
			// --- Анти-патерни SVELTE-CORE-v8 § 6: ідіоми Svelte 4 та SvelteKit < 2.12.
			// Нуль звернень зараз; без правила наступний `writable()` дав би зелену збірку.
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'svelte/store',
							importNames: ['writable', 'readable', 'derived'],
							message:
								'Svelte 5: стан — $state/$derived у класі-контролері (.svelte.ts). SVELTE-CORE-v8, анти-патерни.'
						},
						{
							name: '$app/stores',
							message:
								'Deprecated із SvelteKit 2.12: `import { page } from "$app/state"`. SVELTE-CORE-v8 § 1.8.'
						}
					]
				}
			],

			// --- SECURITY-v8 § 13. CSP цих конструкцій не дозволяє, тож помилка
			// виявилася б лише в рантаймі у відвідувача. Нуль звернень.
			'no-eval': 'error',
			'no-implied-eval': 'error',
			'no-new-func': 'error',
			'no-script-url': 'error',

			// --- I18N-v8 § 4.3, HIGH. Без аргументу метод бере локаль СИСТЕМИ, а не
			// мову сайту: у розробника з українською системою на українському сайті
			// вивід збігається, ламається він в англійській версії. Нуль звернень.
			'no-restricted-syntax': [
				'error',
				{
					selector:
						'CallExpression[arguments.length=0][callee.property.name=/^toLocale(String|DateString|TimeString)$/]',
					message:
						'I18N-v8 § 4.3: передайте локаль явно — без неї береться локаль системи, а не мова сайту.'
				}
			],

			// --- SECURITY-v8 § 5. Правило вже є у flat/recommended — тут воно підняте
			// явно, щоб зміна пресету не зняла його мовчки.
			'svelte/no-at-html-tags': 'error',

			// --- ACCESSIBILITY-v8 § 10.5: a11y-попередження компілятора Svelte.
			'svelte/valid-compile': 'error',

			// --- SVELTE-CORE-v8 § 1.5: голі Set/Map/Date як реактивний стан. Нуль.
			'svelte/prefer-svelte-reactivity': 'error',

			// --- CODE-QUALITY-v8 § 1: `@ts-ignore` без причини. Нуль звернень.
			'@typescript-eslint/ban-ts-comment': 'error',

			// --- Борг, що мігрується окремими комітами ---
			// Кожне правило нижче має стати 'error'. Поки 'warn', бо разова зміна
			// непереглядна без ручної перевірки. Число — стан на 2026-08-14.

			// SVELTE-UI-v8 § 1.5, HIGH. 24 місця. Ціна ключа не нульова: дублікат
			// кидає помилку в РАНТАЙМІ, а не на збірці, тож ключ береться з поля,
			// яке код і так вважає унікальним (id, slug), а не з першого-ліпшого рядка.
			'svelte/require-each-key': 'warn',

			// SEO-v8 § 1.5. 13 місць. Різниця з `${base}/…` не косметична: resolve()
			// типізований проти списку реальних маршрутів, тож помилка в адресі
			// стає помилкою компіляції. Саме такий баг — зайва велика літера в
			// slug — тримав сторінку зламаною в продакшні сусіднього проєкту.
			'svelte/no-navigation-without-resolve': 'warn',

			// CODE-QUALITY-v8 § 1, HIGH. 4 місця.
			'@typescript-eslint/no-explicit-any': 'warn',

			// 16 місць. Службові імена не рахуються боргом: `_`-префікс, залишок
			// деструктуризації та параметр catch — це ідіоми, а не техборг.
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_?e$',
					// const { updatedAt, ...rest } = obj — стандартна ідіома «прибрати ключ».
					ignoreRestSiblings: true
				}
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		// SECURITY-v8 § 5.3: JSON-LD збирається з власних даних сайту, а не з
		// вводу відвідувача. Це єдиний {@html} у проєкті, і він лишається винятком
		// із записаною причиною — правило нижче тримає межу для решти файлів.
		files: ['src/routes/+layout.svelte'],
		rules: {
			'svelte/no-at-html-tags': 'off'
		}
	},
	{
		// `.cjs` — це CommonJS за визначенням: `require()` тут не техборг, а формат.
		files: ['**/*.cjs'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off'
		}
	},
	{
		ignores: ['build/', '.svelte-kit/', 'dist/', 'static/']
	}
);
