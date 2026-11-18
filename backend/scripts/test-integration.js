import { spawn } from "node:child_process";
const child = spawn(process.execPath, ["--test", "test/integration.test.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    RUN_INTEGRATION_TESTS: "true",
    LLM_PROVIDER: "mock",
    EMBEDDING_PROVIDER: "mock",
  },
});
child.on("exit", (code) => process.exit(code ?? 1));
