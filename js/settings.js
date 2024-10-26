const SETTINGS_KEY = "settings";

/**
 * @typedef Settings
 * @prop {number} fontSize
*/

/**
 * This function loads the settings from the localStorage, if its null
 * it just returns the default settings.
 * @returns {Settings} 
*/
function load() {
  const settings = window.localStorage.getItem(SETTINGS_KEY);
  if (!settings) {
    // 
    return {
      fontSize: 25,
    }
  }

  return JSON.parse(settings);
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
