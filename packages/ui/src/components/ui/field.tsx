import * as React from "react"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// App-form fields (wizard, editors, settings, channel config) are not
// browser-autofill targets: `autoComplete="off"` keeps password managers from
// offering to save an SMTP credential as a site login, `spellCheck={false}`
// keeps squiggles off URLs/JSON/hosts, and `name` falls back to the `id` every
// labeled field already has. All three are overridable per call site —
// login/setup use raw Input instead, where real autofill semantics apply.
const FieldInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(function FieldInput(
  { autoComplete = "off", spellCheck = false, name, id, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      id={id}
      name={name ?? id}
      autoComplete={autoComplete}
      spellCheck={spellCheck}
      {...props}
    />
  )
})

const FieldTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<typeof Textarea>
>(function FieldTextarea(
  { autoComplete = "off", spellCheck = false, name, id, ...props },
  ref,
) {
  return (
    <Textarea
      ref={ref}
      id={id}
      name={name ?? id}
      autoComplete={autoComplete}
      spellCheck={spellCheck}
      {...props}
    />
  )
})

export { FieldInput, FieldTextarea }
