
#!/usr/bin/env python3

"""
This script creates type stubs for the dotenv package.
"""

from pathlib import Path


def create_dotenv_stubs():
    """Create type stubs for the dotenv package."""
    # Get the site-packages directory
    import site

    site_packages = site.getsitepackages()[0]

    # Create the stubs directory
    stubs_dir = Path(site_packages) / "dotenv-stubs"
    stubs_dir.mkdir(exist_ok=True)

    # Create the __init__.pyi file
    init_pyi = stubs_dir / "__init__.pyi"
    with open(init_pyi, "w") as f:
        _ = f.write(
            """from pathlib import Path

def load_dotenv(
    dotenv_path: str | Path | None = None,
    stream: object | None = None,
    verbose: bool = False,
    override: bool = False,
    interpolate: bool = True,
    encoding: str | None = None,
) -> bool: ...

def dotenv_values(
    dotenv_path: str | Path | None = None,
    stream: object | None = None,
    verbose: bool = False,
    interpolate: bool = True,
    encoding: str | None = None,
) -> dict[str, str]: ...

def find_dotenv(
    filename: str = ".env",
    raise_error_if_not_found: bool = False,
    usecwd: bool = False,
) -> str: ...

def set_key(
    dotenv_path: str | Path,
    key_to_set: str,
    value_to_set: str,
    quote_mode: str = "always",
    export: bool = False,
    encoding: str | None = None,
) -> None: ...

def unset_key(
    dotenv_path: str | Path,
    key_to_unset: str,
    quote_mode: str = "always",
    encoding: str | None = None,
) -> None: ...
"""
        )

    # Create the py.typed file
    py_typed = stubs_dir / "py.typed"
    py_typed.touch()

    print(f"Created dotenv type stubs at {stubs_dir}")


if __name__ == "__main__":
    create_dotenv_stubs()
