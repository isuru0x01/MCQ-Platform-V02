import { NextRequest } from "next/server";
import { POST } from "@/app/api/webhook/lemon/route";
import crypto from 'crypto';
import { Request } from 'node-fetch';

jest.mock('@/lib/supabaseClient', () => ({
  supabaseClient: {
    from: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null })
  }
}));

describe("Lemon Squeezy Webhook", () => {
  const WEBHOOK_SECRET = "ecbNGCjHuX";
  process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = WEBHOOK_SECRET;

  it("should return 401 for invalid signature", async () => {
    const payload = JSON.stringify({ meta: { event_name: "subscription_updated" } });
    const req = new NextRequest("http://localhost:3000", {
      method: "POST",
      headers: { "X-Signature": "invalid-signature" },
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should handle subscription_updated event", async () => {
    const payload = JSON.stringify({
      meta: { event_name: "subscription_updated", custom_data: { userId: "user_123" } },
      data: { attributes: { status: "active", renews_at: "2025-04-04T06:30:44.000000Z" } },
    });

    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
    const req = new NextRequest(new Request("http://localhost:3000", {
      method: "POST",
      headers: { "X-Signature": hmac },
      body: payload,
    }) as unknown as Request);

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("should handle unknown event type", async () => {
    const payload = JSON.stringify({ meta: { event_name: "unknown_event" } });
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
    const req = new NextRequest(new Request("http://localhost:3000", {
      method: "POST",
      headers: { "X-Signature": hmac },
      body: payload,
    }) as unknown as Request);

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe("Unhandled event type");
  });
}); 