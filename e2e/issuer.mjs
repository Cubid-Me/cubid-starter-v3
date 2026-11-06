import { createHash, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { createServer } from "node:http";

// Loopback-only test fixture. It does not authenticate a real Cubid account.
const issuer = "http://127.0.0.1:4302";
const callback = "http://127.0.0.1:4301/api/cubid/siwc/callback";
const clientId = "starter-e2e";
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: "e2e",
  alg: "RS256",
  use: "sig",
};
const approvals = new Map();
const codes = new Map();
const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const subject = "test-pairwise-subject";
const accessToken = "fixture-access-token-not-for-display";

function jwt(claims, invalidSignature) {
  const input = `${encode({ alg: "RS256", kid: jwk.kid })}.${encode(claims)}`;
  const signature = sign("RSA-SHA256", Buffer.from(input), privateKey);
  if (invalidSignature) signature[0] ^= 1;
  return `${input}.${signature.toString("base64url")}`;
}

createServer(async (request, response) => {
  const url = new URL(request.url, issuer);
  const json = (value, status = 200) => {
    response.writeHead(status, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify(value));
  };

  if (url.pathname === "/.well-known/openid-configuration") {
    return json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/jwks`,
      code_challenge_methods_supported: ["S256"],
      response_types_supported: ["code"],
      id_token_signing_alg_values_supported: ["RS256"],
    });
  }
  if (url.pathname === "/jwks") return json({ keys: [jwk] });
  if (url.pathname === "/authorize") {
    const params = url.searchParams;
    if (
      params.get("redirect_uri") !== callback ||
      params.get("client_id") !== clientId ||
      params.get("response_type") !== "code" ||
      params.get("code_challenge_method") !== "S256" ||
      !params.get("nonce") ||
      !params.get("state") ||
      !params.get("code_challenge")
    ) {
      return json({ error: "invalid_request" }, 400);
    }
    const approval = randomUUID();
    approvals.set(approval, params);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(
      `<!doctype html><title>Test issuer</title><a href="/approve?id=${approval}">Approve test sign-in</a>`,
    );
    return;
  }
  if (url.pathname === "/approve") {
    const id = url.searchParams.get("id");
    const params = approvals.get(id);
    approvals.delete(id);
    if (!params) return json({ error: "invalid_request" }, 400);
    const code = randomUUID();
    codes.set(code, params);
    const target = new URL(callback);
    target.searchParams.set("code", code);
    target.searchParams.set("state", params.get("state"));
    target.searchParams.set("iss", issuer);
    response.writeHead(302, { location: target.href }).end();
    return;
  }
  if (url.pathname === "/token" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 8192) return json({ error: "invalid_request" }, 400);
    }
    const form = new URLSearchParams(body);
    const code = form.get("code");
    const params = codes.get(code);
    codes.delete(code);
    const challenge = createHash("sha256")
      .update(form.get("code_verifier") ?? "")
      .digest("base64url");
    if (
      !params ||
      challenge !== params.get("code_challenge") ||
      form.get("client_id") !== clientId ||
      form.get("redirect_uri") !== callback ||
      form.get("grant_type") !== "authorization_code"
    ) {
      return json({ error: "invalid_grant" }, 400);
    }
    const now = Math.floor(Date.now() / 1000);
    const lifetime = params.get("prompt") === "login" ? 5 : 300;
    return json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: lifetime,
      scope: params.get("scope"),
      id_token: jwt(
        {
          iss: issuer,
          aud: clientId,
          sub: subject,
          nonce: params.get("nonce"),
          iat: now,
          exp: now + lifetime,
          email: "private-fixture@example.test",
          acr: "urn:cubid:acr:passkey",
        },
        params.get("prompt") === "consent",
      ),
    });
  }
  if (
    url.pathname === "/userinfo" &&
    request.headers.authorization === `Bearer ${accessToken}`
  ) {
    return json({
      sub: subject,
      email: "private-fixture@example.test",
      name: "Private Fixture",
    });
  }
  return json({ error: "not_found" }, 404);
}).listen(4302, "127.0.0.1");
