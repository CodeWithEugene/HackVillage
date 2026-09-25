import { describe, expect, it } from "vitest";

import {
  isOAuthPopupMessage,
  OAUTH_POPUP_NAME,
  parseOAuthProvider,
  popupFeatures,
} from "@/lib/auth/oauth-popup";

describe("parseOAuthProvider", () => {
  it("accepts only the providers we support", () => {
    expect(parseOAuthProvider("google")).toBe("google");
    expect(parseOAuthProvider("github")).toBe("github");
    expect(parseOAuthProvider("credentials")).toBeNull();
    expect(parseOAuthProvider(null)).toBeNull();
  });
});

describe("popupFeatures", () => {
  it("centers a 500 by 640 window over the current one", () => {
    const features = popupFeatures({ screenX: 100, screenY: 50, outerWidth: 1500, outerHeight: 900 });
    expect(features).toBe("popup=yes,width=500,height=640,left=600,top=180");
  });

  it("never places the window off screen", () => {
    expect(popupFeatures({ screenX: 0, screenY: 0, outerWidth: 300, outerHeight: 300 })).toBe(
      "popup=yes,width=500,height=640,left=0,top=0"
    );
  });
});

describe("isOAuthPopupMessage", () => {
  it("recognises our success and error messages", () => {
    expect(isOAuthPopupMessage({ type: OAUTH_POPUP_NAME, status: "success" })).toBe(true);
    expect(isOAuthPopupMessage({ type: OAUTH_POPUP_NAME, status: "error", error: "AccessDenied" })).toBe(true);
  });

  it("ignores anything else posted to the window", () => {
    expect(isOAuthPopupMessage({ type: "other", status: "success" })).toBe(false);
    expect(isOAuthPopupMessage({ type: OAUTH_POPUP_NAME, status: "maybe" })).toBe(false);
    expect(isOAuthPopupMessage("hello")).toBe(false);
    expect(isOAuthPopupMessage(null)).toBe(false);
  });
});
