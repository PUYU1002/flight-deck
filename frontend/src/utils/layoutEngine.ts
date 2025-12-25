/**
 * 智能布局引擎
 * 根据组件尺寸、排序和画布大小，自动计算组件位置，避免遮挡
 */

import { UIComponentConfig } from '../types';

// 组件基础尺寸（未缩放时）
// 增加基础尺寸，使组件占用更多空间，间距自然减少，布局更紧凑
const BASE_COMPONENT_WIDTH = 300; // 从 160px 增加到 200px
const BASE_COMPONENT_HEIGHT = 210; // 从 110px 增加到 140px
const COMPONENT_PADDING = 12; // 从 16px 减少到 12px，使间距更紧凑

export interface ComponentLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface LayoutBounds {
  width: number;
  height: number;
  padding: number;
}

/**
 * 计算组件的实际尺寸（考虑 scale）
 */
function getComponentSize(component: UIComponentConfig): { width: number; height: number } {
  const scale = component.scale || 1;
  return {
    width: BASE_COMPONENT_WIDTH * scale,
    height: BASE_COMPONENT_HEIGHT * scale,
  };
}

/**
 * 网格布局算法（适用于 Primary Zone）
 * 使用自适应网格，根据组件大小和数量动态调整列数
 * 改进版：考虑实际组件尺寸，避免重叠
 */
function gridLayout(
  components: UIComponentConfig[],
  bounds: LayoutBounds
): ComponentLayout[] {
  if (components.length === 0) return [];

  // 计算平均组件尺寸
  const avgSize = components.reduce(
    (acc, comp) => {
      const size = getComponentSize(comp);
      return {
        width: acc.width + size.width,
        height: acc.height + size.height,
      };
    },
    { width: 0, height: 0 }
  );
  avgSize.width /= components.length;
  avgSize.height /= components.length;

  // 计算最佳列数（考虑间距和最大组件宽度）
  const maxWidth = Math.max(...components.map(c => getComponentSize(c).width));
  const availableWidth = bounds.width - bounds.padding * 2;
  const cols = Math.max(
    1,
    Math.min(
      components.length,
      Math.floor(availableWidth / (maxWidth + COMPONENT_PADDING))
    )
  );

  const layouts: ComponentLayout[] = [];
  const rowHeights: number[] = []; // 记录每行的实际高度
  let currentRow = 0;
  let currentCol = 0;

  for (const component of components) {
    const size = getComponentSize(component);
    const scale = component.scale || 1;

    // 检查是否需要换行
    if (currentCol >= cols) {
      currentRow++;
      currentCol = 0;
    }

    // 计算当前行的起始 Y 位置（累加之前所有行的高度）
    let y = bounds.padding;
    for (let i = 0; i < currentRow; i++) {
      y += (rowHeights[i] || avgSize.height) + COMPONENT_PADDING;
    }

    // 计算 X 位置（考虑列宽）
    const colWidth = (availableWidth - (cols - 1) * COMPONENT_PADDING) / cols;
    const x = bounds.padding + currentCol * (colWidth + COMPONENT_PADDING) + (colWidth - size.width) / 2;

    layouts.push({
      id: component.id,
      x: Math.max(bounds.padding, x), // 确保不超出左边界
      y: y,
      width: size.width,
      height: size.height,
      scale,
    });

    // 更新当前行高度（取最大值）
    if (!rowHeights[currentRow]) {
      rowHeights[currentRow] = size.height;
    } else {
      rowHeights[currentRow] = Math.max(rowHeights[currentRow], size.height);
    }

    currentCol++;
  }

  return layouts;
}

/**
 * 流式布局算法（适用于 Secondary Zone）
 * 类似 CSS flex-wrap，自动换行
 * 改进版：更智能的换行逻辑，考虑组件实际尺寸
 */
function flowLayout(
  components: UIComponentConfig[],
  bounds: LayoutBounds
): ComponentLayout[] {
  if (components.length === 0) return [];

  const layouts: ComponentLayout[] = [];
  let currentX = bounds.padding;
  let currentY = bounds.padding;
  let currentRowHeight = 0;
  const availableWidth = bounds.width - bounds.padding * 2;

  for (const component of components) {
    const size = getComponentSize(component);
    const scale = component.scale || 1;

    // 检查是否需要换行（考虑当前组件是否能放下）
    if (currentX + size.width > bounds.width - bounds.padding && currentX > bounds.padding) {
      // 换行：移动到下一行
      currentX = bounds.padding;
      currentY += currentRowHeight + COMPONENT_PADDING;
      currentRowHeight = 0;
    }

    layouts.push({
      id: component.id,
      x: currentX,
      y: currentY,
      width: size.width,
      height: size.height,
      scale,
    });

    // 更新位置
    currentX += size.width + COMPONENT_PADDING;
    currentRowHeight = Math.max(currentRowHeight, size.height);
  }

  return layouts;
}

/**
 * 碰撞检测布局算法（更智能，避免重叠）
 * 使用类似 bin packing 的算法
 */
function collisionFreeLayout(
  components: UIComponentConfig[],
  bounds: LayoutBounds,
  layoutType: 'grid' | 'flow' = 'grid'
): ComponentLayout[] {
  if (components.length === 0) return [];

  // 对于 Primary Zone，使用改进的网格布局
  if (layoutType === 'grid') {
    return gridLayout(components, bounds);
  }

  // 对于 Secondary Zone，使用流式布局
  return flowLayout(components, bounds);
}

/**
 * 计算布局
 * @param components 组件列表（已按 order 排序）
 * @param containerWidth 容器宽度
 * @param containerHeight 容器高度
 * @param layoutType 布局类型：'grid' 用于 Primary Zone，'flow' 用于 Secondary Zone
 * @param primaryLayouts 可选的 Primary Zone 布局，用于对齐 Secondary Zone
 */
export function calculateLayout(
  components: UIComponentConfig[],
  containerWidth: number,
  containerHeight: number,
  layoutType: 'grid' | 'flow' = 'grid',
  primaryLayouts?: ComponentLayout[]
): ComponentLayout[] {
  const bounds: LayoutBounds = {
    width: containerWidth,
    height: containerHeight,
    padding: 12, // 与 COMPONENT_PADDING 保持一致，使布局更紧凑
  };

  let layouts = collisionFreeLayout(components, bounds, layoutType);

  // 如果提供了 Primary Zone 布局，使用相同的列配置对齐 Secondary Zone
  if (primaryLayouts && primaryLayouts.length > 0 && layouts.length > 0 && layoutType === 'grid') {
    // 从 Primary Zone 布局中提取列配置信息
    // 计算 Primary Zone 的列宽和间距
    const primaryXPositions = primaryLayouts.map(l => l.x).sort((a, b) => a - b);
    const primaryFirstX = primaryXPositions[0];

    // 计算 Primary Zone 的列宽（通过相邻组件的间距）
    let primaryColWidth = 0;
    let primarySpacing = 0;

    if (primaryXPositions.length > 1) {
      // 找到第一个和第二个组件的间距
      const firstComponentWidth = primaryLayouts.find(l => l.x === primaryFirstX)?.width || 300;
      primarySpacing = primaryXPositions[1] - primaryFirstX - firstComponentWidth;
      primaryColWidth = firstComponentWidth + primarySpacing;
    } else {
      // 如果只有一个组件，使用默认值
      const firstComponentWidth = primaryLayouts[0].width;
      primaryColWidth = firstComponentWidth + COMPONENT_PADDING;
    }

    // 重新计算 Secondary Zone 布局，使用与 Primary Zone 相同的列配置
    const availableWidth = bounds.width - bounds.padding * 2;
    const componentWidth = layouts[0].width;

    // 计算能放多少列（使用 Primary Zone 的列宽）
    const maxCols = Math.floor(availableWidth / primaryColWidth) + 1;
    const cols = Math.min(maxCols, components.length);

    // 重新布局 Secondary Zone，使用 Primary Zone 的列配置
    const alignedLayouts: ComponentLayout[] = [];
    const rowHeights: number[] = [];
    let currentRow = 0;
    let currentCol = 0;

    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      const size = getComponentSize(component);
      const scale = component.scale || 1;

      // 检查是否需要换行
      if (currentCol >= cols) {
        currentRow++;
        currentCol = 0;
      }

      // 计算 Y 位置
      let y = bounds.padding;
      for (let row = 0; row < currentRow; row++) {
        y += (rowHeights[row] || size.height) + COMPONENT_PADDING;
      }

      // 使用 Primary Zone 的列配置计算 X 位置
      const x = primaryFirstX + currentCol * primaryColWidth;

      alignedLayouts.push({
        id: component.id,
        x: x,
        y: y,
        width: size.width,
        height: size.height,
        scale,
      });

      // 更新行高度
      if (!rowHeights[currentRow]) {
        rowHeights[currentRow] = size.height;
      } else {
        rowHeights[currentRow] = Math.max(rowHeights[currentRow], size.height);
      }

      currentCol++;
    }

    layouts = alignedLayouts;
  } else if (primaryLayouts && primaryLayouts.length > 0 && layouts.length > 0) {
    // 对于非 grid 布局，使用简单的偏移对齐
    const firstPrimaryX = primaryLayouts[0].x;
    const firstSecondaryX = layouts[0].x;
    const offsetX = firstPrimaryX - firstSecondaryX;

    layouts = layouts.map(layout => ({
      ...layout,
      x: layout.x + offsetX,
    }));
  }

  // 调试信息：打印布局计算结果
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔧 布局计算 [${layoutType}]`);
    console.log(`容器尺寸: ${containerWidth} × ${containerHeight}`);
    console.log(`组件数量: ${components.length}`);
    console.table(
      layouts.map((layout) => {
        const comp = components.find((c) => c.id === layout.id);
        return {
          id: layout.id,
          scale: comp?.scale || 1,
          size: `${layout.width} × ${layout.height}`,
          position: `(${Math.round(layout.x)}, ${Math.round(layout.y)})`,
        };
      })
    );
    console.groupEnd();
  }

  return layouts;
}

