// Layout engine - flexbox-inspired positioning

import { Canvas } from "./canvas.ts";
import { Component, Rect } from "./components.ts";

export type Direction = "row" | "column";
export type Justify = "start" | "end" | "center" | "between" | "around" | "evenly";
export type Align = "start" | "end" | "center" | "stretch";

export interface FlexProps {
  direction?: Direction;
  justify?: Justify;
  align?: Align;
  gap?: number;
  wrap?: boolean;
  children: FlexChild[];
}

export interface FlexChild {
  component: Component;
  flex?: number;      // Flex grow factor
  width?: number;     // Fixed width (or height in column mode)
  height?: number;    // Fixed height (or width in column mode)
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export function Flex(props: FlexProps): Component {
  const direction = props.direction ?? "row";
  const justify = props.justify ?? "start";
  const align = props.align ?? "stretch";
  const gap = props.gap ?? 0;

  return {
    render(canvas: Canvas, rect: Rect) {
      const isRow = direction === "row";
      const mainSize = isRow ? rect.width : rect.height;
      const crossSize = isRow ? rect.height : rect.width;

      // Calculate fixed sizes and remaining space
      let totalFixed = 0;
      let totalFlex = 0;
      const gaps = (props.children.length - 1) * gap;

      for (const child of props.children) {
        const fixedSize = isRow ? child.width : child.height;
        if (fixedSize !== undefined) {
          totalFixed += fixedSize;
        } else if (child.flex) {
          totalFlex += child.flex;
        } else {
          // Default to flex: 1 if no size specified
          totalFlex += 1;
        }
      }

      const availableSpace = mainSize - totalFixed - gaps;
      const flexUnit = totalFlex > 0 ? availableSpace / totalFlex : 0;

      // Calculate child sizes
      const sizes: number[] = [];
      for (const child of props.children) {
        const fixedSize = isRow ? child.width : child.height;
        if (fixedSize !== undefined) {
          sizes.push(fixedSize);
        } else {
          const flex = child.flex ?? 1;
          let size = Math.floor(flexUnit * flex);

          // Apply constraints
          const minSize = isRow ? child.minWidth : child.minHeight;
          const maxSize = isRow ? child.maxWidth : child.maxHeight;
          if (minSize !== undefined) size = Math.max(size, minSize);
          if (maxSize !== undefined) size = Math.min(size, maxSize);

          sizes.push(size);
        }
      }

      // Calculate positions based on justify
      let mainPos = isRow ? rect.x : rect.y;
      const totalUsed = sizes.reduce((a, b) => a + b, 0) + gaps;
      const extraSpace = mainSize - totalUsed;

      let spacing = 0;
      let initialOffset = 0;

      switch (justify) {
        case "end":
          initialOffset = extraSpace;
          break;
        case "center":
          initialOffset = extraSpace / 2;
          break;
        case "between":
          spacing = props.children.length > 1 ? extraSpace / (props.children.length - 1) : 0;
          break;
        case "around":
          spacing = extraSpace / props.children.length;
          initialOffset = spacing / 2;
          break;
        case "evenly":
          spacing = extraSpace / (props.children.length + 1);
          initialOffset = spacing;
          break;
      }

      mainPos += initialOffset;

      // Render children
      for (let i = 0; i < props.children.length; i++) {
        const child = props.children[i];
        const size = sizes[i];

        // Calculate cross-axis position and size
        let crossPos = isRow ? rect.y : rect.x;
        let childCrossSize = crossSize;

        const fixedCrossSize = isRow ? child.height : child.width;
        if (fixedCrossSize !== undefined) {
          childCrossSize = fixedCrossSize;
        }

        // Apply cross-axis constraints
        const minCrossSize = isRow ? child.minHeight : child.minWidth;
        const maxCrossSize = isRow ? child.maxHeight : child.maxWidth;
        if (minCrossSize !== undefined) childCrossSize = Math.max(childCrossSize, minCrossSize);
        if (maxCrossSize !== undefined) childCrossSize = Math.min(childCrossSize, maxCrossSize);

        // Align on cross axis
        if (align !== "stretch" && fixedCrossSize === undefined) {
          childCrossSize = crossSize;
        }

        switch (align) {
          case "end":
            crossPos = (isRow ? rect.y : rect.x) + crossSize - childCrossSize;
            break;
          case "center":
            crossPos = (isRow ? rect.y : rect.x) + (crossSize - childCrossSize) / 2;
            break;
        }

        // Build child rect
        const childRect: Rect = isRow
          ? { x: Math.floor(mainPos), y: Math.floor(crossPos), width: size, height: childCrossSize }
          : { x: Math.floor(crossPos), y: Math.floor(mainPos), width: childCrossSize, height: size };

        // Render child
        child.component.render(canvas, childRect);

        // Move to next position
        mainPos += size + gap + (justify === "between" || justify === "around" || justify === "evenly" ? spacing : 0);
      }
    },
  };
}

// Shorthand for row layout
export function Row(children: FlexChild[], options?: Omit<FlexProps, "children" | "direction">): Component {
  return Flex({ ...options, direction: "row", children });
}

// Shorthand for column layout
export function Column(children: FlexChild[], options?: Omit<FlexProps, "children" | "direction">): Component {
  return Flex({ ...options, direction: "column", children });
}

// Grid layout
export interface GridProps {
  columns: number;
  rows?: number;
  gap?: number;
  children: Component[];
}

export function Grid(props: GridProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      const { columns, gap = 0 } = props;
      const rows = props.rows ?? Math.ceil(props.children.length / columns);

      const cellWidth = Math.floor((rect.width - (columns - 1) * gap) / columns);
      const cellHeight = Math.floor((rect.height - (rows - 1) * gap) / rows);

      for (let i = 0; i < props.children.length; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);

        if (row >= rows) break;

        const x = rect.x + col * (cellWidth + gap);
        const y = rect.y + row * (cellHeight + gap);

        props.children[i].render(canvas, {
          x,
          y,
          width: cellWidth,
          height: cellHeight,
        });
      }
    },
  };
}

// Stack - render multiple components at the same position (for overlays)
export function Stack(children: Component[]): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      for (const child of children) {
        child.render(canvas, rect);
      }
    },
  };
}

// Padding wrapper
export interface PaddingProps {
  padding: number | { top?: number; right?: number; bottom?: number; left?: number };
  child: Component;
}

export function Padding(props: PaddingProps): Component {
  const p = typeof props.padding === "number"
    ? { top: props.padding, right: props.padding, bottom: props.padding, left: props.padding }
    : { top: props.padding.top ?? 0, right: props.padding.right ?? 0, bottom: props.padding.bottom ?? 0, left: props.padding.left ?? 0 };

  return {
    render(canvas: Canvas, rect: Rect) {
      props.child.render(canvas, {
        x: rect.x + p.left,
        y: rect.y + p.top,
        width: rect.width - p.left - p.right,
        height: rect.height - p.top - p.bottom,
      });
    },
  };
}

// Center wrapper
export interface CenterProps {
  child: Component;
  width?: number;
  height?: number;
}

export function Center(props: CenterProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      const w = props.width ?? rect.width;
      const h = props.height ?? rect.height;
      const x = rect.x + Math.floor((rect.width - w) / 2);
      const y = rect.y + Math.floor((rect.height - h) / 2);

      props.child.render(canvas, { x, y, width: w, height: h });
    },
  };
}

// Positioned - absolute positioning within parent
export interface PositionedProps {
  x?: number;
  y?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  child: Component;
}

export function Positioned(props: PositionedProps): Component {
  return {
    render(canvas: Canvas, rect: Rect) {
      const w = props.width ?? rect.width;
      const h = props.height ?? rect.height;

      let x = rect.x;
      let y = rect.y;

      if (props.x !== undefined) x = rect.x + props.x;
      else if (props.right !== undefined) x = rect.x + rect.width - w - props.right;

      if (props.y !== undefined) y = rect.y + props.y;
      else if (props.bottom !== undefined) y = rect.y + rect.height - h - props.bottom;

      props.child.render(canvas, { x, y, width: w, height: h });
    },
  };
}
