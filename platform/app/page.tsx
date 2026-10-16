import { Navbar } from "@/components/landing/navbar";
import { HomeContent } from "@/components/landing/home-content";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  // Public marketing HTML is identical for everyone and can be served at the CDN.
  // The existing auth proxy sends signed-in visitors from auth routes to their app.
  const signedIn = false;
  return <><Navbar signedIn={signedIn} /><HomeContent signedIn={signedIn} /><Footer /></>;
}
