module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier', // Make sure this is last
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  rules: {
    // Node.js globals
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',

    // Console and debugging
    'no-console':
      process.env.NODE_ENV === 'production'
        ? ['error', { allow: ['warn', 'error'] }]
        : ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
    'no-alert': 'warn',
    'no-eval': 'error',

    // TypeScript
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      },
    ],
    'ts/no-use-before-define': [
      'error',
      {
        functions: false,
        classes: true,
        variables: true,
        allowNamedExports: false,
      },
    ],

    // React
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',

    // Style
    'style/multiline-ternary': 'off',

    // RegExp
    'regexp/no-super-linear-backtracking': 'warn',
    'regexp/optimal-quantifier-concatenation': 'warn',
    'regexp/no-misleading-capturing-group': 'warn',

    // Error handling
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'warn',

    // Code style
    'no-nested-ternary': 'warn',
    'no-unneeded-ternary': 'warn',
    'prefer-template': 'warn',

    // Security
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Other
    'no-restricted-globals': [
      'error',
      {
        name: 'global',
        message: 'Use `globalThis` instead.',
      },
    ],
    'no-new': 'warn',
    'import/no-duplicates': 'warn',
    'jsdoc/check-param-names': 'warn',

    // Add strict JSX rules
    'react/jsx-no-target-blank': 'error',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-closing-tag-location': 'error',
    'react/jsx-closing-bracket-location': 'error',
    'react/jsx-tag-spacing': [
      'error',
      {
        closingSlash: 'never',
        beforeSelfClosing: 'always',
        afterOpening: 'never',
        beforeClosing: 'never',
      },
    ],
    'react/jsx-max-props-per-line': [
      'error',
      { maximum: 1, when: 'multiline' },
    ],
    'react/jsx-first-prop-new-line': ['error', 'multiline'],
    'react/jsx-fragments': ['error', 'syntax'],
    'react/jsx-curly-spacing': ['error', { when: 'never', children: true }],
    'react/jsx-equals-spacing': ['error', 'never'],
    'react/jsx-indent': ['error', 2],
    'react/jsx-indent-props': ['error', 2],
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-pascal-case': 'error',
    'react/jsx-sort-props': [
      'error',
      {
        callbacksLast: true,
        shorthandFirst: true,
        ignoreCase: true,
        reservedFirst: true,
      },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    node: true,
    es2024: true,
  },
  globals: {
    process: 'readonly',
    Buffer: 'readonly',
    globalThis: 'readonly',
  },
  ignorePatterns: [
    'dist/**/*',
    'node_modules/**/*',
    '.next/**/*',
    '*.generated.*',
    'coverage/**/*',
  ],
  overrides: [
    {
      // Allow console.log in development and test files
      files: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'scripts/**/*.ts',
        'src/utils/logger.ts',
        'src/lib/db/migrations/**/*.ts',
      ],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      // Stricter rules for production code
      files: ['src/**/*.{ts,tsx}'],
      excludedFiles: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/utils/logger.ts',
      ],
      rules: {
        'no-console': [
          'error',
          {
            allow: ['warn', 'error'],
          },
        ],
      },
    },
  ],
}
