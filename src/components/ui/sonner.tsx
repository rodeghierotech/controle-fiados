"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="light"
    position="top-center"
    richColors
    toastOptions={{ classNames: { toast: "rounded-xl border bg-background text-foreground shadow-lg" } }}
    {...props}
  />
);

export { Toaster };
