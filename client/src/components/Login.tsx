import { SignIn } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <SignIn
        appearance={{
          baseTheme: dark,
        }}
      />
    </div>
  );
}
