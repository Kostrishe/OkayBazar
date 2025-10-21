import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node // <-- даст process, console, __dirname и т.п.
      }
    },
    plugins: { import: pluginImport },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // можно оставить, но тогда нужно добавить пустые строки между группами импортов
      'import/order': [
        'warn',
        {
          groups: [['builtin', 'external'], ['internal'], ['parent', 'sibling', 'index']],
          'newlines-between': 'always'
        }
      ]
      // если хочешь вообще выключить правило:
      // 'import/order': 'off'
    }
  }
];
