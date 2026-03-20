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

export interface ExtensionsStoreDeepLinkResult {
  handled: true;
  kind: "extensions-store";
  author?: string;
  extensionSlug?: string;
}

export interface ExtensionsCommandDeepLinkResult {
  handled: true;
  kind: "extensions-command";
  ownerOrAuthor: string;
  extensionName: string;
  commandName: string;
}

export type ParsedRaycastDeepLinkResult =
  | OauthDeepLinkSuccessResult
  | OauthDeepLinkErrorResult
  | ExtensionsStoreDeepLinkResult
  | ExtensionsCommandDeepLinkResult
  | OauthDeepLinkIgnoredResult;

export function parseOauthDeepLink(url: string): ParsedOauthDeepLinkResult {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return { handled: false };
  }

  const isRaycastScheme = urlObj.protocol === "raycast:";
  const isBeamScheme = urlObj.protocol === "beam:";
  const isRaycastRedirect =
    (urlObj.protocol === "https:" || urlObj.protocol === "http:") &&
    urlObj.hostname === "raycast.com" &&
    urlObj.pathname.startsWith("/redirect");

  if (!isRaycastScheme && !isBeamScheme && !isRaycastRedirect) {
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

export function parseRaycastDeepLink(url: string): ParsedRaycastDeepLinkResult {
  const oauth = parseOauthDeepLink(url);
  if (oauth.handled) {
    return oauth;
  }

  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return { handled: false };
  }

  const isRaycastScheme = urlObj.protocol === "raycast:";
  const isBeamScheme = urlObj.protocol === "beam:";
  const isRaycastDomain =
    (urlObj.protocol === "https:" || urlObj.protocol === "http:") &&
    urlObj.hostname === "raycast.com";

  if (!isRaycastScheme && !isBeamScheme && !isRaycastDomain) {
    return { handled: false };
  }

  const routeHost =
    isRaycastScheme || isBeamScheme ? urlObj.host : urlObj.pathname.split("/").filter(Boolean)[0];
  if (routeHost !== "extensions") {
    return { handled: false };
  }

  const pathParts = (
    isRaycastScheme || isBeamScheme
      ? urlObj.pathname.split("/")
      : urlObj.pathname.replace(/^\/extensions/, "").split("/")
  )
    .filter((segment) => segment.trim().length > 0)
    .map((segment) => decodeURIComponent(segment.trim()));

  if (pathParts.length === 0) {
    return {
      handled: true,
      kind: "extensions-store",
    };
  }

  if (pathParts.length === 2) {
    return {
      handled: true,
      kind: "extensions-store",
      author: pathParts[0],
      extensionSlug: pathParts[1],
    };
  }

  if (pathParts.length >= 3) {
    return {
      handled: true,
      kind: "extensions-command",
      ownerOrAuthor: pathParts[0],
      extensionName: pathParts[1],
      commandName: pathParts[2],
    };
  }

  return { handled: false };
}
