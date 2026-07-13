export function Timeline({ items }: { items: Array<{ title: string; description: string }> }) {
  return (
    <ol className="relative space-y-5 border-l pl-5">
      {items.map((item) => (
        <li key={item.title} className="relative">
          <span className="absolute -left-[1.68rem] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <h4 className="text-sm font-medium">{item.title}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        </li>
      ))}
    </ol>
  );
}
