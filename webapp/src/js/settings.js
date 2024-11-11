const SETTINGS_KEY = "settings";

/**
 * @typedef Settings
 * @prop {boolean} lightTheme
 * @prop {boolean} readerIsPaginated true: continous / false: paginated
 * @prop {number} fontSize
 * @prop {string} uuid
 * @prop {string} serverAddress
*/

/** @type {Settings} */
const DEFAULT_SETTINGS = {
  lightTheme: false,
  readerIsPaginated: true,
  fontSize: 25,
  uuid: "",
  serverAddress: ""
};

/**
 * This function loads the settings from the localStorage, if its null
 * it just returns the default settings.
 * @returns {Settings} 
*/
function load() {
  const settings = window.localStorage.getItem(SETTINGS_KEY);
  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  const currentSettings = JSON.parse(settings);
  return { ...DEFAULT_SETTINGS, ...currentSettings };
}

/**
 * @param {Settings} settings
*/
function update(settings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// We export the functions as a module (for <script> tag)
const settings = { load, update };
export default settings;
