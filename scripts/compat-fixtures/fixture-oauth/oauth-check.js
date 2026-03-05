const { OAuth, showToast } = require("@raycast/api");

module.exports.default = async function oauthCheck() {
  const client = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Fixture OAuth",
  });

  const request = await client.authorizationRequest({
    endpoint: "https://example.com/oauth/authorize",
    clientId: "fixture-client-id",
    scope: "profile",
  });

  const authorization = await client.authorize(request);

  await client.setTokens({
    accessToken: "fixture-access-token",
    refreshToken: "fixture-refresh-token",
    expiresIn: 3600,
    scope: "profile",
  });

  const tokens = await client.getTokens();
  await client.removeTokens();
  const afterRemove = await client.getTokens();

  const summary = {
    authorizationCode: authorization.authorizationCode,
    hasAccessToken: Boolean(tokens && tokens.accessToken === "fixture-access-token"),
    removed: afterRemove == null,
  };

  await showToast({
    title: "Fixture OAuth",
    message: JSON.stringify(summary),
  });

  console.log("[fixture-oauth]", JSON.stringify(summary));
};
