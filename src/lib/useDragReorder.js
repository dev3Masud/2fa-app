import { useCallback, useRef, useState } from 'react'

// useDragReorder — minimal, dependency-free HTML5 drag-and-drop reorder hook.
//
// Usage:
//   const {
//     getDragProps,     // spread onto each draggable item
//     getDropZoneProps, // spread onto the container
//     draggingId,      // currently-dragged item id, or null
//     dropTargetId,    // id of the row being hovered (for indicator UI)
//     dropPosition,    // 'before' | 'after' | null
//   } = useDragReorder({ items, onReorder, getId })
//
// `onReorder(sourceId, targetId, position)` is called once when the user
// drops an item. The host owns the actual array mutation and re-render.

// eslint-disable-next-line no-unused-vars
export function useDragReorder({ items, onReorder, getId = (x) => x.id }) {
  const [draggingId, setDraggingId] = useState(null)
  const [dropTargetId, setDropTargetId] = useState(null)
  const [dropPosition, setDropPosition] = useState(null) // 'before' | 'after'
  const lastOverRef = useRef({ id: null, position: null })

  const getDragProps = useCallback(
    (id) => ({
      draggable: true,
      onDragStart: (e) => {
        setDraggingId(id)
        // Required for Firefox to actually fire drag events
        try {
          e.dataTransfer.setData('text/plain', String(id))
        } catch {
          /* some browsers throw if the dataTransfer is read-only */
        }
        try {
          e.dataTransfer.effectAllowed = 'move'
        } catch {
          /* ignore — older browsers may refuse */
        }
      },
      onDragEnd: () => {
        setDraggingId(null)
        setDropTargetId(null)
        setDropPosition(null)
        lastOverRef.current = { id: null, position: null }
      },
      onDragOver: (e) => {
        if (!draggingId || draggingId === id) return
        e.preventDefault()
        try {
          e.dataTransfer.dropEffect = 'move'
        } catch {
          /* ignore — read-only dataTransfer on some browsers */
        }
        const rect = e.currentTarget.getBoundingClientRect()
        const midpoint = rect.top + rect.height / 2
        const position = e.clientY < midpoint ? 'before' : 'after'
        if (
          lastOverRef.current.id !== id ||
          lastOverRef.current.position !== position
        ) {
          lastOverRef.current = { id, position }
          setDropTargetId(id)
          setDropPosition(position)
        }
      },
      onDragLeave: (e) => {
        // Only clear when we actually leave this element (not when entering a child)
        if (e.currentTarget.contains(e.relatedTarget)) return
        if (lastOverRef.current.id === id) {
          lastOverRef.current = { id: null, position: null }
          setDropTargetId(null)
          setDropPosition(null)
        }
      },
      onDrop: (e) => {
        e.preventDefault()
        const sourceId = draggingId
        const pos =
          lastOverRef.current.id === id ? lastOverRef.current.position : null
        setDraggingId(null)
        setDropTargetId(null)
        setDropPosition(null)
        lastOverRef.current = { id: null, position: null }
        if (!sourceId || sourceId === id || !pos) return
        onReorder(sourceId, id, pos)
      },
    }),
    [draggingId, onReorder]
  )

  const getDropZoneProps = useCallback(
    () => ({
      onDragOver: (e) => {
        // Allow drop anywhere in the zone — per-item handlers above do the
        // actual targeting. We just need to preventDefault so the cursor
        // shows a "move" affordance over empty space inside the zone.
        if (draggingId) e.preventDefault()
      },
      onDrop: (e) => {
        e.preventDefault()
      },
    }),
    [draggingId]
  )

  return {
    getDragProps,
    getDropZoneProps,
    draggingId,
    dropTargetId,
    dropPosition,
  }
}

// ── Helper: pure reorder of an array given the drag parameters ─────────────
// Returns a NEW array — never mutates the input.
export function reorderArray(items, sourceId, targetId, position, getId = (x) => x.id) {
  if (sourceId === targetId) return items
  const list = items.slice()
  const fromIdx = list.findIndex((it) => getId(it) === sourceId)
  if (fromIdx === -1) return items
  const [moved] = list.splice(fromIdx, 1)
  // After removal the target's index may have shifted (only if the source
  // was before the target). Recompute from scratch on the post-removal list.
  let insertAt = list.findIndex((it) => getId(it) === targetId)
  if (insertAt === -1) {
    list.push(moved)
    return list
  }
  if (position === 'after') insertAt += 1
  list.splice(insertAt, 0, moved)
  return list
}