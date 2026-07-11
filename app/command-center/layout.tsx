import CommandCenterShell from "@/components/command-center/shell";

export default function CommandCenterLayout({ children }: { children: React.ReactNode }) {
  return <CommandCenterShell>{children}</CommandCenterShell>;
}
