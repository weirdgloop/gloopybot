'use strict';

/** Read a required environment variable, trimming it and failing early when it is empty. */
function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = { requireEnv };
