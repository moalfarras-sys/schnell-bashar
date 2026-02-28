import { permanentRedirect } from "next/navigation";

/**
 * /tracking is deprecated. Redirect to unified /anfrage flow.
 */
export default function TrackingPage() {
  permanentRedirect("/anfrage");
}
