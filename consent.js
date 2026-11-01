/* got-a.page consent-first analytics.
   Analytics (GA4) loads only after an explicit Accept. Reject keeps it off.
   The choice is remembered in localStorage and can be changed any time via
   the "Cookie settings" footer link. Withdrawing removes analytics cookies
   where the browser allows and disables further collection. */
(function () {
  "use strict";

  var STORAGE_KEY = "gap-consent";
  var GA_ID = "G-65647ZF3ZZ";

  function getChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setChoice(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* private mode */ }
  }

  function analyticsEnabledOnPage() {
    var meta = document.querySelector('meta[name="gap:analytics"]');
    return !!(meta && meta.getAttribute("content") === "true");
  }

  function disableAnalytics() {
    // Tells any already-loaded gtag to stop sending hits from this page.
    window["ga-disable-" + GA_ID] = true;
  }

  function removeAnalyticsCookies() {
    var names = [];
    document.cookie.split(";").forEach(function (entry) {
      var name = entry.split("=")[0].trim();
      if (name === "_ga" || name.indexOf("_ga_") === 0) names.push(name);
    });
    if (names.indexOf("_ga") === -1) names.push("_ga");
    names.push("_ga_" + GA_ID.replace(/^G-/, ""));
    var host = location.hostname;
    var domains = [host, "." + host];
    names.forEach(function (name) {
      domains.forEach(function (domain) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + domain;
      });
      document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    });
  }

  function loadAnalytics() {
    if (!analyticsEnabledOnPage()) return;
    if (window["ga-disable-" + GA_ID]) return;
    if (document.getElementById("gap-ga-loader")) return;
    var script = document.createElement("script");
    script.async = true;
    script.id = "gap-ga-loader";
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }

  var banner = null;

  function hideBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function choose(value) {
    setChoice(value);
    hideBanner();
    if (value === "accepted") {
      loadAnalytics();
    } else {
      disableAnalytics();
      removeAnalyticsCookies();
    }
  }

  function showBanner() {
    if (banner) return;
    banner = document.createElement("div");
    banner.className = "consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie consent");

    var text = document.createElement("p");
    text.innerHTML = 'We would like to use Google Analytics on a few pages of this site to understand how it is used. ' +
      'It sets cookies and loads only if you accept. See our <a href="/privacy">Privacy page</a>.';
    banner.appendChild(text);

    var choices = document.createElement("div");
    choices.className = "consent-choices";

    var reject = document.createElement("button");
    reject.type = "button";
    reject.className = "consent-btn consent-reject";
    reject.textContent = "Reject";
    reject.addEventListener("click", function () { choose("rejected"); });

    var accept = document.createElement("button");
    accept.type = "button";
    accept.className = "consent-btn consent-accept";
    accept.textContent = "Accept";
    accept.addEventListener("click", function () { choose("accepted"); });

    choices.appendChild(reject);
    choices.appendChild(accept);
    banner.appendChild(choices);
    document.body.appendChild(banner);
  }

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest
      ? event.target.closest("[data-cookie-settings]") : null;
    if (target) {
      event.preventDefault();
      showBanner();
    }
  });

  var choice = getChoice();
  if (choice === "accepted") {
    loadAnalytics();
  } else if (choice === "rejected") {
    disableAnalytics();
    removeAnalyticsCookies();
  } else {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showBanner);
    } else {
      showBanner();
    }
  }
})();
