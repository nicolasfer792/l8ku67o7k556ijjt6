"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import React from "react"
import { useAtila } from "@/store/atila-provider"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ReservationDetailsDialog } from "@/components/reservation-details-dialog"
import { Reservation } from "@/lib/types"

export function ClientNameSearch() {
  const { state, setClientNameFilter, listReservationsByClientName } = useAtila()
  const [clientName, setClientName] = React.useState(state.clientNameFilter || "")
  const [suggestions, setSuggestions] = React.useState<Reservation[]>([])
  const [open, setOpen] = React.useState(false)
  const [selectedReservationId, setSelectedReservationId] = React.useState<string | null>(null)

  const handleValueChange = async (value: string) => {
    setClientName(value)
    setClientNameFilter(value)

    if (value.length > 2) {
      const reservations = await listReservationsByClientName(value)
      setSuggestions(reservations)
      setOpen(true)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }

  const handleSelect = (id: string) => {
    setSelectedReservationId(id)
    setOpen(false)
    setClientName("") // Clear input after selection
    setSuggestions([]) // Clear suggestions
  }

  return (
    <div className="relative">
      <Command shouldFilter={false}> {/* Disable internal filtering as we do it ourselves */}
        <CommandInput
          placeholder="Buscar por nombre de cliente..."
          value={clientName}
          onValueChange={handleValueChange}
        />
        {open && suggestions.length > 0 && (
          <CommandList className="absolute top-full left-0 w-full bg-popover border border-border rounded-md shadow-lg z-10">
            <CommandEmpty>No se encontraron reservas.</CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.id}
                  value={suggestion.nombreCliente}
                  onSelect={() => handleSelect(suggestion.id)}
                >
                  {suggestion.nombreCliente} - {new Date(suggestion.fecha).toLocaleDateString("es-ES")}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
      {selectedReservationId && (
        <ReservationDetailsDialog
          open={!!selectedReservationId}
          onOpenChange={() => setSelectedReservationId(null)}
          reservationId={selectedReservationId} // This prop will be added in the next step
        />
      )}
    </div>
  )
}