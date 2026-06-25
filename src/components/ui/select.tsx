import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type SelectOption = {
  value: string
  label: string
}

export type SelectGroup = {
  label: string
  options: SelectOption[]
}

export interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: (SelectOption | SelectGroup)[]
  placeholder?: string
  disabled?: boolean
  className?: string
  dropdownClassName?: string
  size?: "default" | "sm" | "xs"
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className,
  dropdownClassName,
  size = "default",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Find the selected option's label
  const selectedLabel = React.useMemo(() => {
    for (const opt of options) {
      if ("options" in opt) {
        const found = opt.options.find(o => o.value === value)
        if (found) return found.label
      } else {
        if (opt.value === value) return opt.label
      }
    }
    return ""
  }, [value, options])

  React.useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const toggleDropdown = () => {
    if (!disabled) setIsOpen(!isOpen)
  }

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
  }

  // Size styles matching default, compact rows, and tiny filter sizes
  const triggerSizeClasses = {
    default: "h-11 px-3 text-sm rounded-xl",
    sm: "h-9 px-2.5 text-xs rounded-lg",
    xs: "h-7 px-2 text-[10px] rounded-lg",
  }

  const iconSizeClasses = {
    default: "size-4",
    sm: "size-3.5",
    xs: "size-3",
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between border border-neutral-800 bg-neutral-900 text-foreground transition-colors cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed",
          triggerSizeClasses[size],
          isOpen && "border-primary ring-1 ring-primary",
          className
        )}
      >
        <span className={cn("truncate font-medium", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={cn("text-muted-foreground transition-transform duration-200 shrink-0 ml-1.5", iconSizeClasses[size], isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-neutral-850 bg-neutral-950 p-1 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-100 scrollbar-thin scrollbar-thumb-neutral-850",
            dropdownClassName
          )}
        >
          {options.length === 0 ? (
            <div className="px-2.5 py-1.5 text-xs text-muted-foreground">No options available</div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {options.map((opt, idx) => {
                if ("options" in opt) {
                  if (opt.options.length === 0) return null
                  return (
                    <div key={`group-${idx}`} className="flex flex-col gap-0.5 mt-1 first:mt-0">
                      <div className="px-2.5 py-1 text-[8px] font-bold text-neutral-500 uppercase tracking-widest select-none">
                        {opt.label}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {opt.options.map((subOpt) => {
                          const isSelected = subOpt.value === value
                          return (
                            <button
                              key={subOpt.value}
                              type="button"
                              onClick={() => handleSelect(subOpt.value)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer select-none",
                                isSelected
                                  ? "bg-neutral-900 text-foreground font-semibold border border-neutral-800"
                                  : "text-muted-foreground hover:bg-neutral-900/60 hover:text-foreground"
                              )}
                            >
                              <span className="truncate">{subOpt.label}</span>
                              {isSelected && <Check className="size-3 shrink-0 text-primary" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                } else {
                  const isSelected = opt.value === value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer select-none",
                        isSelected
                          ? "bg-neutral-900 text-foreground font-semibold border border-neutral-800"
                          : "text-muted-foreground hover:bg-neutral-900/60 hover:text-foreground"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="size-3 shrink-0 text-primary" />}
                    </button>
                  )
                }
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
