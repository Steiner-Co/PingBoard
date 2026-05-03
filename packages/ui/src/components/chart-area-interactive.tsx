"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

const chartData = [
  { date: "2024-04-01", http: 222, tcp: 150 },
  { date: "2024-04-02", http: 97, tcp: 180 },
  { date: "2024-04-03", http: 167, tcp: 120 },
  { date: "2024-04-04", http: 242, tcp: 260 },
  { date: "2024-04-05", http: 373, tcp: 290 },
  { date: "2024-04-06", http: 301, tcp: 340 },
  { date: "2024-04-07", http: 245, tcp: 180 },
  { date: "2024-04-08", http: 409, tcp: 320 },
  { date: "2024-04-09", http: 59, tcp: 110 },
  { date: "2024-04-10", http: 261, tcp: 190 },
  { date: "2024-04-11", http: 327, tcp: 350 },
  { date: "2024-04-12", http: 292, tcp: 210 },
  { date: "2024-04-13", http: 342, tcp: 380 },
  { date: "2024-04-14", http: 137, tcp: 220 },
  { date: "2024-04-15", http: 120, tcp: 170 },
  { date: "2024-04-16", http: 138, tcp: 190 },
  { date: "2024-04-17", http: 446, tcp: 360 },
  { date: "2024-04-18", http: 364, tcp: 410 },
  { date: "2024-04-19", http: 243, tcp: 180 },
  { date: "2024-04-20", http: 89, tcp: 150 },
  { date: "2024-04-21", http: 137, tcp: 200 },
  { date: "2024-04-22", http: 224, tcp: 170 },
  { date: "2024-04-23", http: 138, tcp: 230 },
  { date: "2024-04-24", http: 387, tcp: 290 },
  { date: "2024-04-25", http: 215, tcp: 250 },
  { date: "2024-04-26", http: 75, tcp: 130 },
  { date: "2024-04-27", http: 383, tcp: 420 },
  { date: "2024-04-28", http: 122, tcp: 180 },
  { date: "2024-04-29", http: 315, tcp: 240 },
  { date: "2024-04-30", http: 454, tcp: 380 },
  { date: "2024-05-01", http: 165, tcp: 220 },
  { date: "2024-05-02", http: 293, tcp: 310 },
  { date: "2024-05-03", http: 247, tcp: 190 },
  { date: "2024-05-04", http: 385, tcp: 420 },
  { date: "2024-05-05", http: 481, tcp: 390 },
  { date: "2024-05-06", http: 498, tcp: 520 },
  { date: "2024-05-07", http: 388, tcp: 300 },
  { date: "2024-05-08", http: 149, tcp: 210 },
  { date: "2024-05-09", http: 227, tcp: 180 },
  { date: "2024-05-10", http: 293, tcp: 330 },
  { date: "2024-05-11", http: 335, tcp: 270 },
  { date: "2024-05-12", http: 197, tcp: 240 },
  { date: "2024-05-13", http: 197, tcp: 160 },
  { date: "2024-05-14", http: 448, tcp: 490 },
  { date: "2024-05-15", http: 473, tcp: 380 },
  { date: "2024-05-16", http: 338, tcp: 400 },
  { date: "2024-05-17", http: 499, tcp: 420 },
  { date: "2024-05-18", http: 315, tcp: 350 },
  { date: "2024-05-19", http: 235, tcp: 180 },
  { date: "2024-05-20", http: 177, tcp: 230 },
  { date: "2024-05-21", http: 82, tcp: 140 },
  { date: "2024-05-22", http: 81, tcp: 120 },
  { date: "2024-05-23", http: 252, tcp: 290 },
  { date: "2024-05-24", http: 294, tcp: 220 },
  { date: "2024-05-25", http: 201, tcp: 250 },
  { date: "2024-05-26", http: 213, tcp: 170 },
  { date: "2024-05-27", http: 420, tcp: 460 },
  { date: "2024-05-28", http: 233, tcp: 190 },
  { date: "2024-05-29", http: 78, tcp: 130 },
  { date: "2024-05-30", http: 340, tcp: 280 },
  { date: "2024-05-31", http: 178, tcp: 230 },
  { date: "2024-06-01", http: 178, tcp: 200 },
  { date: "2024-06-02", http: 470, tcp: 410 },
  { date: "2024-06-03", http: 103, tcp: 160 },
  { date: "2024-06-04", http: 439, tcp: 380 },
  { date: "2024-06-05", http: 88, tcp: 140 },
  { date: "2024-06-06", http: 294, tcp: 250 },
  { date: "2024-06-07", http: 323, tcp: 370 },
  { date: "2024-06-08", http: 385, tcp: 320 },
  { date: "2024-06-09", http: 438, tcp: 480 },
  { date: "2024-06-10", http: 155, tcp: 200 },
  { date: "2024-06-11", http: 92, tcp: 150 },
  { date: "2024-06-12", http: 492, tcp: 420 },
  { date: "2024-06-13", http: 81, tcp: 130 },
  { date: "2024-06-14", http: 426, tcp: 380 },
  { date: "2024-06-15", http: 307, tcp: 350 },
  { date: "2024-06-16", http: 371, tcp: 310 },
  { date: "2024-06-17", http: 475, tcp: 520 },
  { date: "2024-06-18", http: 107, tcp: 170 },
  { date: "2024-06-19", http: 341, tcp: 290 },
  { date: "2024-06-20", http: 408, tcp: 450 },
  { date: "2024-06-21", http: 169, tcp: 210 },
  { date: "2024-06-22", http: 317, tcp: 270 },
  { date: "2024-06-23", http: 480, tcp: 530 },
  { date: "2024-06-24", http: 132, tcp: 180 },
  { date: "2024-06-25", http: 141, tcp: 190 },
  { date: "2024-06-26", http: 434, tcp: 380 },
  { date: "2024-06-27", http: 448, tcp: 490 },
  { date: "2024-06-28", http: 149, tcp: 200 },
  { date: "2024-06-29", http: 103, tcp: 160 },
  { date: "2024-06-30", http: 446, tcp: 400 },
]

const chartConfig = {
  checks: {
    label: "Checks",
  },
  http: {
    label: "HTTP",
    color: "var(--primary)",
  },
  tcp: {
    label: "TCP / Ping",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Checks performed</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Daily check volume by protocol
          </span>
          <span className="@[540px]/card:hidden">By protocol</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillHTTP" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-http)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-http)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillTCP / Ping" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-tcp)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-tcp)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="tcp"
              type="natural"
              fill="url(#fillTCP / Ping)"
              stroke="var(--color-tcp)"
              stackId="a"
            />
            <Area
              dataKey="http"
              type="natural"
              fill="url(#fillHTTP)"
              stroke="var(--color-http)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
