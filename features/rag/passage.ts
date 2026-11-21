// The passage as a person reads it: without the Markdown heading line that
// recursive chunks start with, since the heading is shown separately.
export function passageText(text: string) {
  return text.replace(/^#{1,6} [^\n]*\n+/, "").trim()
}
