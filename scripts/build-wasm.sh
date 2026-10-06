#!/usr/bin/env bash
# Builds the WASM simulation core (sim/) into dist/runtime/sim/sim.wasm. Needs rustup target wasm32-unknown-unknown.
set -euo pipefail
cd "$(dirname "$0")/.."
cargo build --manifest-path sim/Cargo.toml --release --target wasm32-unknown-unknown --quiet
cp sim/target/wasm32-unknown-unknown/release/ourark_sim.wasm dist/runtime/sim/sim.wasm
echo "dist/runtime/sim/sim.wasm $(wc -c < dist/runtime/sim/sim.wasm | tr -d ' ') B"
