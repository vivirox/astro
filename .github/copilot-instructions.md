# Co-Pilot Development Rules & AI Collaboration Guide for Astro/TypeScript

## �� Core Philosophy

1. **Simplicity:** Prioritize simple, clear, and maintainable solutions. Avoid unnecessary complexity or over-engineering.
2. **Iterate:** Prefer iterating on existing, working code rather than building entirely new solutions from scratch, unless fundamentally necessary or explicitly requested.
3. **Focus:** Concentrate efforts on the specific task assigned. Avoid unrelated changes or scope creep.
4. **Quality:** Strive for a clean, organized, well-tested, and secure codebase.
5. **Collaboration:** This document guides both human developers and the AI assistant for effective teamwork.

## 📚 Project Context & Understanding

1. **Documentation First:**
    * **Always** check for and thoroughly review relevant project documentation *before* starting any task. This includes:
        * Product Requirements Documents (PRDs)
        * `README.md` (Project overview, setup, patterns, technology stack)
        * `docs/architecture.md` (System architecture, component relationships)
        * `docs/technical.md` (Technical specifications, established patterns)
        * `tasks/tasks.md` (Current development tasks, requirements)
        * `astro.config.mjs` (Astro configuration and integrations)
        * `tsconfig.json` (TypeScript configuration)
    * If documentation is missing, unclear, or conflicts with the request, **ask for clarification**.
2. **Architecture Adherence:**
    * Follow Astro's recommended project structure:
        * `src/pages/` for file-based routing
        * `src/components/` for reusable components
        * `src/layouts/` for page layouts
        * `src/content/` for content collections
        * `src/styles/` for global styles
        * `public/` for static assets
    * Understand and respect module boundaries, data flow, system interfaces, and component dependencies.
    * Validate that changes comply with established architecture and Astro's best practices.
3. **Pattern & Tech Stack Awareness:**
    * Reference project documentation to understand existing patterns and technologies.
    * Utilize Astro's built-in features and official integrations before adding external dependencies.

## ⚙️ Task Execution & Workflow

1. **Task Definition:**
    * Clearly understand the task requirements, acceptance criteria, and any dependencies from `tasks/tasks.md` and the PRD.
2. **Systematic Change Protocol:** Before making significant changes:
    * **Identify Impact:** Determine affected components, dependencies, and potential side effects.
    * **Plan:** Outline the steps. Tackle one logical change or file at a time.
    * **Verify Testing:** Confirm how the change will be tested. Add tests if necessary *before* implementing (see TDD).
3. **Progress Tracking:**
    * Keep `docs/status.md` updated with task progress (in-progress, completed, blocked), issues encountered, and completed items.
    * Update `tasks/tasks.md` upon task completion or if requirements change during implementation.

## 🤖 AI Collaboration & Prompting

1. **Clarity is Key:** Provide clear, specific, and unambiguous instructions to the AI. Define the desired outcome, constraints, and context.
2. **Context Referencing:** If a task spans multiple interactions, explicitly remind the AI of relevant previous context, decisions, or code snippets.
3. **Suggest vs. Apply:** Clearly state whether the AI should *suggest* a change for human review or *apply* a change directly (use only when high confidence and task is well-defined). Use prefixes like "Suggestion:" or "Applying fix:".
4. **Question AI Output:** Human developers should critically review AI-generated code. Question assumptions, verify logic, and don't blindly trust confident-sounding but potentially incorrect suggestions (hallucinations).
5. **Focus the AI:** Guide the AI to work on specific, focused parts of the task. Avoid overly broad requests that might lead to architectural or logical errors.
6. **Leverage Strengths:** Use the AI for tasks it excels at (boilerplate generation, refactoring specific patterns, finding syntax errors, generating test cases) but maintain human oversight for complex logic, architecture, and security.
7. **Incremental Interaction:** Break down complex tasks into smaller steps for the AI. Review and confirm each step before proceeding.
8. **Standard Check-in (for AI on large tasks):** Before providing significant code suggestions:
    * "Confirming understanding: I've reviewed [specific document/previous context]. The goal is [task goal], adhering to [key pattern/constraint]. Proceeding with [planned step]." (This replaces the more robotic "STOP AND VERIFY").

## ✨ Code Quality & Style

1. **TypeScript Guidelines:**
    * Use strict typing (avoid `any`). Document complex logic with JSDoc.
    * Leverage TypeScript's type inference where appropriate.
    * Define proper interfaces for component props.
    * Use type guards for runtime type checking.
2. **Astro Component Guidelines:**
    * Use `.astro` files for static or minimally interactive components.
    * Keep React/Vue/Svelte components only for highly interactive features.
    * Use client directives (`client:load`, `client:idle`, `client:visible`) judiciously.
    * Implement proper prop validation using TypeScript interfaces.
    * **IMPORTANT**: Always use proper Astro frontmatter syntax (content between `---` fences) for imports, props, and scripts.
    * Correct Astro file structure has three parts:
        1. Frontmatter section between `---` fences containing imports, TypeScript definitions, and JavaScript logic
        2. HTML template section after the closing `---`
        3. Optional `<style>` section at the bottom
    * Variables defined in the frontmatter section are available in the template.
    * After creating or editing `.astro` files, verify that frontmatter sections are properly defined.
    * **Common Errors to Check for:**
        * Missing or improper frontmatter fences (`---` at beginning and end of frontmatter)
        * Incorrect imports (verify if the imported module uses default or named exports)
        * Type import errors (ensure correct type paths and imports)
        * Undefined variable errors for props and imported components in templates
    * Example of correct structure:

      ```astro
      ---
      // Imports and TypeScript in frontmatter section
      import MyComponent from './MyComponent';
      import type { MyProps } from './types';
      
      // Props interface
      interface Props {
        title: string;
        items?: string[];
      }
      
      // Props destructuring
      const { title, items = [] } = Astro.props;
      
      // Any other JS logic
      const count = items.length;
      ---
      
      <!-- HTML template section -->
      <div>
        <h1>{title}</h1>
        <p>Item count: {count}</p>
        <ul>
          {items.map(item => <li>{item}</li>)}
        </ul>
      </div>
      
      <!-- Optional style section -->
      <style>
        h1 { color: blue; }
      </style>
      ```

3. **Small Files & Components:**
    * Keep files under **300 lines**. Refactor proactively.
    * Break down large components into smaller, single-responsibility components.
    * Use Astro's partial hydration for optimal performance.
4. **Performance Optimization:**
    * Minimize client-side JavaScript usage.
    * Leverage Astro's static site generation capabilities.
    * Implement proper image optimization using `@astrojs/image`.
    * Use dynamic imports for code splitting.
5. **Pattern Consistency:**
    * Follow Astro's component patterns and conventions.
    * Use consistent naming for files: PascalCase for components, kebab-case for pages.
    * Maintain consistent directory structure.
6. **Avoid Duplication (DRY):** Actively look for and reuse existing functionality. Refactor to eliminate duplication.
7. **No Bazel:** Bazel is not permitted. Use project-specified build tools.
8. **Linting/Formatting:**
    * Ensure all code conforms to project's ESLint/Prettier rules.
    * **CRITICAL**: Always check for linter errors after creating or editing files.
    * For `.astro` files, verify correct structure with imports and TypeScript in the frontmatter section (between `---` fences) and template code after.
    * Fix any syntax or import errors before committing changes.
9. **File Naming:** Use clear, descriptive names. Avoid "temp", "refactored", "improved", etc., in permanent file names.
10. **No One-Time Scripts:** Do not commit one-time utility scripts into the main codebase.

## ♻️ Refactoring

1. **Purposeful Refactoring:** Refactor to improve clarity, reduce duplication, simplify complexity, or adhere to architectural goals.
2. **Holistic Check:** When refactoring, look for duplicate code, similar components/files, and opportunities for consolidation across the affected area.
3. **Edit, Don't Copy:** Modify existing files directly. Do not duplicate files and rename them (e.g., `component-v2.tsx`).
4. **Verify Integrations:** After refactoring, ensure all callers, dependencies, and integration points function correctly. Run relevant tests.

## ✅ Testing & Validation

1. **Test-Driven Development (TDD):**
    * **New Features:** Outline tests, write failing tests, implement code, refactor.
    * **Bug Fixes:** Write a test reproducing the bug *before* fixing it.
2. **Comprehensive Tests:** Write thorough unit, integration, and/or end-to-end tests covering critical paths, edge cases, and major functionality.
3. **Tests Must Pass:** All tests **must** pass before committing or considering a task complete. Notify the human developer immediately if tests fail and cannot be easily fixed.
4. **No Mock Data (Except Tests):** Use mock data *only* within test environments. Development and production should use real or realistic data sources.
5. **Manual Verification:** Supplement automated tests with manual checks where appropriate, especially for UI changes.

## 🐛 Debugging & Troubleshooting

1. **Fix the Root Cause:** Prioritize fixing the underlying issue causing an error, rather than just masking or handling it, unless a temporary workaround is explicitly agreed upon.
2. **Console/Log Analysis:** Always check browser and server console output for errors, warnings, or relevant logs after making changes or when debugging. Report findings.
3. **Targeted Logging:** For persistent or complex issues, add specific `console.log` statements (or use a project logger) to trace execution and variable states. *Remember to check the output.*
4. **Check the `fixes/` Directory:** Before deep-diving into a complex or recurring bug, check `fixes/` for documented solutions to similar past issues.
5. **Document Complex Fixes:** If a bug requires significant effort (multiple iterations, complex logic) to fix, create a concise `.md` file in the `fixes/` directory detailing the problem, investigation steps, and the solution. Name it descriptively (e.g., `fixes/resolve-race-condition-in-user-update.md`).
6. **Research:** Use available tools (Firecrawl, documentation search, etc.) to research solutions or best practices when stuck or unsure.

## 🔒 Security

1. **Server-Side Security:**
    * Keep sensitive logic in server-side only components.
    * Use Astro's built-in security features (automatic HTML escaping, CSP).
    * Implement proper CORS policies.
    * Use environment variables for sensitive configuration.
2. **Client-Side Security:**
    * Sanitize and validate all user inputs.
    * Implement proper XSS protection.
    * Use Content Security Policy (CSP) headers.
    * Avoid exposing sensitive information in client-side scripts.
3. **API Security:**
    * Implement proper authentication and authorization.
    * Rate limit API endpoints.
    * Validate and sanitize API inputs.
    * Use HTTPS for all external communications.
4. **Dependency Security:**
    * Regularly audit dependencies using `npm audit`.
    * Pin dependency versions for consistency.
    * Use official Astro integrations when available.
    * Keep dependencies updated to patch security vulnerabilities.
5. **Data Protection:**
    * Never expose sensitive data in client-side code or public directories.
    * Implement proper session management.
    * Use secure headers (HSTS, X-Frame-Options, etc.).
    * Follow data protection regulations (GDPR, CCPA, etc.).

## 🌳 Version Control & Environment

1. **Git Hygiene:**
    * Commit frequently with clear, atomic messages.
    * Keep the working directory clean; ensure no unrelated or temporary files are staged or committed.
    * Use `.gitignore` effectively.
2. **Branching Strategy:** Follow the project's established branching strategy. Do not create new branches unless requested or necessary for the workflow (e.g., feature branches).
3. **.env Files:** **Never** commit `.env` files. Use `.env.example` for templates. Do not overwrite local `.env` files without confirmation.
4. **Environment Awareness:** Code should function correctly across different environments (dev, test, prod). Use environment variables for configuration.
5. **Server Management:** Kill related running servers before starting new ones. Restart servers after relevant configuration or backend changes.

## 📄 Documentation Maintenance

1. **Update Docs:**
    * Keep documentation in sync with code changes.
    * Document Astro-specific configurations and integrations.
    * Maintain TypeScript type definitions and interfaces.
    * Update security-related documentation promptly.
2. **Keep Rules Updated:**
    * Review and update this `.cursorrules` file regularly.
    * Document new security measures and best practices.
    * Track changes in Astro's recommended patterns.
    * Monitor and document TypeScript version updates.

## Progress Update (2025-04-08)
