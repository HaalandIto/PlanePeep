# Style Guide

_Standards here are a unified and simplified version of Google's official style guidelines for Java, TypeScript, and HTML/CSS_

> Style choices are either an auto-formatting rule on save, or it's not a rule.

---

## 0. Auto Formatters

These rules are a general outline of the project style. Overall the style should be consistent between documents. The **final say** goes to the [prettier](./.prettierrc.json)/[eslint](./.eslintrc.json) configuration files.

### Setup

```bash
# run this in the root directory of the project
npm i
```

**For Java:**

ESLint doesn't support Java. We could use **Checkstyle** or **PMD** for Java linting.

**For JS/TS:**

Add these scripts to your `package.json` for easy formatting and linting:

```json
{
    "scripts": {
        "format": "prettier --write .",
        "format:check": "prettier --check .",
        "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
        "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
        "check": "npm run format:check && npm run lint",
        "fix": "npm run format && npm run lint:fix"
    }
}
```

**Usage:**

```bash
npm run format      # Auto-format all files
npm run lint:fix    # Fix all auto-fixable linting issues
npm run fix         # Format + lint (recommended before commits)
npm run check       # Check for issues without fixing (CI/CD)
```

---

## 1. General Principles

- **Indentation:** Use **4 spaces** for indentation. No tabs.
- **Line Length:** \* Java: 100 characters.
    - TypeScript: 80 characters.
- **Encoding:** UTF-8.
- **Whitespace:** Trim trailing whitespace. End files with a single newline.

---

## 2. Java

### Naming Conventions

- **Classes/Interfaces:** `UpperCamelCase`
- **Methods/Variables:** `lowerCamelCase`
- **Constants (`static final`):** `UPPER_SNAKE_CASE`
- **Package Names:** All lowercase, no underscores

### Formatting

- **Braces:** K&R style (Egyptian brackets). Opening brace on the **same line** as the declaration.
    ```java
    if (isReady) {
      start();
    } else {
      wait();
    }
    ```
- **Blocks:** Always use braces for `if`, `else`, `for`, `do`, and `while` statements, even when the body is empty or contains only a single statement.
- **Switch:** Always include a `default` case, even if empty.
- **Annotations:** Annotations apply to the same line (if short) or the line immediately before.

### Structure

1.  **Package statement**
2.  **Import statements:** _ No wildcard imports (`import java.util._;`).
3.  **Class definition**

---

## 3. TypeScript

### Naming Conventions

- **Classes/Interfaces/Types:** `UpperCamelCase`.
- **Variables/Functions:** `lowerCamelCase`.
- **Constants (Global):** `UPPER_SNAKE_CASE` (if immutable and exported), otherwise `lowerCamelCase`.
- **File Names:** `kebab-case.ts` or `snake_case`.

### Formatting

- **Semicolons:** **Required** at the end of every statement.
- **Quotes:** Use **single quotes** (`'text'`) instead of double quotes, unless the string contains single quotes.
- **Braces:** K&R style (same line).

### Syntax Rules

- **Variables:** Use `const` by default; use `let` only if reassignment is needed. Never use `var`.
- **Arrays:** Use `string[]` shorthand rather than `Array<string>`.
- **Trailing Commas:** Include trailing commas in multi-line object/array literals.
    ```typescript
    const hero = {
        firstName: 'Bruce',
        lastName: 'Wayne', // Trailing comma here
    };
    ```
- **Visibility:** Explicitly define `public`, `private`, or `protected` for class members is optional (public is default), but often preferred for clarity in strictly typed projects.

---

## 4. HTML & CSS

### HTML

- **Tags:** Always **lowercase** (e.g., `<div>`, not `<DIV>`).
- **Attributes:** \* Always **lowercase**.
    - Always use **double quotes** (e.g., `id="header"`).
- **Semantics:** Use semantic tags (`<main>`, `<nav>`, `<article>`) over generic `<div>` where possible.
- **Alt Text:** Required for all `<img>` tags.
- **Protocol:** Omit the protocol (`http:`, `https:`) from embedded resources (use `//example.com`) _unless_ necessary for security/local testing.

### CSS

- **Naming:** Use `kebab-case` for IDs and class names (e.g., `.nav-bar`, `#login-button`).
- **Delimiters:** \* Put a space after the colon in property declarations.
    - Put a space before the opening brace `{`.
- **Quotes:** Use single quotes `'` for attribute selectors or URLs.
- **Structure:**
    ```css
    .element-class {
        display: block; /* 2 space indent */
        color: #333;
    }
    ```
