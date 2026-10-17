import { landingMarkup } from "@/components/reference/static-markup";
import { AppShell } from "@/components/app-shell";
import { LandingHashScroll } from "@/components/reference/landing-hash-scroll";
import { getSessionUser } from "@/lib/auth/session";
import "@/components/reference/reference-landing.css";
import "@/components/reference/adaptations.css";

// Reuse the original landing sections inside the signed-in shell. Only the
// guest navigation/footer and the signup destination change for that view.
const signedInLandingMarkup = landingMarkup
  .replace(/^<nav>[\s\S]*?<\/nav>/, "")
  .replace(/<footer>[\s\S]*<\/footer>$/, "")
  .replaceAll('href="/signup"', 'href="/dashboard"');

export default async function HomePage() {
  const user = await getSessionUser();
  if (user && user.accountStatus !== "suspended" && user.accountStatus !== "deleted") {
    return <AppShell displayName={user.displayName}>
      <main id="main-content" className="reference-landing" dangerouslySetInnerHTML={{ __html: signedInLandingMarkup }} />
      <LandingHashScroll />
    </AppShell>;
  }
  return <>
    <main id="main-content" className="reference-landing" dangerouslySetInnerHTML={{ __html: landingMarkup }} />
    <LandingHashScroll />
  </>;
}
