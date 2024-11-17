import { getCurrentSession } from "@/lib/sessions";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

const Game = dynamic(() => import("@/components/game/Game"), { ssr: false });

export default async function Home() {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect("/login");
  }

  return <Game />;
}
