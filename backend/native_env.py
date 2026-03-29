"""
Configure process env before NumPy / XGBoost / PyTorch load native libs.

On macOS, multiple OpenMP runtimes (e.g. Homebrew libomp + PyTorch) plus
thread-pool execution (Starlette + uvloop) can segfault in libomp. Import this
module first in entrypoints that load those libraries.
"""

from __future__ import annotations

import os

_VARS: tuple[tuple[str, str], ...] = (
    ("OMP_NUM_THREADS", "1"),
    ("OPENBLAS_NUM_THREADS", "1"),
    ("MKL_NUM_THREADS", "1"),
    ("VECLIB_MAXIMUM_THREADS", "1"),
    ("NUMEXPR_NUM_THREADS", "1"),
    # LLVM/Intel OpenMP duplicate dylibs linked into different wheels
    ("KMP_DUPLICATE_LIB_OK", "TRUE"),
)


def apply_native_runtime_env() -> None:
    for key, val in _VARS:
        os.environ.setdefault(key, val)


apply_native_runtime_env()
