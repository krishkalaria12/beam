export interface OauthDeepLinkSuccessResult {
  handled: true;
  kind: "success";
  state: string;
  code: string;
}

export interface OauthDeepLinkErrorResult {
  handled: true;
  kind: "error";
  state?: string;
  error: string;
}

export interface OauthDeepLinkIgnoredResult {
  handled: false;
}

export type ParsedOauthDeepLinkResult =
  | OauthDeepLinkSuccessResult
  | OauthDeepLinkErrorResult
  | OauthDeepLinkIgnoredResult;

export function parseOauthDeepLink(url: string): ParsedOauthDeepLinkResult {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return { handled: false };
  }

  const isRaycastScheme = urlObj.protocol === "raycast:";
  const isRaycastRedirect =
    (urlObj.protocol === "https:" || urlObj.protocol === "http:") &&
    urlObj.hostname === "raycast.com" &&
    urlObj.pathname.startsWith("/redirect");

  if (!isRaycastScheme && !isRaycastRedirect) {
    return { handled: false };
  }

  const isOauthCallback = urlObj.host === "oauth" || urlObj.pathname.startsWith("/redirect");
  if (!isOauthCallback) {
    return { handled: false };
  }

  const code = urlObj.searchParams.get("code");
  const state = urlObj.searchParams.get("state");

  if (code && state) {
    return {
      handled: true,
      kind: "success",
      state,
      code,
    };
  }

  const error = urlObj.searchParams.get("error") || "Unknown OAuth error";
  const description = urlObj.searchParams.get("error_description");
  return {
    handled: true,
    kind: "error",
    state: state ?? undefined,
    error: description ? `${error}: ${description}` : error,
  };
}
