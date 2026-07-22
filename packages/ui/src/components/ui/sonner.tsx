import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Icon } from "@/components/ui/icon"
import CheckCircle from "@solar-icons/react/csr/ui/CheckCircle"
import InfoCircle from "@solar-icons/react/csr/ui/InfoCircle"
import DangerTriangle from "@solar-icons/react/csr/ui/DangerTriangle"
import CloseCircle from "@solar-icons/react/csr/ui/CloseCircle"
import Refresh from "@solar-icons/react/csr/arrows/Refresh"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <Icon icon={CheckCircle} className="size-4" />,
        info: <Icon icon={InfoCircle} className="size-4" />,
        warning: <Icon icon={DangerTriangle} className="size-4" />,
        error: <Icon icon={CloseCircle} className="size-4" />,
        loading: (
          <Icon
            icon={Refresh}
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
