import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingFeed } from "./components/landing-feed";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/home");

  return <LandingFeed />;
}
