import { Button } from "@/components/ui/button";
import Image from "next/image";

export default async function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-6">
        <Image
          src="/login_title.png"
          alt=""
          width={120}
          height={140}
          className="mb-2"
        />
        <h1 className="text-3xl font-bold text-orange-400">feuer.io</h1>
        <div className="flex w-full flex-col space-y-4">
          <Button className="w-full bg-gray-600 hover:bg-gray-700">
            Login with Google
          </Button>
          <Button className="w-full bg-gray-600 hover:bg-gray-700">
            Login as Guest
          </Button>
        </div>
      </div>
    </div>
  );
}
