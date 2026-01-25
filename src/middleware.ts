export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/panel", "/inventory/:path*", "/api/inventory/:path*"]
};
