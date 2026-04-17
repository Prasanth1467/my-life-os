"use client"

import * as React from "react"
import { ChevronDown, Command, Moon, Sun } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

export default function UiKitPage() {
  const [checked, setChecked] = React.useState(true)
  const [slider, setSlider] = React.useState([55])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">UI Kit</div>
          <div className="text-sm text-muted-foreground">
            A clean showcase of shadcn primitives used in Life OS.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => toast("Toast", { description: "Sonner notification (shadcn)." })}>
            Trigger Toast
          </Button>
          <Badge variant="secondary">Premium</Badge>
        </div>
      </div>

      <Tabs defaultValue="core">
        <TabsList>
          <TabsTrigger value="core">Core</TabsTrigger>
          <TabsTrigger value="overlays">Overlays</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="core">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Buttons + Badges</CardTitle>
                <CardDescription>Primary actions stay obvious.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Button>Primary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Badge>Default</Badge>
                <Badge variant="success">SUCCESS</Badge>
                <Badge variant="warning">WARNING</Badge>
                <Badge variant="danger">DANGER</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inputs</CardTitle>
                <CardDescription>Fast entry, no clutter.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Input" />
                <Textarea placeholder="Textarea" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avatar + Tooltip</CardTitle>
                <CardDescription>Identity and micro-help.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>EVR</AvatarFallback>
                </Avatar>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">
                        <Command className="size-4" /> Hover me
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Tooltip content</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Switch + Slider</CardTitle>
                <CardDescription>Settings controls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Dark mode</div>
                  <Switch checked={checked} onCheckedChange={setChecked} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">Intensity</div>
                    <Badge variant="outline">{slider[0]}</Badge>
                  </div>
                  <Slider value={slider} onValueChange={setSlider} max={100} step={1} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overlays">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Dropdown Menu</CardTitle>
                <CardDescription>Compact actions list.</CardDescription>
              </CardHeader>
              <CardContent>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Menu <ChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Theme</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Sun className="mr-2 size-4" /> Light
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Moon className="mr-2 size-4" /> Dark
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Popover + HoverCard</CardTitle>
                <CardDescription>Context without clutter.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Popover</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="text-sm font-semibold">Popover</div>
                    <div className="mt-1 text-xs text-muted-foreground">Short, actionable context.</div>
                  </PopoverContent>
                </Popover>

                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button variant="outline">HoverCard</Button>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <div className="text-sm font-semibold">HoverCard</div>
                    <div className="mt-1 text-xs text-muted-foreground">Hover-based preview panel.</div>
                  </HoverCardContent>
                </HoverCard>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Progress + Separator</CardTitle>
                <CardDescription>Signal execution clearly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={66} />
                <Separator />
                <div className="text-sm text-muted-foreground">Clean dividers + strong progress.</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alerts</CardTitle>
                <CardDescription>Honest feedback.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertTitle>Execution risk</AlertTitle>
                  <AlertDescription>Finish one task now to restart momentum.</AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Accordion + ScrollArea + Skeleton</CardTitle>
                <CardDescription>Dense info, still calm.</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="a">
                    <AccordionTrigger>Accordion section</AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-32 rounded-lg border p-3">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[80%]" />
                          <Skeleton className="h-4 w-[70%]" />
                          <Skeleton className="h-4 w-[85%]" />
                          <div className="pt-2 text-xs text-muted-foreground">
                            Skeletons simulate loading states without layout jump.
                          </div>
                        </div>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

