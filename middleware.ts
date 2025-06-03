import { NextResponse } from "next/server";
import config from "./config";

let clerkMiddleware: (arg0: (auth: any, req: any) => any) => { (arg0: any): any; new(): any; }, createRouteMatcher;

if (config.auth.enabled) {
  try {
    ({ clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server"));
  } catch (error) {
    console.warn("Clerk modules not available. Auth will be disabled.");
    config.auth.enabled = false;
  }
}

// Updated route matcher to include both dashboard and user-profile routes
const isProtectedRoute = config.auth.enabled
  ? createRouteMatcher(["/dashboard(.*)", "/user-profile(.*)"])
  : () => false;

// Function to check if a path is a quiz view page
const isQuizViewPage = (path: string) => {
  return /^\/dashboard\/quiz\/[^\/]+$/.test(path);
};

export default function middleware(req: any) {
  if (config.auth.enabled) {
    return clerkMiddleware(async (auth, req) => {
      const resolvedAuth = await auth();
      const path = req.nextUrl.pathname;
      
      // Allow access to quiz view pages without authentication
      if (!resolvedAuth.userId && isProtectedRoute(req) && !isQuizViewPage(path)) {
        return resolvedAuth.redirectToSignIn();
      } else {
        return NextResponse.next();
      }
    })(req);
  } else {
    return NextResponse.next();
  }
}

export const middlewareConfig = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};