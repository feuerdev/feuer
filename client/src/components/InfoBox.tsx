import React from "react";
import { cn } from "@/lib/utils";

interface InfoBoxProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function InfoBox({ title, children, className, actions }: InfoBoxProps) {
  return (
    <div
      className={cn(
        "border border-gray-700 bg-gray-900 bg-opacity-80 rounded-md overflow-hidden",
        className
      )}
    >
      <div className="px-4 py-2 bg-gray-800 flex justify-between items-center">
        <h3 className="font-semibold text-white">{title}</h3>
        {actions && <div className="flex space-x-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function InfoRow({ label, value, className }: InfoRowProps) {
  return (
    <div className={cn("flex justify-between py-1", className)}>
      <div className="font-medium text-gray-400">{label}</div>
      <div className="text-white">{value}</div>
    </div>
  );
}

export function InfoDivider() {
  return <div className="h-px bg-gray-700 my-2" />;
}
