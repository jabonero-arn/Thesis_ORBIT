"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { getAiSuggestions } from "@/app/actions"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Sparkles, Terminal } from "lucide-react"
import { Badge } from "./ui/badge"

const initialState = {
  suggestions: null,
  error: null,
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Thinking...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Get Suggestions
        </>
      )}
    </Button>
  )
}

export default function AiSuggestionForm() {
  const [state, formAction] = useActionState(getAiSuggestions, initialState)

  return (
    <div className="grid gap-6">
      <form action={formAction} className="grid gap-4">
        <Textarea
          name="projectDescription"
          placeholder="Describe your project or learning objectives. For example: 'I want to build a weather station that measures temperature and humidity and displays it on a small screen.'"
          rows={5}
          required
        />
        <SubmitButton />
      </form>
      
      {state.error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.suggestions && (
        <div className="rounded-lg border bg-secondary/50 p-4">
            <h3 className="font-headline text-lg mb-4">AI Recommendations</h3>
            <div className="flex flex-wrap gap-2">
            {state.suggestions.map((suggestion, index) => (
                <Badge key={index} variant="secondary" className="text-base px-3 py-1">
                    {suggestion}
                </Badge>
            ))}
            </div>
        </div>
      )}
    </div>
  )
}
