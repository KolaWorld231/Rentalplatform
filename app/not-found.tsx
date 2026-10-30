import { Home } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <Card className="flex w-full flex-col items-center gap-3 p-10">
        <Home className="h-10 w-10 text-charcoal-400" aria-hidden="true" />
        <h1 className="font-display text-xl font-semibold text-charcoal-700">Page not found</h1>
        <p className="text-sm text-charcoal-500">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link href="/" className={cn(buttonVariants({ variant: "primary" }))}>
          Back home
        </Link>
      </Card>
    </div>
  );
}
