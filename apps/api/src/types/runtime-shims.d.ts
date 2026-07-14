declare module "cookie-parser" {
  const cookieParser: (...args: unknown[]) => unknown;
  export default cookieParser;
}

declare module "express" {
  export interface Request {
    method: string;
    url: string;
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
    cookies?: Record<string, string | undefined>;
    params: Record<string, string | undefined>;
    query: Record<string, string | undefined>;
    body?: Record<string, any>;
  }
  export interface Response {
    status(code: number): Response;
    json(body: unknown): Response;
    cookie(...args: unknown[]): Response;
    clearCookie(...args: unknown[]): Response;
  }
}

declare module "nodemailer" {
  export type Transporter = { sendMail: (...args: unknown[]) => Promise<unknown> };
  export function createTransport(...args: unknown[]): Transporter;
}
