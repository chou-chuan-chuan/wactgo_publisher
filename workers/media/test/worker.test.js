import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

const objectKey = "periodicals/2025-2月(星際).jpg";
const cacheControl = "public, max-age=3600, s-maxage=86400";

function createMediaBinding() {
  return {
    async get(key) {
      if (key !== objectKey) {
        return null;
      }

      return {
        body: "jpeg-data",
        httpEtag: '"test-etag"',
        writeHttpMetadata(headers) {
          headers.set("Content-Type", "image/jpeg");
        }
      };
    }
  };
}

function request(path, init) {
  return worker.fetch(
    new Request(`https://wactgo-media.example${path}`, init),
    { MEDIA: createMediaBinding() }
  );
}

test("GET returns a valid periodicals object", async () => {
  const response = await request(`/${encodeURIComponent(objectKey).replaceAll("%2F", "/")}`);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "jpeg-data");
});

test("HEAD returns metadata without a body", async () => {
  const response = await request(`/${objectKey}`, { method: "HEAD" });

  assert.equal(response.status, 200);
  assert.equal(response.body, null);
});

test("GET returns 404 for a missing object", async () => {
  const response = await request("/periodicals/missing.jpg");

  assert.equal(response.status, 404);
});

test("GET returns 404 outside the periodicals prefix", async () => {
  const response = await request("/private/image.jpg");

  assert.equal(response.status, 404);
});

test("POST returns 405 and advertises allowed methods", async () => {
  const response = await request(`/${objectKey}`, { method: "POST" });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("Allow"), "GET, HEAD");
});

test("object Content-Type metadata is returned", async () => {
  const response = await request(`/${objectKey}`);

  assert.equal(response.headers.get("Content-Type"), "image/jpeg");
});

test("responses include the production cache policy", async () => {
  const response = await request(`/${objectKey}`);

  assert.equal(response.headers.get("Cache-Control"), cacheControl);
});
