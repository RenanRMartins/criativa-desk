declare module 'react-big-calendar/lib/addons/dragAndDrop' {
  import type { ComponentType } from 'react'
  import type { CalendarProps } from 'react-big-calendar'

  interface DragAndDropCalendarProps<TEvent extends object = object, TResource extends object = object>
    extends CalendarProps<TEvent, TResource> {
    onEventDrop?: (args: { event: TEvent; start: Date; end: Date; allDay: boolean }) => void
    onEventResize?: (args: { event: TEvent; start: Date; end: Date; allDay: boolean }) => void
    resizable?: boolean
    draggableAccessor?: ((event: TEvent) => boolean) | string
    resizableAccessor?: ((event: TEvent) => boolean) | string
  }

  function withDragAndDrop<TEvent extends object = object, TResource extends object = object>(
    Calendar: ComponentType<CalendarProps<TEvent, TResource>>
  ): ComponentType<DragAndDropCalendarProps<TEvent, TResource>>

  export default withDragAndDrop
}

declare module 'react-big-calendar/lib/addons/dragAndDrop/styles.css' {
  const content: Record<string, string>
  export default content
}
