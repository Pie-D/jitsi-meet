module.exports = {
    extends: [
        '@jitsi/eslint-config'
    ],
    rules: {
        // Single quotes rule
        'quotes': ['error', 'single', {
            'avoidEscape': true,
            'allowTemplateLiterals': true
        }],
        // Bracket spacing rules
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'always'],
        
        // No trailing spaces rule
        'no-trailing-spaces': ['error', {
            'skipBlankLines': false,
            'ignoreComments': false
        }],

        // Space around operators rule
        'space-infix-ops': ['error', {
            'int32Hint': false
        }],
        'space-before-blocks': ['error', 'always'],
        'space-in-parens': ['error', 'never'],
        'space-before-function-paren': ['error', {
            'anonymous': 'always',
            'named': 'never',
            'asyncArrow': 'always'
        }],

        // Space around comma rule
        'comma-spacing': ['error', {
            'before': false,
            'after': true
        }]
    }
};
