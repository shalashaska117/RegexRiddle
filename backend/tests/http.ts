// Cookie-jar wrapper around fetch for the API tests. Reads TEST_BASE_URL,
// which tests/run.ts sets after binding the app to an ephemeral port.

export interface ApiResponse {
  status: number;
  body: unknown;
  setCookies: string[];
}

export interface BytesResponse {
  status: number;
  contentType: string | null;
  bytes: Buffer;
}

export class HttpClient {
  private readonly jar = new Map<string, string>();

  private baseUrl(): string {
    const base = process.env.TEST_BASE_URL;
    if (!base) {
      throw new Error("TEST_BASE_URL is not set; run via npm run test:api");
    }
    return base;
  }

  private cookieHeader(): Record<string, string> {
    if (this.jar.size === 0) {
      return {};
    }
    return { cookie: [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ") };
  }

  private storeCookies(setCookies: string[]): void {
    for (const line of setCookies) {
      const pair = line.split(";", 1)[0] ?? "";
      const eq = pair.indexOf("=");
      if (eq < 1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      // an empty value is how the server clears a cookie
      if (value === "") {
        this.jar.delete(name);
      } else {
        this.jar.set(name, value);
      }
    }
  }

  private async toApiResponse(res: Response): Promise<ApiResponse> {
    const setCookies = res.headers.getSetCookie();
    this.storeCookies(setCookies);
    const text = await res.text();
    return {
      status: res.status,
      body: text === "" ? null : JSON.parse(text),
      setCookies,
    };
  }

  async request(method: string, path: string, body?: unknown): Promise<ApiResponse> {
    const headers: Record<string, string> = this.cookieHeader();
    let payload: string | undefined;
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(this.baseUrl() + path, { method, headers, body: payload });
    return this.toApiResponse(res);
  }

  get(path: string): Promise<ApiResponse> {
    return this.request("GET", path);
  }

  post(path: string, body?: unknown): Promise<ApiResponse> {
    return this.request("POST", path, body);
  }

  patch(path: string, body?: unknown): Promise<ApiResponse> {
    return this.request("PATCH", path, body);
  }

  // multipart PUT with a single file field; fetch derives the multipart
  // boundary from the FormData
  async putFile(
    path: string,
    field: string,
    filename: string,
    contentType: string,
    data: Buffer,
  ): Promise<ApiResponse> {
    const form = new FormData();
    form.append(field, new Blob([data], { type: contentType }), filename);
    const res = await fetch(this.baseUrl() + path, {
      method: "PUT",
      headers: this.cookieHeader(),
      body: form,
    });
    return this.toApiResponse(res);
  }

  // raw bytes, for responses that are not JSON (the avatar image)
  async getBytes(path: string): Promise<BytesResponse> {
    const res = await fetch(this.baseUrl() + path, { headers: this.cookieHeader() });
    return {
      status: res.status,
      contentType: res.headers.get("content-type"),
      bytes: Buffer.from(await res.arrayBuffer()),
    };
  }
}
