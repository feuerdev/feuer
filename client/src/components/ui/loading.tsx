import { Loader2 } from "lucide-react";

interface LoadingProps {
  text?: string;
}

export default function Loading({ text }: LoadingProps) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="animate-spin text-white" />
        {text && <p className="text-sm text-white">{text}</p>}
      </div>
    </div>
  );
}
