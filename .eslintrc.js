module.exports = {
    "extends": "airbnb-base",
    "plugins": [
        "import"
    ],
    "rules": {
        "no-console": "off",
        "no-debugger": "off",
        "comma-dangle": ["error", {
            "arrays": "only-multiline",
            "objects": "only-multiline",
            "imports": "only-multiline",
            "exports": "only-multiline",
            "functions": "never"
        }]
    }
};