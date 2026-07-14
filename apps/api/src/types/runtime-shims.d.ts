declare module "cookie-parser" {
  const cookieParser: (...args: unknown[]) => unknown;
  export default cookieParser;
}

declare module "nodemailer" {
  export type Transporter = { sendMail: (...args: unknown[]) => Promise<unknown> };
  export function createTransport(...args: unknown[]): Transporter;
}
