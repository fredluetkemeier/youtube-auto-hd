"use strict";

import type { QualityFpsPreferences, VideoFPS, VideoQuality, YouTubeLabel } from "../types";
import { initial } from "./ythd-setup";

export const observerOptions: MutationObserverInit = Object.freeze({ childList: true, subtree: true });
window.ythdLastUserQualities = { ...initial.qualities };

export async function getStorage<T>(storageArea: "local" | "sync", key = null): Promise<T> {
  return new Promise(resolve => {
    chrome.storage[storageArea].get(key, result => {
      resolve(key ? result[key] : result);
    });
  });
}

export function getI18n(id: string, backup = ""): string {
  return (id && chrome.i18n.getMessage(id)) || backup;
}

export enum SELECTORS {
  // Global
  title = "title",
  video = "video",
  // Desktop
  buttonSettings = ".ytp-settings-button",
  pathSizeToggle = `path[d*="m 28,"], path[d*="m 26,"]`,
  optionQuality = ".ytp-settings-menu[data-layer] .ytp-menuitem:last-child",
  menuOption = ".ytp-settings-menu[data-layer] .ytp-menuitem",
  menuOptionContent = ".ytp-menuitem-content",
  panelHeaderBack = ".ytp-panel-header button",
  player = ".html5-video-player",
  donationSection = ".ythd-donation-section",
  relatedVideos = "#secondary-inner",
  // Mobile
  mobileQualityDropdown = "select[id^=player-quality-dropdown]",
  mobileQualityDropdownWrapper = ".player-quality-settings",
  mobileMenuButton = ".mobile-topbar-header-content ytm-menu button",
  mobileOption = "div[role=dialog] ytm-menu-item",
  mobileOkButton = ".dialog-buttons [class*=material-button-button]"
}

export function getVisibleElement<T extends HTMLElement>(elementName: SELECTORS): T {
  const elements = [...document.querySelectorAll(elementName)] as T[];
  return elements.find(isElementVisible);
}

export async function getElementByMutationObserver(
  selector: SELECTORS,
  isVisible = true
): Promise<HTMLElement> {
  return new Promise(resolve => {
    new MutationObserver((_, observer) => {
      const element = isVisible ? getVisibleElement(selector) : document.querySelector<HTMLElement>(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    }).observe(document, observerOptions);
  });
}

// eslint-disable-next-line @typescript-eslint/ban-types
export async function addGlobalEventListener(addTemporaryBodyListener: () => void): Promise<void> {
  // Fires when navigating to another page
  const elTitle =
    document.documentElement.querySelector(SELECTORS.title) ||
    (await getElementByMutationObserver(SELECTORS.title, false));
  new MutationObserver(addTemporaryBodyListener).observe(elTitle, observerOptions);
}

function isElementVisible(element: HTMLElement): boolean {
  return element?.offsetWidth > 0 && element?.offsetHeight > 0;
}

export function getFpsFromRange(qualities: QualityFpsPreferences, fpsToCheck: VideoFPS): VideoFPS {
  const fpsList = Object.keys(qualities)
    .map(Number)
    .sort((a, b) => b - a) as VideoFPS[];
  while (fpsList.length > 1) {
    const fpsCurrent: VideoFPS = fpsList.pop();
    if (fpsToCheck <= fpsCurrent) {
      return fpsCurrent;
    }
  }
  return fpsList[0];
}

export async function getPreferredQualities(): Promise<QualityFpsPreferences> {
  try {
    const userQualities = ((await getStorage("local", "qualities")) ?? {}) as QualityFpsPreferences;
    window.ythdLastUserQualities = { ...initial.qualities, ...userQualities };
    return window.ythdLastUserQualities;
  } catch {
    // Handling "Error: Extension context invalidated"

    // This error typically occurs when the extension updates
    // but the user hasn't refreshed the page, which typically causes
    // the player settings to open when seeking through a video
    return window.ythdLastUserQualities;
  }
}

export function getIQuality(
  qualitiesCurrent: VideoQuality[] | YouTubeLabel[],
  qualityPreferred: VideoQuality | YouTubeLabel
): number {
  return qualitiesCurrent.findIndex((quality: VideoQuality | YouTubeLabel) => quality === qualityPreferred);
}
