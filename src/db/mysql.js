const mysql = require("mysql2/promise");

let pool;
let poolPromise;
let lastLoggedAt = 0;

function logOnce(message, error) {
  const now = Date.now();
  if (now - lastLoggedAt < 10_000) {
    return;
  }
  lastLoggedAt = now;

  if (error) {
    console.error(message, error);
  } else {
    console.warn(message);
  }
}

async function createPool() {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    logOnce("[mysql] Missing MYSQL_HOST/MYSQL_USER/MYSQL_DATABASE environment variables – skipping pool creation.");
    return null;
  }

  const poolConfig = {
    host,
    port: Number(process.env.MYSQL_PORT || 3306),
    user,
    password: process.env.MYSQL_PASSWORD,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    timezone: "Z",
    connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT_MS || 7_500),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };

  const newPool = mysql.createPool(poolConfig);

  try {
    const connection = await newPool.getConnection();
    connection.release();

    newPool.on?.("error", (error) => {
      const code = error?.code;
      if (code === "PROTOCOL_CONNECTION_LOST" || code === "ECONNRESET" || error?.fatal) {
        logOnce("[mysql] Connection lost – closing pool.", error);
        resetPool().catch(() => {});
      }
    });

    return newPool;
  } catch (error) {
    await newPool.end().catch(() => {});
    logOnce("[mysql] Failed to establish connection pool.", error);
    return null;
  }
}

async function resetPool() {
  const currentPool = pool;
  pool = undefined;
  poolPromise = undefined;

  if (currentPool) {
    try {
      await currentPool.end();
    } catch {
      // ignore end errors when disposing pool
    }
  }
}

async function getPool() {
  if (pool) {
    return pool;
  }

  if (!poolPromise) {
    poolPromise = createPool();
  }

  const instance = await poolPromise;

  if (!instance) {
    poolPromise = undefined;
    return null;
  }

  pool = instance;
  return pool;
}

module.exports = { getPool, resetPool };
