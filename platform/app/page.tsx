import { landingMarkup } from "@/components/reference/static-markup";
import "@/components/reference/reference-landing.css";
import "@/components/reference/adaptations.css";

export default function HomePage() {
  return <main id="main-content" className="reference-landing" dangerouslySetInnerHTML={{ __html: landingMarkup }} />;
}
