const { Events } = require("discord.js");
const vm = require("vm");
const util = require("util");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const JS_PREFIX = "?js";
const PY_PREFIX = "?py";
const JAVA_PREFIX = "?java";
const MAX_BODY_LENGTH = 1900;
const EXECUTION_TIMEOUT_MS = 1000;
const JAVA_EXECUTION_TIMEOUT_MS = parseInt(process.env.JAVA_TIMEOUT_MS, 10) || 5000;
const JAVA_ENCODING_PROPS = [
  "-J-Dfile.encoding=UTF-8",
  "-J-Dsun.stdout.encoding=UTF-8",
  "-J-Dsun.stderr.encoding=UTF-8",
];

async function resolveMessage(message) {
  if (!message?.partial) return message;
  try {
    return await message.fetch();
  } catch (error) {
    console.error("[?js] Failed to fetch partial message", error);
    return null;
  }
}

function parseInvocation(content) {
  if (typeof content !== "string") return null;
  const trimmed = content.trim();
  if (trimmed.startsWith(JS_PREFIX)) {
    const expression = trimmed.slice(JS_PREFIX.length).trim();
    return expression.length ? { lang: "js", code: expression } : null;
  }
  if (trimmed.startsWith(PY_PREFIX)) {
    const expression = trimmed.slice(PY_PREFIX.length).trim();
    return expression.length ? { lang: "py", code: expression } : null;
  }
  if (trimmed.startsWith(JAVA_PREFIX)) {
    const expression = trimmed.slice(JAVA_PREFIX.length).trim();
    return expression.length ? { lang: "java", code: expression } : null;
  }
  return null;
}

function createConsole(logs) {
  const push = (label, args) => {
    const formatted = args.map(value => formatValue(value, { topLevel: false })).join(" ");
    const line = label ? `${label} ${formatted}` : formatted;
    if (line) logs.push(line);
  };
  return {
    log: (...args) => push("", args),
    info: (...args) => push("", args),
    debug: (...args) => push("", args),
    warn: (...args) => push("WARN", args),
    error: (...args) => push("ERROR", args),
  };
}

function buildSandbox(logs) {
  const sandbox = {
    console: createConsole(logs),
    Math,
    Number,
    BigInt,
    String,
    Boolean,
    Date,
    Array,
    Object,
    JSON,
    RegExp,
    Set,
    Map,
    WeakSet,
    WeakMap,
    Symbol,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    ArrayBuffer,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Float32Array,
    Float64Array,
    URL,
    URLSearchParams,
  };
  return vm.createContext(sandbox);
}

async function evaluateExpression(expression) {
  const logs = [];
  const context = buildSandbox(logs);

  try {
    const value = await runScript(expression, context);
    return { value, logs };
  } catch (error) {
    if (error instanceof SyntaxError) {
      const wrapped = `(async () => {\n${expression}\n})()`;
      const value = await runScript(wrapped, context);
      return { value, logs };
    }
    throw error;
  }
}

async function runScript(code, context) {
  const script = new vm.Script(code, { displayErrors: true });
  const result = script.runInContext(context, { timeout: EXECUTION_TIMEOUT_MS });
  if (result && typeof result.then === "function") {
    return await promiseWithTimeout(result, EXECUTION_TIMEOUT_MS);
  }
  return result;
}

function promiseWithTimeout(promise, timeoutMs) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Execution timed out")), timeoutMs);
    }),
  ]);
}

function formatValue(value, { topLevel = false } = {}) {
  if (typeof value === "boolean") return topLevel ? (value ? "True" : "False") : String(value);
  if (typeof value === "undefined") return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(item => formatValue(item, { topLevel: false })).join(",");
  }
  if (typeof value === "object") {
    try {
      return util.inspect(value, {
        depth: 2,
        maxArrayLength: 20,
        maxStringLength: 500,
        breakLength: 80,
        compact: 2,
      });
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function buildJsReply(logs, value) {
  const lines = [];
  if (logs.length) lines.push(...logs);
  lines.push(formatValue(value, { topLevel: true }));
  const body = truncate(lines.join("\n"));
  return wrapCodeBlock(body || "undefined");
}

function truncate(content, limit = MAX_BODY_LENGTH) {
  if (typeof content !== "string") return "";
  return content.length > limit ? content.slice(0, limit) : content;
}

function wrapCodeBlock(content) {
  return "```\n" + content + "\n```";
}

function formatError(error) {
  const message = error?.message ?? String(error);
  return wrapCodeBlock(`Error: ${truncate(message)}`);
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const resolved = await resolveMessage(message);
    if (!resolved || resolved.author?.bot) return;

    const invocation = parseInvocation(resolved.content ?? "");
    if (!invocation) return;

    if (invocation.lang === "js") {
      try {
        const { value, logs } = await evaluateExpression(invocation.code);
        await resolved.reply({
          content: buildJsReply(logs, value),
          allowedMentions: { repliedUser: false },
        });
      } catch (error) {
        await resolved.reply({
          content: formatError(error),
          allowedMentions: { repliedUser: false },
        }).catch(() => null);
      }
      return;
    }

    if (invocation.lang === "py") {
      try {
        const result = await evaluatePython(invocation.code);
        if (result.ok) {
          const output = truncate(result.output || "=> None");
          await resolved.reply({
            content: wrapCodeBlock(output),
            allowedMentions: { repliedUser: false },
          });
        } else {
          await resolved.reply({
            content: wrapCodeBlock(`Error: ${truncate(result.error)}`),
            allowedMentions: { repliedUser: false },
          }).catch(() => null);
        }
      } catch (error) {
        await resolved.reply({
          content: wrapCodeBlock(`Error: ${truncate(error?.message ?? String(error))}`),
          allowedMentions: { repliedUser: false },
        }).catch(() => null);
      }
      return;
    }

    if (invocation.lang === "java") {
      try {
        const result = await evaluateJava(invocation.code);
        if (result.ok) {
          const output = truncate(result.output || "=> null");
          await resolved.reply({
            content: wrapCodeBlock(output),
            allowedMentions: { repliedUser: false },
          });
        } else {
          await resolved.reply({
            content: wrapCodeBlock(`Error: ${truncate(result.error)}`),
            allowedMentions: { repliedUser: false },
          }).catch(() => null);
        }
      } catch (error) {
        await resolved.reply({
          content: wrapCodeBlock(`Error: ${truncate(error?.message ?? String(error))}`),
          allowedMentions: { repliedUser: false },
        }).catch(() => null);
      }
    }
  },
};

function buildPythonScript(userCode) {
  const encoded = Buffer.from(userCode, "utf8").toString("base64");
  return `
import ast, sys, traceback, base64

CODE = base64.b64decode("${encoded}").decode("utf-8")

def run_user(code):
    ns = {}
    result = None
    mod = ast.parse(code, mode="exec")
    last_expr = None
    if mod.body and isinstance(mod.body[-1], ast.Expr):
        last_expr = ast.Expression(mod.body[-1].value)
        mod.body = mod.body[:-1]
    if mod.body:
        exec(compile(mod, "<user>", "exec"), ns, ns)
    if last_expr:
        result = eval(compile(last_expr, "<user>", "eval"), ns, ns)
    return result

try:
    res = run_user(CODE)
    print(f"=> {res!r}")
except SystemExit:
    raise
except Exception:
    traceback.print_exc()
    sys.exit(1)
`;
}

async function evaluatePython(code) {
  const script = buildPythonScript(code);
  const pythonBin = process.env.PYTHON_BIN || process.env.PYTHON_PATH || "python";
  return new Promise((resolve) => {
    const child = spawn(pythonBin, ["-I", "-u", "-"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({ ok: false, error: "Execution timed out" });
    }, EXECUTION_TIMEOUT_MS);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, error: error?.message || "Failed to start python" });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        const combined = [stdout, stderr].filter(Boolean).join("\n").trimEnd();
        resolve({ ok: true, output: combined || "=> None" });
      } else {
        const errText = (stderr || stdout || "Python execution failed").trim();
        resolve({ ok: false, error: errText || "Python execution failed" });
      }
    });

    child.stdin.write(script);
    child.stdin.end();
  });
}

async function evaluateJava(code) {
  const preferredArgs = buildJshellArgs("verbose");
  const result = await runJshell(preferredArgs, code);

  if (!result.ok && /Only one feedback option/.test(result.error || "")) {
    // Retry without any feedback flag to avoid conflicts with env/default options.
    const fallbackArgs = buildJshellArgs(null);
    return await runJshell(fallbackArgs, code);
  }

  return result;
}

function buildJshellArgs(feedbackMode) {
  const javaFeedback = process.env.JSHELL_FEEDBACK || process.env.JAVA_FEEDBACK;
  const mode = feedbackMode !== undefined ? feedbackMode : (javaFeedback || "verbose");

  const feedbackFlag = (() => {
    if (!mode) return null;
    if (mode === "verbose") return "-v";
    if (mode === "silent") return "-s";
    if (mode === "quiet") return "-q";
    if (mode === "concise") return "--feedback=concise";
    return null;
  })();

  const args = ["--execution", "local", "--startup", "DEFAULT"];
  if (feedbackFlag) args.unshift(feedbackFlag);
  return args;
}

function runJshell(args, code) {
  const javaBin = process.env.JAVA_BIN || "jshell";
  return new Promise((resolve) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jshell-"));
    const scriptPath = path.join(tmpDir, "snippet.jsh");
    fs.writeFileSync(scriptPath, code + "\n", "utf8");

    const child = spawn(javaBin, [...JAVA_ENCODING_PROPS, ...args, scriptPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let cleanedUp = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({ ok: false, error: "Execution timed out" });
    }, JAVA_EXECUTION_TIMEOUT_MS);

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    };

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve({ ok: false, error: error?.message || "Failed to start jshell" });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      if (code === 0) {
        const combined = [stdout, stderr].filter(Boolean).join("\n");
        const cleaned = cleanJshellOutput(combined);
        const fallback = combined.trimEnd();
        resolve({ ok: true, output: cleaned || fallback || "=> null" });
      } else {
        const errText = (stderr || stdout || "Java execution failed").trim();
        resolve({ ok: false, error: errText || "Java execution failed" });
      }
    });

    child.stdin && child.stdin.end();
  });
}

function cleanJshellOutput(text) {
  if (!text) return "";
  return text
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("jshell>") && !line.startsWith("|"))
    .join("\n")
    .trimEnd();
}
