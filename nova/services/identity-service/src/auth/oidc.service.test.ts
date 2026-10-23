/** Tests for the OIDC service with PKCE. */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { OidcService } from "./oidc.service.js";
import { OidcStateStore } from "./oidc-state.store.js";
import { SessionService } from "../session/session.service.js";
import { SessionRepository } from "../session/session.repository.js";
import { UserRepository } from "../account/user.repository.js";
import { ConfigService } from "@nestjs/config";

describe("oidc service", () => {
  let pool: Pool;
  let oidcService: OidcService;
  let stateStore: OidcStateStore;
  let sessionRepo: SessionRepository;
  let sessionService: SessionService;
  let userRepo: UserRepository;
  let config: ConfigService;

  before(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    stateStore = new OidcStateStore(pool);
    sessionRepo = new SessionRepository(pool);
    sessionService = new SessionService(
      sessionRepo,
      pool,
      "test-secret-at-least-32-bytes-long",
      3600
    );
    userRepo = new UserRepository(pool);
    config = new ConfigService();
    config.set("GOOGLE_CLIENT_ID", "test-google-client-id");
    config.set("GOOGLE_CLIENT_SECRET", "test-google-client-secret");
    config.set("GITHUB_CLIENT_ID", "test-github-client-id");
    config.set("GITHUB_CLIENT_SECRET", "test-github-client-secret");
    config.set("FRONTEND_URL", "http://localhost:3000");
    oidcService = new OidcService(config, stateStore, sessionService, userRepo, pool);
  });

  after(async () => {
    await pool.end();
  });

  it("getAuthorizationUrl returns URL with PKCE challenge", async () => {
    const { url, state, codeVerifier } = await oidcService.getAuthorizationUrl("google", "http://localhost:3000/callback");

    assert.ok(url.startsWith("https://accounts.google.com/o/oauth2/v2/auth?"));
    assert.ok(state.length > 0);
    assert.ok(codeVerifier.length >= 43); // PKCE verifier min length

    const params = new URL(url).searchParams;
    assert.strictEqual(params.get("code_challenge_method"), "S256");
    const challenge = params.get("code_challenge");
    assert.ok(challenge !== null && challenge.length > 0);
    assert.strictEqual(params.get("state"), state);
    assert.strictEqual(params.get("redirect_uri"), "http://localhost:3000/callback");
    assert.strictEqual(params.get("response_type"), "code");
    assert.ok(params.get("scope")?.includes("openid"));
  });

  it("getAuthorizationUrl stores state with PKCE verifier and nonce", async () => {
    const { state } = await oidcService.getAuthorizationUrl("google", "http://localhost:3000/callback");

    const record = await stateStore.find(state);
    assert.ok(record);
    assert.strictEqual(record.provider, "google");
    assert.ok(record.code_verifier.length > 0);
    assert.ok(record.nonce.length > 0);
    assert.strictEqual(record.redirect_uri, "http://localhost:3000/callback");
    assert.strictEqual(record.consumed_at, null);
  });

  it("consume state returns record and marks consumed", async () => {
    const { state } = await oidcService.getAuthorizationUrl("github", "http://localhost:3000/callback");

    const record = await stateStore.consume(state);
    assert.ok(record);
    assert.strictEqual(record.state, state);
    assert.strictEqual(record.provider, "github");
    assert.ok(record.consumed_at instanceof Date);
  });

  it("replay of state fails (state can only be consumed once)", async () => {
    const { state } = await oidcService.getAuthorizationUrl("google", "http://localhost:3000/callback");

    // First consumption succeeds
    const first = await stateStore.consume(state);
    assert.ok(first);

    // Second consumption fails (state already consumed)
    const second = await stateStore.consume(state);
    assert.strictEqual(second, null);
  });

  it("expired state cannot be consumed", async () => {
    const { state } = await oidcService.getAuthorizationUrl("google", "http://localhost:3000/callback");

    // Manually expire the state
    await pool.query(
      `UPDATE identity_service.oidc_states SET expires_at = NOW() - INTERVAL '1 minute' WHERE state = $1`,
      [state]
    );

    const result = await stateStore.consume(state);
    assert.strictEqual(result, null);
  });

  it("exchangeCode validates state and provider", async () => {
    const { state } = await oidcService.getAuthorizationUrl("google", "http://localhost:3000/callback");

    // Consume state first (simulating successful auth)
    await stateStore.consume(state);

    // Exchange code with wrong provider should fail
    await assert.rejects(
      oidcService.exchangeCode("github", "auth-code", state, "http://localhost:3000/callback"),
      /Provider mismatch/
    );
  });

  it("exchangeCode with invalid state fails", async () => {
    await assert.rejects(
      oidcService.exchangeCode("google", "auth-code", "invalid-state", "http://localhost:3000/callback"),
      /Invalid or expired state/
    );
  });

  it("generatePkce creates verifier and challenge pair", () => {
    const { verifier, challenge } = sessionService.generatePkce();

    assert.ok(verifier.length >= 43); // RFC 7636: 43-128 chars
    assert.ok(verifier.length <= 128);
    assert.ok(challenge.length > 0);
    // Challenge should be base64url encoded SHA256 of verifier
    const expectedChallenge = createHash("sha256").update(verifier).digest("base64url");
    assert.strictEqual(challenge, expectedChallenge);
  });

  it("generateState creates unique values", () => {
    const states = new Set<string>();
    for (let i = 0; i < 100; i++) {
      states.add(sessionService.generateState());
    }
    assert.strictEqual(states.size, 100);
  });
});