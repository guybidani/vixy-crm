import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

export interface KanbanColumn<TItem> {
  key: string;
  label: string;
  color: string;
  items: TItem[];
  aggregate?: string;
}

interface KanbanBoardProps<TItem extends { id: string }> {
  columns: KanbanColumn<TItem>[];
  renderCard: (item: TItem, isDragging: boolean) => React.ReactNode;
  onDragEnd: (itemId: string, fromColumn: string, toColumn: string) => void;
  onCardClick?: (item: TItem) => void;
  loading?: boolean;
  emptyText?: string;
}

export default function KanbanBoard<TItem extends { id: string }>({
  columns,
  renderCard,
  onDragEnd,
  onCardClick,
  loading,
  emptyText = "ריק",
}: KanbanBoardProps<TItem>) {
  const [activeItem, setActiveItem] = useState<{
    item: TItem;
    columnKey: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    const itemId = event.active.id as string;
    for (const col of columns) {
      const found = col.items.find((item) => item.id === itemId);
      if (found) {
        setActiveItem({ item: found, columnKey: col.key });
        break;
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id as string;
    const targetColumn = over.id as string;

    // Find current column
    const validKeys = new Set(columns.map((c) => c.key));
    if (!validKeys.has(targetColumn)) return;

    let sourceColumn = "";
    for (const col of columns) {
      if (col.items.find((item) => item.id === itemId)) {
        sourceColumn = col.key;
        break;
      }
    }

    if (sourceColumn === targetColumn) return;
    onDragEnd(itemId, sourceColumn, targetColumn);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-3 overflow-x-auto pb-4"
        style={{ minHeight: "60vh" }}
      >
        {columns.map((col) => (
          <DroppableColumn
            key={col.key}
            columnKey={col.key}
            label={col.label}
            color={col.color}
            count={col.items.length}
            aggregate={col.aggregate}
            loading={loading}
            emptyText={emptyText}
          >
            {col.items.map((item) => (
              <DraggableCard
                key={item.id}
                id={item.id}
                onClick={onCardClick ? () => onCardClick(item) : undefined}
              >
                {renderCard(item, false)}
              </DraggableCard>
            ))}
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="rotate-1 scale-105">
            {renderCard(activeItem.item, true)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({
  columnKey,
  label,
  color,
  count,
  aggregate,
  loading,
  emptyText,
  children,
}: {
  columnKey: string;
  label: string;
  color: string;
  count: number;
  aggregate?: string;
  loading?: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[280px] flex flex-col rounded-xl overflow-hidden transition-all ${
        isOver ? "ring-2 shadow-lg" : ""
      }`}
      style={isOver ? { ringColor: color + "50" } : undefined}
    >
      {/* Monday-style column header */}
      <div
        className="px-3 py-2.5 bg-white border border-b-0 rounded-t-xl"
        style={{ borderColor: "#E6E9EF", borderTopColor: color, borderTopWidth: 3 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="font-semibold text-[13px] text-[#323338] truncate">{label}</span>
          </div>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 text-white"
            style={{ backgroundColor: color }}
          >
            {count}
          </span>
        </div>
        {aggregate && (
          <p className="text-[12px] font-semibold text-[#676879] mt-1.5 pr-4">{aggregate}</p>
        )}
      </div>

      <div
        className={`flex-1 p-2 space-y-2 overflow-y-auto max-h-[65vh] bg-[#F7F8FA] border border-t-0 rounded-b-xl ${
          isOver ? "bg-[#EDF3FB]" : ""
        }`}
        style={{ borderColor: "#E6E9EF" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : count === 0 ? (
          <div className="text-center text-[#9699A6] text-xs py-10">
            {emptyText}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  id,
  onClick,
  children,
}: {
  id: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      className="cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:ring-offset-1 rounded-xl"
    >
      {children}
    </div>
  );
}
