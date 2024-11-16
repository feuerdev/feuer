import Game from "@/components/game/Game";
import { getCurrentSession } from "@/lib/sessions";
import { redirect } from "next/navigation";

export default async function Home() {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect("/login");
  }

  return <Game />;
}
