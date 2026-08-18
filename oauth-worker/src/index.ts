export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGIN: string;
}

const STATE_COOKIE = "oauth_state";

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function handleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/callback`;

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "repo,user");
  authorizeUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authorizeUrl.toString(),
      "set-cookie": `${STATE_COOKIE}=${state}; Path=/callback; Max-Age=300; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readCookie(request, STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return htmlResponse("Requête OAuth invalide (state manquant ou incorrect).", 400);
  }

  const redirectUri = `${url.origin}/callback`;
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenResponse.json<{ access_token?: string; error?: string }>();

  if (!tokenData.access_token) {
    return htmlResponse(`Échec de l'authentification GitHub : ${tokenData.error ?? "erreur inconnue"}.`, 400);
  }

  const payload = JSON.stringify({ token: tokenData.access_token, provider: "github" });
  const allowedOrigin = JSON.stringify(env.ALLOWED_ORIGIN);

  // Handshake attendu par Decap CMS : le popup annonce qu'il est prêt, puis
  // répond au message "authorizing:github" envoyé par la fenêtre parente.
  const script = `
    (function () {
      function receiveMessage(message) {
        window.opener.postMessage(
          'authorization:github:success:${payload}',
          ${allowedOrigin}
        );
        window.removeEventListener("message", receiveMessage, false);
      }
      window.addEventListener("message", receiveMessage, false);
      window.opener.postMessage("authorizing:github", ${allowedOrigin});
    })();
  `;

  return htmlResponse(`<!doctype html><html><body><script>${script}</script></body></html>`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      return handleAuth(request, env);
    }
    if (url.pathname === "/callback") {
      return handleCallback(request, env);
    }
    return new Response("template-mairie-cms-auth: OK", { status: 200 });
  },
};
