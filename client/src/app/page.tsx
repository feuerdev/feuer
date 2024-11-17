import Loading from "@/components/ui/loading";
import { getCurrentSession } from "@/lib/sessions";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

// TODO: Check all the uses of window etc and then ssr this component again
//        -> Would that make the UX better?
const Game = dynamic(() => import("@/components/game/Game"), {
  ssr: false,
  loading: () => <Loading text={"Loading game scripts..."} />,
});

export default async function Home() {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect("/login");
  }

  return <Game />;
}
