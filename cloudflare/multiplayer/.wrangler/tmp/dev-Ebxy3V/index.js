var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-DPy4v7/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/playerUtils.ts
var sanitizeName = /* @__PURE__ */ __name((value) => {
  const trimmed = (value ?? "").trim().slice(0, 32);
  const display = trimmed || "Guest";
  const slug = display.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return {
    id: slug || `guest_${crypto.randomUUID().slice(0, 6)}`,
    display
  };
}, "sanitizeName");

// src/leaderboardRoom.ts
var PROFILE_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};
var GIFT_HISTORY_LIMIT = 24;
var normalizeUnlocked = /* @__PURE__ */ __name((input) => {
  if (!Array.isArray(input)) return [];
  const seen = /* @__PURE__ */ new Set();
  return input.reduce((result, item) => {
    if (typeof item !== "string") return result;
    const trimmed = item.trim();
    if (!trimmed) return result;
    if (seen.has(trimmed)) return result;
    seen.add(trimmed);
    result.push(trimmed);
    return result;
  }, []);
}, "normalizeUnlocked");
var LeaderboardRoom = class {
  constructor(state) {
    this.state = state;
    this.players = /* @__PURE__ */ new Map();
    this.gifts = [];
    this.sockets = /* @__PURE__ */ new Map();
    this.connectionMeta = /* @__PURE__ */ new Map();
    this.nextConnectionId = 0;
    this.ready = this.bootstrap();
  }
  static {
    __name(this, "LeaderboardRoom");
  }
  async bootstrap() {
    const stored = await this.state.storage.get(["players", "gifts"]);
    const storedPlayers = stored.get("players");
    const storedGifts = stored.get("gifts");
    let shouldPersist = false;
    const players = Object.entries(storedPlayers ?? {}).map(
      ([id, player]) => {
        const hasPlayed = typeof player.hasPlayed === "boolean" ? player.hasPlayed : true;
        if (typeof player.hasPlayed !== "boolean") {
          shouldPersist = true;
        }
        return [id, { ...player, hasPlayed }];
      }
    );
    this.players = new Map(players);
    this.gifts = storedGifts ?? [];
    if (shouldPersist) {
      await this.persistState();
    }
  }
  async persistState() {
    await Promise.all([
      this.state.storage.put("players", Object.fromEntries(this.players)),
      this.state.storage.put("gifts", this.gifts)
    ]);
  }
  getLeaderboardSnapshot() {
    const snapshot = Array.from(this.players.values()).filter((player) => player.hasPlayed);
    snapshot.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
    });
    return snapshot;
  }
  broadcast(payload) {
    for (const socket of this.sockets.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        this.sendToSocket(socket, payload);
      }
    }
  }
  sendToSocket(socket, payload) {
    try {
      socket.send(JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to send leaderboard payload", error);
    }
  }
  sendError(socket, message) {
    this.sendToSocket(socket, { type: "error", message });
  }
  ensurePlayer(playerId, name) {
    const existing = this.players.get(playerId);
    if (existing) {
      existing.name = name;
      return existing;
    }
    const entry = {
      id: playerId,
      name,
      score: 0,
      giftsSent: 0,
      giftsReceived: 0,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      unlockedIds: [],
      hasPlayed: false
    };
    this.players.set(playerId, entry);
    return entry;
  }
  updatePlayerScore(playerId, name, score) {
    const normalized = Math.max(0, Math.floor(score ?? 0));
    const entry = this.ensurePlayer(playerId, name);
    entry.hasPlayed = true;
    entry.score = Math.max(entry.score, normalized);
    entry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    this.players.set(playerId, entry);
    return entry;
  }
  incrementGiftCounter(playerId, name, field) {
    const entry = this.ensurePlayer(playerId, name);
    entry[field] += 1;
    entry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    this.players.set(playerId, entry);
    return entry;
  }
  syncUnlocked(playerId, name, unlocked) {
    const normalized = normalizeUnlocked(unlocked);
    if (!normalized.length) return;
    const entry = this.ensurePlayer(playerId, name);
    const current = new Set(entry.unlockedIds);
    let merged = false;
    normalized.forEach((value) => {
      if (!current.has(value)) {
        current.add(value);
        merged = true;
      }
    });
    if (!merged) {
      return entry;
    }
    entry.unlockedIds = Array.from(current);
    entry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    this.players.set(playerId, entry);
    return entry;
  }
  removeUnlocked(playerId, name, unlockedId) {
    if (!unlockedId) return;
    const entry = this.ensurePlayer(playerId, name);
    if (!entry.unlockedIds.includes(unlockedId)) {
      return entry;
    }
    entry.unlockedIds = entry.unlockedIds.filter((value) => value !== unlockedId);
    entry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    this.players.set(playerId, entry);
    return entry;
  }
  async updateProfilePicture(name, key) {
    const trimmedKey = key?.trim();
    if (!trimmedKey) return null;
    const normalized = sanitizeName(name);
    const entry = this.ensurePlayer(normalized.id, normalized.display);
    if (entry.profilePictureKey === trimmedKey) {
      return entry;
    }
    entry.profilePictureKey = trimmedKey;
    entry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    this.players.set(normalized.id, entry);
    await this.persistState();
    this.broadcast({ type: "leaderboard_update", players: this.getLeaderboardSnapshot() });
    return entry;
  }
  sendSnapshot(socket) {
    this.sendToSocket(socket, {
      type: "leaderboard_snapshot",
      players: this.getLeaderboardSnapshot(),
      gifts: this.gifts
    });
  }
  handleMessage(connectionId, message, socket) {
    switch (message.type) {
      case "join":
        this.handleJoin(connectionId, message, socket);
        break;
      case "score_update":
        this.handleScoreUpdate(connectionId, message, socket);
        break;
      case "send_gift":
        this.handleGift(connectionId, message, socket);
        break;
      default:
        this.sendError(socket, "Unsupported message");
    }
  }
  async handleJoin(connectionId, payload, socket) {
    const trimmed = payload.name?.trim();
    if (!trimmed) {
      this.sendError(socket, "Name is required to join the parade");
      return;
    }
    const normalized = sanitizeName(trimmed);
    const meta = this.connectionMeta.get(connectionId);
    if (!meta) return;
    meta.playerId = normalized.id;
    meta.playerName = normalized.display;
    this.updatePlayerScore(normalized.id, normalized.display, payload.score ?? 0);
    this.syncUnlocked(normalized.id, normalized.display, payload.unlocked);
    await this.persistState();
    this.sendToSocket(socket, {
      type: "connected",
      player: this.players.get(normalized.id)
    });
    this.sendSnapshot(socket);
    this.broadcast({ type: "leaderboard_update", players: this.getLeaderboardSnapshot() });
  }
  async handleScoreUpdate(connectionId, payload, socket) {
    const meta = this.connectionMeta.get(connectionId);
    if (!meta?.playerId || !meta.playerName) {
      this.sendError(socket, "Join the leaderboard before updating a score");
      return;
    }
    this.updatePlayerScore(meta.playerId, meta.playerName, payload.score);
    this.syncUnlocked(meta.playerId, meta.playerName, payload.unlocked);
    await this.persistState();
    this.broadcast({ type: "leaderboard_update", players: this.getLeaderboardSnapshot() });
  }
  async handleGift(connectionId, payload, socket) {
    const meta = this.connectionMeta.get(connectionId);
    if (!meta?.playerId || !meta.playerName) {
      this.sendError(socket, "Set your name before sending gifts");
      return;
    }
    const target = payload.to?.trim();
    if (!target) {
      this.sendError(socket, "Choose someone to gift");
      return;
    }
    const targetIdentity = sanitizeName(target);
    this.incrementGiftCounter(meta.playerId, meta.playerName, "giftsSent");
    this.incrementGiftCounter(targetIdentity.id, targetIdentity.display, "giftsReceived");
    const squishId = payload.squish?.id?.trim();
    const squishName = payload.squish?.name?.trim();
    const squishImage = payload.squish?.image?.trim();
    if (squishId) {
      this.removeUnlocked(meta.playerId, meta.playerName, squishId);
      this.syncUnlocked(targetIdentity.id, targetIdentity.display, [squishId]);
    }
    const gift = {
      id: crypto.randomUUID(),
      from: meta.playerName,
      to: targetIdentity.display,
      message: payload.message?.trim() || "A little surprise from the parade",
      type: payload.giftType || "sparkles",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      squishId: squishId || void 0,
      squishName: squishName || void 0,
      squishImage: squishImage || void 0
    };
    this.gifts.unshift(gift);
    if (this.gifts.length > GIFT_HISTORY_LIMIT) {
      this.gifts = this.gifts.slice(0, GIFT_HISTORY_LIMIT);
    }
    await this.persistState();
    this.broadcast({ type: "gift_event", gift });
    this.broadcast({ type: "leaderboard_update", players: this.getLeaderboardSnapshot() });
  }
  buildProfileHeaders() {
    return {
      "Content-Type": "application/json",
      ...PROFILE_CORS_HEADERS
    };
  }
  jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: this.buildProfileHeaders()
    });
  }
  handleNamesRequest(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: PROFILE_CORS_HEADERS });
    }
    if (request.method !== "GET") {
      return this.jsonResponse({ error: "Method not allowed" }, 405);
    }
    const names = Array.from(this.players.values()).map((player) => player.name).filter(Boolean);
    return this.jsonResponse({ names });
  }
  async handleProfileRequest(request, url) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: PROFILE_CORS_HEADERS });
    }
    if (request.method === "GET") {
      const nameParam = url.searchParams.get("name")?.trim();
      if (!nameParam) {
        return this.jsonResponse({ error: "Name query parameter is required" }, 400);
      }
      const normalized = sanitizeName(nameParam);
      const existing = this.players.get(normalized.id);
      return this.jsonResponse(
        {
          name: normalized.display,
          profilePictureKey: existing?.profilePictureKey ?? null
        },
        200
      );
    }
    if (request.method === "POST") {
      let payload = null;
      try {
        payload = await request.json();
      } catch {
        return this.jsonResponse({ error: "Invalid JSON payload" }, 400);
      }
      const nameValue = payload?.name?.trim();
      const keyValue = payload?.profilePictureKey?.trim();
      if (!nameValue || !keyValue) {
        return this.jsonResponse({ error: "Name and profilePictureKey are required" }, 400);
      }
      const updated = await this.updateProfilePicture(nameValue, keyValue);
      if (!updated) {
        return this.jsonResponse({ error: "Unable to save profile picture" }, 400);
      }
      return this.jsonResponse({ player: updated }, 200);
    }
    return this.jsonResponse({ error: "Method not allowed" }, 405);
  }
  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = pair;
      this.handleConnection(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname === "/names") {
      return this.handleNamesRequest(request);
    }
    if (url.pathname === "/profile") {
      return this.handleProfileRequest(request, url);
    }
    return new Response("LeaderboardRoom is ready", { status: 200 });
  }
  handleConnection(socket) {
    socket.accept();
    const connectionId = ++this.nextConnectionId;
    this.sockets.set(connectionId, socket);
    this.connectionMeta.set(connectionId, {});
    const cleanup = /* @__PURE__ */ __name(() => {
      this.sockets.delete(connectionId);
      this.connectionMeta.delete(connectionId);
    }, "cleanup");
    socket.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(connectionId, message, socket);
        } catch {
          this.sendError(socket, "Invalid JSON payload");
        }
      }
    });
    socket.addEventListener("close", cleanup);
    socket.addEventListener("error", cleanup);
    this.sendSnapshot(socket);
  }
};

// src/index.ts
var DEFAULT_ROOM = "memorygame";
var PROFILE_PATH = "/profile";
var PROFILE_PICTURE_PATH = "/profile-picture";
var PROFILE_PICTURE_DOWNLOAD_PREFIX = `${PROFILE_PICTURE_PATH}/`;
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};
var getRoomName = /* @__PURE__ */ __name((request) => {
  const url = new URL(request.url);
  return url.searchParams.get("room")?.trim().toLowerCase() || DEFAULT_ROOM;
}, "getRoomName");
var buildJsonResponse = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json",
    ...CORS_HEADERS
  }
}), "buildJsonResponse");
var getFileExtension = /* @__PURE__ */ __name((mimeType) => {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}, "getFileExtension");
var persistProfileKey = /* @__PURE__ */ __name(async (env, room, name, key) => {
  const durableId = env.LEADERBOARD_DO.idFromName(room);
  const stub = env.LEADERBOARD_DO.get(durableId);
  try {
    const response = await stub.fetch(
      new Request("https://leaderboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, profilePictureKey: key })
      })
    );
    if (!response.ok) {
      const text = await response.text();
      console.warn("Failed to persist profile metadata", response.status, text);
    }
  } catch (error) {
    console.warn("Failed to persist profile metadata", error);
  }
}, "persistProfileKey");
var handleProfilePictureUpload = /* @__PURE__ */ __name(async (request, env) => {
  if (!env.PROFILE_PICS) {
    return buildJsonResponse({ error: "Profile storage is not configured" }, 500);
  }
  const formData = await request.formData();
  const rawName = formData.get("name")?.trim();
  const imageField = formData.get("image");
  if (!rawName || !(imageField instanceof File)) {
    return buildJsonResponse({ error: "Both name and image file are required" }, 400);
  }
  const { id, display } = sanitizeName(rawName);
  const extension = getFileExtension(imageField.type);
  const timestamp = Date.now();
  const key = `profiles/${id}/${timestamp}.${extension}`;
  await env.PROFILE_PICS.put(key, imageField.stream(), {
    httpMetadata: { contentType: imageField.type || "image/png" }
  });
  await persistProfileKey(env, getRoomName(request), display, key);
  return buildJsonResponse({ profilePictureKey: key });
}, "handleProfilePictureUpload");
var handleProfilePictureRequest = /* @__PURE__ */ __name(async (request, env) => {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method === "POST" && url.pathname === PROFILE_PICTURE_PATH) {
    return handleProfilePictureUpload(request, env);
  }
  if (request.method === "GET" && url.pathname.startsWith(PROFILE_PICTURE_DOWNLOAD_PREFIX)) {
    const key = decodeURIComponent(url.pathname.slice(PROFILE_PICTURE_DOWNLOAD_PREFIX.length));
    if (!key) {
      return buildJsonResponse({ error: "Missing profile key" }, 400);
    }
    if (!env.PROFILE_PICS) {
      return buildJsonResponse({ error: "Profile storage is not configured" }, 500);
    }
    const stored = await env.PROFILE_PICS.get(key);
    if (!stored || !stored.body) {
      return new Response("Not found", { status: 404, headers: CORS_HEADERS });
    }
    const headers = new Headers({
      ...CORS_HEADERS,
      "Content-Type": stored.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=3600"
    });
    return new Response(stored.body, { status: 200, headers });
  }
  if (request.method === "GET" && url.pathname === PROFILE_PICTURE_PATH) {
    return buildJsonResponse({ error: "Profile key is required" }, 400);
  }
  return buildJsonResponse({ error: "Not found" }, 404);
}, "handleProfilePictureRequest");
var forwardProfileRequest = /* @__PURE__ */ __name((request, env) => {
  const room = getRoomName(request);
  const durableId = env.LEADERBOARD_DO.idFromName(room);
  const stub = env.LEADERBOARD_DO.get(durableId);
  return stub.fetch(request);
}, "forwardProfileRequest");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("Memory Game multiplayer worker is healthy", {
        status: 200
      });
    }
    if (url.pathname === PROFILE_PATH) {
      return forwardProfileRequest(request, env);
    }
    if (url.pathname === "/names") {
      return forwardProfileRequest(request, env);
    }
    if (url.pathname === "/ws") {
      const room = getRoomName(request);
      const durableId = env.LEADERBOARD_DO.idFromName(room);
      const stub = env.LEADERBOARD_DO.get(durableId);
      return stub.fetch(request);
    }
    if (url.pathname.startsWith(PROFILE_PICTURE_PATH)) {
      return handleProfilePictureRequest(request, env);
    }
    return new Response("Not found", { status: 404 });
  }
};

// ../../../../.nvm/versions/node/v23.7.0/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../.nvm/versions/node/v23.7.0/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-DPy4v7/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../.nvm/versions/node/v23.7.0/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-DPy4v7/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  LeaderboardRoom,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
