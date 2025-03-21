
from pathlib import Path

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
