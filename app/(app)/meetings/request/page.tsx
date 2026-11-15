import { redirect } from "next/navigation";

// Consolidated into /meetings — redirect any old deep links.
export default function OutsideMeetingRequestPage() {
  redirect("/meetings");
}
