import { withAuth } from "next-auth/middleware"

// In Next.js 16, you use 'proxy.js' instead of 'middleware.js'
// exporting 'withAuth' as default satisfies the proxy entry point.
export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

export const config = {
  matcher: ["/home"],
}
