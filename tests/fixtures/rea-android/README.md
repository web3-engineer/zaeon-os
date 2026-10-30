# Original synthetic APK fixtures

`source/a` and `source/b` are original minimal Java/Android sources, built with `scripts/rea/build-fixtures.mjs`. `frozen/a` and `frozen/b` contain the small APKs actually used in the recorded qualification, their source/toolchain locks and verifier oracles. They are **test inputs**, never automatically installed or executed. No third-party application is redistributed.

Only the APK enters the REA engine. Keep locks/oracles outside the agent's workspace and prompt; the private verifier reads them. B was built/sealed before A analysis and excluded from A's evaluation dataset. These fixtures demonstrate static verification and transfer-safety controls, not an unseen-agent benchmark or a measured improvement in LLM quality.

The APK ZIP digest can vary on rebuild because of timestamps. Verify the frozen file against its lock, or seal a fresh build with its own lock before testing. Do not change an oracle to make a failing analysis pass.
