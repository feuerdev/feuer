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
      <div className="px-2 py-1 bg-gray-800 flex justify-between items-center">
        <h3 className="font-semibold text-white text-sm">{title}</h3>
        {actions && <div className="flex space-x-1">{actions}</div>}
      </div>
      <div className="p-2">{children}</div>
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
    <div className={cn("flex justify-between py-0.5 text-sm", className)}>
      <div className="font-medium text-gray-400">{label}</div>
      <div className="text-white">{value}</div>
    </div>
  );
}

export function InfoDivider() {
  return <div className="h-px bg-gray-700 my-1" />;
}
