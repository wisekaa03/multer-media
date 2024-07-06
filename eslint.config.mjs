import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowEmpty: true, allowStaticOnly: true },
      ],
      '@typescript-eslint/no-var-requires': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/prefer-literal-enum-member': 'off',
    },
  },
);
