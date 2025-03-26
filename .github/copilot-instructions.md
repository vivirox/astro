# Instructions

During your interaction with the user, if you find anything reusable in this project (e.g. version of a library, model name), especially about a fix to a mistake you made or a correction you received, you should take note in the `Lessons` section in the `.github/copilot-instructions.md` file so you will not make the same mistake again.

You should also use the `.github/copilot-instructions.md` file's "scratchpad" section as a Scratchpad to organize your thoughts. Especially when you receive a new task, you should first review the content of the Scratchpad, clear old different task if necessary, first explain the task, and plan the steps you need to take to complete the task. You can use todo markers to indicate the progress, e.g.
[X] Task 1
[ ] Task 2

Also update the progress of the task in the Scratchpad when you finish a subtask.
Especially when you finished a milestone, it will help to improve your depth of task accomplishment to use the Scratchpad to reflect and plan.
The goal is to help you maintain a big picture as well as the progress of the task. Always refer to the Scratchpad when you plan the next step.

# Tools

Note all the tools are in python. So in the case you need to do batch processing, you can always consult the python files and write your own script.

IMPORTANT: Make better use of the available Python tools! Before diving into implementation, always try to:

1. Use search_engine.py to research solutions and best practices
2. Use web_scraper.py to gather detailed documentation
3. Use llm_api.py for complex analysis tasks
4. Combine tools for a better research workflow

Remember: These tools are here to help make better informed decisions. Use them proactively!

## Screenshot Verification

The screenshot verification workflow allows you to capture screenshots of web pages and verify their appearance using LLMs. The following tools are available:

1. Screenshot Capture:
```bash
conda activate gradiant && tools/screenshot_utils.py URL [--output OUTPUT] [--width WIDTH] [--height HEIGHT]
```

2. LLM Verification with Images:
```bash
conda activate gradiant && tools/llm_api.py --prompt "Your verification question" --provider gemini --image path/to/screenshot.png
```

Example workflow:
```python
from screenshot_utils import take_screenshot_sync
from llm_api import query_llm

# Take a screenshot

screenshot_path = take_screenshot_sync('https://example.com', 'screenshot.png')

# Verify with LLM

response = query_llm(
    "What is the background color and title of this webpage?",
    provider="gemini",
    image_path=screenshot_path
)
print(response)
```

## LLM

You always have an LLM at your side to help you with the task. For simple tasks, you could invoke the LLM by running the following command:
```
conda activate gradiant && tools/llm_api.py --prompt "What is the capital of France?" --provider "gemini"
```

The LLM API supports multiple providers:
- Gemini (model: gemini-2.0-flash)
- Local LLM (model: Qwen/Qwen2.5-32B-Instruct-AWQ)

But usually it's a better idea to check the content of the file and use the APIs in the `tools/llm_api.py` file to invoke the LLM if needed.

## Web browser

You could use the `tools/web_scraper.py` file to scrape the web.
```
conda activate gradiant && tools/web_scraper.py --max-concurrent 3 URL1 URL2 URL3
```
This will output the content of the web pages.

## Search engine

You could use the `tools/search_engine.py` file to search the web.
```
conda activate gradiant && tools/search_engine.py "your search keywords"
```
This will output the search results in the following format:
```
URL: https://example.com
Title: This is the title of the search result
Snippet: This is a snippet of the search result
```
If needed, you can further use the `web_scraper.py` file to scrape the web page content.

# Lessons

## User Specified Lessons

- Include info useful for debugging in the program output.
- Read the file before you try to edit it.
- Due to Cursor's limit, when you use `git` and `gh` and need to submit a multiline commit message, first write the message in a file, and then use `git commit -F <filename>` or similar command to commit. And then remove the file. Include "[Cursor] " in the commit message and PR title.

## Cursor learned

- For search results, ensure proper handling of different character encodings (UTF-8) for international queries
- Add debug information to stderr while keeping the main output clean in stdout for better pipeline integration
- When using seaborn styles in matplotlib, use 'seaborn-v0_8' instead of 'seaborn' as the style name due to recent seaborn version changes

# Scratchpad

## Current Task: Create Main Dashboard Page

This task involves creating the main user dashboard that users are redirected to after login. The dashboard should serve as a central hub for accessing different features of the application.

### Requirements gathered from codebase:
- Dashboard is accessed at '/dashboard' route
- Requires authentication (redirects to login if not authenticated)
- Should integrate with existing components and layouts
- Needs to fit into the existing application structure with specialized dashboards

### Plan:
[X] Create dashboard page component with appropriate layout
[X] Add quick access links to specialized dashboards (Mental Health Chat, Simulator, etc.)
[X] Add personalized section for user's recent activity/sessions
[X] Add security status indicator
[X] Implement responsive design
[X] Add dynamic data loading for metrics/stats section
[X] Implement authentication and authorization middleware

### Progress:
1. Created main dashboard page with:
   - Welcome section with security level indicator
   - Quick access cards for main features
   - Recent sessions overview
   - Quick stats panel
2. Added dynamic data loading:
   - Created useDashboard hook for data fetching
   - Added loading states with skeleton loaders
   - Created API endpoint for dashboard data
   - Implemented error handling
3. Added authentication middleware:
   - Configured protected routes with role-based access
   - Implemented comprehensive request logging
   - Added user role validation
   - Set up user agent detection
   - Added security audit logging

### Next steps:
1. Test the implementation:
   - Verify login/logout flow
   - Test role-based access
   - Check API integration
   - Test dashboard data loading
