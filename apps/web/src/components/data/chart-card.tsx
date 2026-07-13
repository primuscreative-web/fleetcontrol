"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { name: "Jan", value: 24 },
  { name: "Fev", value: 31 },
  { name: "Mar", value: 28 },
  { name: "Abr", value: 39 },
  { name: "Mai", value: 44 },
  { name: "Jun", value: 48 },
];

export function ChartCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilidade operacional</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis
              dataKey="name"
              stroke="currentColor"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.18)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
