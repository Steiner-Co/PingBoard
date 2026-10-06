import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Icon } from "@/components/ui/icon"
import { Check } from "@phosphor-icons/react/dist/icons/Check"
import { Info } from "@phosphor-icons/react/dist/icons/Info"
import { Warning } from "@phosphor-icons/react/dist/icons/Warning"
import { X } from "@phosphor-icons/react/dist/icons/X"
import { ArrowClockwise } from "@phosphor-icons/react/dist/icons/ArrowClockwise"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <Icon icon={Check} weight="bold" className="size-4" />,
        info: <Icon icon={Info} className="size-4" />,
        warning: <Icon icon={Warning} className="size-4" />,
        error: <Icon icon={X} weight="bold" className="size-4" />,
        loading: (
          <Icon
            icon={ArrowClockwise}
            className="size-4 motion-safe:animate-spin"
          />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
