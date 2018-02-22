/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#filter substitution

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

// -----------------------------------------------------------------------
// Directory Provider for special browser folders and files
// -----------------------------------------------------------------------

const NS_APP_CACHE_PARENT_DIR = "cachePDir";
const NS_APP_SEARCH_DIR       = "SrchPlugns";
const NS_APP_SEARCH_DIR_LIST  = "SrchPluginsDL";
const NS_APP_USER_SEARCH_DIR  = "UsrSrchPlugns";
const NS_XPCOM_CURRENT_PROCESS_DIR = "XCurProcD";
const XRE_APP_DISTRIBUTION_DIR = "XREAppDist";
const XRE_UPDATE_ROOT_DIR     = "UpdRootD";
const ENVVAR_UPDATE_DIR       = "UPDATES_DIRECTORY";
const WEBAPPS_DIR             = "webappsDir";
const DOWNLOAD_DIR            = "DfltDwnld"

const SYSTEM_DIST_PATH = "/system/@ANDROID_PACKAGE_NAME@/distribution";

function DirectoryProvider() {}

DirectoryProvider.prototype = {
  classID: Components.ID("{ef0f7a87-c1ee-45a8-8d67-26f586e46a4b}"),
  
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIDirectoryServiceProvider,
                                         Ci.nsIDirectoryServiceProvider2]),

  getFile: function(prop, persistent) {
    if (prop == NS_APP_CACHE_PARENT_DIR) {
      let dirsvc = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
      let profile = dirsvc.get("ProfD", Ci.nsIFile);
      return profile;
    } else if (prop == WEBAPPS_DIR) {
      // returns the folder that should hold the webapps database file
      // For fennec we will store that in the root profile folder so that all
      // webapps can easily access it
      let dirsvc = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
      let profile = dirsvc.get("ProfD", Ci.nsIFile);
      return profile.parent;
    } else if (prop == XRE_APP_DISTRIBUTION_DIR) {
      // First, check to see if there's a distribution in the data directory.
      let dataDist = FileUtils.getDir(NS_XPCOM_CURRENT_PROCESS_DIR, ["distribution"], false);
      if (!dataDist.exists()) {
        // Then check to see if there's distribution in the system directory.
        let systemDist = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
        systemDist.initWithPath(SYSTEM_DIST_PATH);
        // Only return the system distribution location if it exists.
        if (systemDist.exists()) {
          return systemDist;
        }
      }
      return dataDist;
    } else if (prop == XRE_UPDATE_ROOT_DIR) {
      let env = Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);
      if (env.exists(ENVVAR_UPDATE_DIR)) {
        let path = env.get(ENVVAR_UPDATE_DIR);
        if (path) {
          let localFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
          localFile.initWithPath(path);
          return localFile;
        }
      }
      let dm = Cc["@mozilla.org/download-manager;1"].getService(Ci.nsIDownloadManager);
      return dm.defaultDownloadsDirectory;
    } else if (prop == DOWNLOAD_DIR) {
      let dm = Cc["@mozilla.org/download-manager;1"].getService(Ci.nsIDownloadManager);
      return dm.defaultDownloadsDirectory;
    }
    
    // We are retuning null to show failure instead for throwing an error. The
    // interface is called quite a bit and throwing an error is noisy. Returning
    // null works with the way the interface is called [see bug 529077]
    return null;
  },

  /**
   * Appends the distribution-specific search engine directories to the array.
   * The distribution directory structure is as follows:
   *
   * \- distribution/
   *    \- searchplugins/
   *       |- common/
   *       \- locale/
   *          |- <locale 1>/
   *          ...
   *          \- <locale N>/
   *
   * Common engines are loaded for all locales. If there is no locale directory for
   * the current locale, there is a pref: "distribution.searchplugins.defaultLocale",
   * which specifies a default locale to use.
   */
  _appendDistroSearchDirs: function(array) {
    let distro = this.getFile(XRE_APP_DISTRIBUTION_DIR);
    if (!distro.exists())
      return;

    let searchPlugins = distro.clone();
    searchPlugins.append("searchplugins");
    if (!searchPlugins.exists())
      return;

    let commonPlugins = searchPlugins.clone();
    commonPlugins.append("common");
    if (commonPlugins.exists())
      array.push(commonPlugins);

    let localePlugins = searchPlugins.clone();
    localePlugins.append("locale");
    if (!localePlugins.exists())
      return;

    let curLocale = Services.prefs.getCharPref("general.useragent.locale");
    let curLocalePlugins = localePlugins.clone();
    curLocalePlugins.append(curLocale);
    if (curLocalePlugins.exists()) {
      array.push(curLocalePlugins);
      return;
    }

    // We didn't append the locale dir - try the default one.
    let defLocale = Services.prefs.getCharPref("distribution.searchplugins.defaultLocale");
    let defLocalePlugins = localePlugins.clone();
    if (defLocalePlugins.exists())
      array.push(defLocalePlugins);
  },

  getFiles: function(prop) {
    if (prop != NS_APP_SEARCH_DIR_LIST)
      return;

    let result = [];

    /**
     * We want to preserve the following order, since the search service loads
     * engines in first-loaded-wins order.
     *   - distro search plugin locations
     *   - user search plugin locations (profile)
     *   - app search plugin location (shipped engines)
     */
    this._appendDistroSearchDirs(result);

    let appUserSearchDir = FileUtils.getDir(NS_APP_USER_SEARCH_DIR, [], false);
    if (appUserSearchDir.exists())
      result.push(appUserSearchDir);

    let appSearchDir = FileUtils.getDir(NS_APP_SEARCH_DIR, [], false);
    if (appSearchDir.exists())
      result.push(appSearchDir);

    return {
      QueryInterface: XPCOMUtils.generateQI([Ci.nsISimpleEnumerator]),
      hasMoreElements: function() {
        return result.length > 0;
      },
      getNext: function() {
        return result.shift();
      }
    };
  }
};

this.NSGetFactory = XPCOMUtils.generateNSGetFactory([DirectoryProvider]);

