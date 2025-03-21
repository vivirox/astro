
# Setting Up Python in Cursor

This guide explains how to properly configure Cursor to use a specific Python interpreter, particularly when working with conda environments.

## The Problem

Cursor is an Electron-based application that bundles its own Python interpreter. This can cause conflicts when you want to use a different Python interpreter, such as one from a conda environment. The main issues are:

1. Cursor sets environment variables like `PYTHONHOME` and `PYTHONPATH` that point to its bundled Python
2. These environment variables override your system's Python configuration
3. This can cause Python scripts to fail with errors like `ModuleNotFoundError: No module named 'encodings'`

## The Solution

We'll create a wrapper script that clears these environment variables before running your preferred Python interpreter.

## Step 1: Create a Python Wrapper Script

Create a file at `~/.local/bin/cursor-python-wrapper` with the following content:

```bash
#!/bin/bash

# Clear Python environment variables that might be set by Cursor
unset PYTHONHOME
unset PYTHONPATH

# Run the Python interpreter with the remaining arguments
exec /home/vivi/miniconda3/envs/devin/bin/python3.12 "$@"
```

Replace `/home/vivi/miniconda3/envs/devin/bin/python3.12` with the path to your preferred Python interpreter.

## Step 2: Make the Script Executable

```bash
chmod +x ~/.local/bin/cursor-python-wrapper
```

## Step 3: Add the Script to Your PATH

Add the following line to your `~/.bashrc` or `~/.zshrc` file:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then reload your shell configuration:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

## Step 4: Configure Cursor to Use the Wrapper Script

1. Open Cursor
2. Go to Settings (File > Preferences > Settings)
3. Search for "python.defaultInterpreterPath"
4. Set it to `/home/vivi/.local/bin/cursor-python-wrapper`
5. Also set "python.terminal.activateEnvironment" to `true`

## Step 5: Restart Cursor

Close and reopen Cursor for the changes to take effect.

## Verification

You can verify that the Python interpreter is working correctly by creating a test script:

```python
import sys
import os
import platform

print(f"Python version: {sys.version}")
print(f"Python executable: {sys.executable}")
print(f"Platform: {platform.platform()}")
print(f"PYTHONHOME: {os.environ.get('PYTHONHOME', 'Not set')}")
print(f"PYTHONPATH: {os.environ.get('PYTHONPATH', 'Not set')}")
```

Run this script in Cursor's terminal, and you should see output showing your preferred Python interpreter is being used, and the environment variables are not set.

## Troubleshooting

If you're still having issues:

1. Make sure the wrapper script is executable
2. Check that the path to your Python interpreter is correct
3. Verify that `~/.local/bin` is in your PATH
4. Restart Cursor after making changes
5. Try running the wrapper script directly from the terminal to see if it works

## Additional Notes

- This solution works for any Python interpreter, not just conda environments
- You can modify the wrapper script to include additional environment setup if needed
- If you update your Python environment, you may need to update the path in the wrapper script
