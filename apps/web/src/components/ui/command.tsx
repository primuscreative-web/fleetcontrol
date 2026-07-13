"use client";

import { Command as CommandPrimitive } from "cmdk";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Command({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-card", className)}
      {...props}
    />
  );
}

export function CommandInput({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CommandPrimitive.Input>) {
  return (
    <CommandPrimitive.Input
      className={cn(
        "h-11 w-full border-b bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function CommandList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List className={cn("max-h-80 overflow-y-auto p-2", className)} {...props} />
  );
}

export function CommandItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-muted",
        className,
      )}
      {...props}
    />
  );
}
