const fs = require("fs").promises;
const crypto = require("crypto");
const path = require("path");

const envPath = path.join(__dirname, "..", "..", ".env");

// Generates a 32-byte random key for AES-256 and returns its hexadecimal representation
function generateAESKey() {
  return crypto.randomBytes(32).toString("hex");
}

// Check if we're in a production/CI environment where .env files aren't used
function isProductionOrCI() {
  return process.env.NODE_ENV === "production"
    || process.env.CI === "true"
    || process.env.RENDER === "true"
    || process.env.RENDER_EXTERNAL_URL
    || process.env.RENDER_SERVICE_NAME;
}

// Read the .env file, update the CB_ENCRYPTION_KEY variable, or add it if it doesn't exist
async function updateKeys(envVar) {
  // In production/CI, environment variables are set directly, not via .env file
  if (isProductionOrCI()) {
    // Just verify the environment variable exists
    if (!process.env[envVar]) {
      console.warn(`Warning: ${envVar} is not set in environment variables. Please set it in your deployment platform (e.g., Render dashboard).`); // eslint-disable-line
    } else {
      console.log(`✓ ${envVar} is set in environment variables`); // eslint-disable-line
    }
    return;
  }

  // In development, use .env file
  try {
    const data = await fs.readFile(envPath, "utf8");

    let updatedData = data;
    const keyRegex = new RegExp(`^${envVar}=(.*)$`, "m");
    const match = data.match(keyRegex);

    if (match) {
      // envVar exists
      if (match[1]) {
        // envVar has a value, do nothing
        return;
      } else {
        // 'envVar=' found but no value, update the key
        updatedData = data.replace(keyRegex, `${envVar}=${generateAESKey()}`);
        console.log(`Set up encryption key ${envVar}`); // eslint-disable-line
      }
    } else {
      // envVar not found, add the variable and the generated key
      updatedData = `${data.trim()}\n${envVar}=${generateAESKey()}\n`;
      console.log(`Set up encryption key ${envVar}`); // eslint-disable-line
    }

    // Write the updates back to the .env file
    await fs.writeFile(envPath, updatedData, "utf8");
  } catch (e) {
    console.error("The encryption key could not be set up. Please ensure you have CB_ENCRYPTION_KEY_DEV and CB_ENCRYPTION_KEY in your .env file."); // eslint-disable-line
  }
}

module.exports = async () => {
  await updateKeys("CB_ENCRYPTION_KEY_DEV");
  await updateKeys("CB_ENCRYPTION_KEY");

  return true;
};

updateKeys("CB_ENCRYPTION_KEY_DEV");
updateKeys("CB_ENCRYPTION_KEY");
