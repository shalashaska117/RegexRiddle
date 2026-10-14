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

  /**
   * Reads the test server address from the runner environment.
   * Parameters: none.
   * @returns The base URL, or throws if the runner did not set it.
   */
  private baseUrl(): string {
    const base = process.env.TEST_BASE_URL;
    if (!base) {
      throw new Error("TEST_BASE_URL is not set; run via npm run test:api");
    }
    return base;
  }

  /**
   * Builds the request header from this client's stored cookies.
   * Parameters: none.
   * @returns The Cookie header, or an empty object when the jar is empty.
   */
  private cookieHeader(): Record<string, string> {
    if (this.jar.size === 0) {
      return {};
    }
    return { cookie: [...this.jar.entries()].map(
      /**
       * Formats one stored cookie for the request header.
       * @param entry - Destructured cookie entry: k is its name and v is its value.
       * @param entry.0 - Cookie name bound to k.
       * @param entry.1 - Cookie value bound to v.
       * @returns The cookie as a name=value pair.
       */
      ([k, v]) => `${k}=${v}`
    ).join("; ") };
  }

  /**
   * Applies response cookie updates to this client's jar.
   * @param setCookies - Set-Cookie header values returned by the server.
   * @returns Nothing; updates or removes the stored cookies.
   */
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

  /**
   * Stores response cookies and reads the JSON response body.
   * @param res - Fetch response from the test server.
   * @returns A promise with the status, parsed body and Set-Cookie headers.
   */
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

  /**
   * Sends a request with this client's cookies and an optional JSON body.
   * @param method - HTTP method to send.
   * @param path - API path relative to the test server.
   * @param body - Optional value to serialize as JSON.
   * @returns A promise with the parsed API response after its cookies are stored.
   */
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

  /**
   * Fetches a JSON endpoint using this client's session.
   * @param path - API path relative to the test server.
   * @returns A promise with the parsed API response.
   */
  get(path: string): Promise<ApiResponse> {
    return this.request("GET", path);
  }

  /**
   * Posts an optional JSON body using this client's session.
   * @param path - API path relative to the test server.
   * @param body - Optional value to serialize as JSON.
   * @returns A promise with the parsed API response.
   */
  post(path: string, body?: unknown): Promise<ApiResponse> {
    return this.request("POST", path, body);
  }

  /**
   * Patches an endpoint using this client's session.
   * @param path - API path relative to the test server.
   * @param body - Optional value to serialize as JSON.
   * @returns A promise with the parsed API response.
   */
  patch(path: string, body?: unknown): Promise<ApiResponse> {
    return this.request("PATCH", path, body);
  }

  /**
   * Uploads one file in a multipart PUT request.
   * @param path - API path relative to the test server.
   * @param field - Multipart field name for the file.
   * @param filename - Filename sent with the upload.
   * @param contentType - Declared MIME type of the file.
   * @param data - File bytes to upload.
   * @returns A promise with the parsed upload response.
   */
  async putFile(
    path: string,
    field: string,
    filename: string,
    contentType: string,
    data: Buffer,
  ): Promise<ApiResponse> {
    // FormData supplies the multipart boundary.
    const form = new FormData();
    form.append(field, new Blob([data], { type: contentType }), filename);
    const res = await fetch(this.baseUrl() + path, {
      method: "PUT",
      headers: this.cookieHeader(),
      body: form,
    });
    return this.toApiResponse(res);
  }

  /**
   * Fetches a binary response using this client's session.
   * @param path - API path relative to the test server.
   * @returns A promise with the status, content type and response bytes.
   */
  async getBytes(path: string): Promise<BytesResponse> {
    const res = await fetch(this.baseUrl() + path, { headers: this.cookieHeader() });
    return {
      status: res.status,
      contentType: res.headers.get("content-type"),
      bytes: Buffer.from(await res.arrayBuffer()),
    };
  }
}
