import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Cor literal: hex, rgb() ou hsl() — inclusive dentro de classes arbitrárias do Tailwind.
const COR_LITERAL = '/#[0-9a-fA-F]{3,8}\\b|\\b(rgba?|hsla?)\\(/'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    // Princípio V: cor só no tema (src/estilos).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/estilos/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${COR_LITERAL}]`,
          message: 'Cor literal fora do tema: use os tokens de src/estilos.',
        },
        {
          selector: `TemplateElement[value.raw=${COR_LITERAL}]`,
          message: 'Cor literal fora do tema: use os tokens de src/estilos.',
        },
      ],
    },
  },
  {
    // Princípio III: armazenamento do navegador só no rascunho; cookie só o CSRF, no cliente.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/rascunho.ts', 'src/api/cliente.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Armazenamento só em src/lib/rascunho.ts.' },
        { name: 'sessionStorage', message: 'Armazenamento só em src/lib/rascunho.ts.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'document', property: 'cookie', message: 'Cookie só o CSRF, em src/api/cliente.ts.' },
        { object: 'window', property: 'localStorage', message: 'Armazenamento só em src/lib/rascunho.ts.' },
        { object: 'window', property: 'sessionStorage', message: 'Armazenamento só em src/lib/rascunho.ts.' },
      ],
    },
  },
  {
    // Princípio I: componentes desenham; quem busca dados é a página.
    files: ['src/componentes/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/api/recursos', '**/api/recursos/**'],
              message: 'Componente não chama a API: receba os dados da página.',
            },
          ],
        },
      ],
    },
  },
)
