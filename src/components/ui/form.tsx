"use client"

// Canonical shadcn/ui Form primitives wrapping react-hook-form's Controller +
// FormProvider. Authored verbatim per shadcn's form recipe because the
// shadcn CLI `add form` command was hanging on dependency resolution against
// pinned react-hook-form@7.73.1 / @hookform/resolvers@3.10.0 (CLAUDE.md +
// 02-RESEARCH.md forbid upgrading those).
//
// This variant is adapted to the project's stack: it uses the local
// `Label` (plain `<label>`) and a tiny inline `Slot` (no @radix-ui/* deps,
// since the rest of the ui/ uses @base-ui/react instead). Behavior matches
// the upstream shadcn form: FormField wraps Controller, FormItem provides
// the id namespace, FormControl forwards aria-describedby + aria-invalid.

import * as React from "react"
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
)

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

// Lightweight Slot equivalent: clones the single child element, merging the
// supplied props (id, aria-*) into the child's props. This avoids pulling
// in @radix-ui/react-slot just for FormControl. Sufficient for the
// shadcn FormControl contract (one child element, props forwarded).
const FormControl = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { children: React.ReactElement }
>(function FormControl(
  { children, ...slotProps },
  _ref,
) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
  const child = React.Children.only(children) as React.ReactElement<
    Record<string, unknown>
  >
  const merged: Record<string, unknown> = {
    ...slotProps,
    ...child.props,
    "data-slot": "form-control",
    id: formItemId,
    "aria-describedby": !error
      ? formDescriptionId
      : `${formDescriptionId} ${formMessageId}`,
    "aria-invalid": !!error,
  }
  return React.cloneElement(child, merged)
})

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {body}
    </p>
  )
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
