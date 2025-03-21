
from typing import Dict, Optional, Union
from pathlib import Path

def load_dotenv(
    dotenv_path: Optional[Union[str, Path]] = None,
    stream: Optional[object] = None,
    verbose: bool = False,
    override: bool = False,
    interpolate: bool = True,
    encoding: Optional[str] = None,
) -> bool: ...
def dotenv_values(
    dotenv_path: Optional[Union[str, Path]] = None,
    stream: Optional[object] = None,
    verbose: bool = False,
    interpolate: bool = True,
    encoding: Optional[str] = None,
) -> Dict[str, str]: ...
def find_dotenv(
    filename: str = ".env",
    raise_error_if_not_found: bool = False,
    usecwd: bool = False,
) -> str: ...
def set_key(
    dotenv_path: Union[str, Path],
    key_to_set: str,
    value_to_set: str,
    quote_mode: str = "always",
    export: bool = False,
    encoding: Optional[str] = None,
) -> None: ...
def unset_key(
    dotenv_path: Union[str, Path],
    key_to_unset: str,
    quote_mode: str = "always",
    encoding: Optional[str] = None,
) -> None: ...
