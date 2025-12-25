
import React from 'react';
import { UIComponentConfig, ComponentId } from '../types';
import { COMPONENT_METADATA } from '../constants';

interface InstrumentProps {
  config: UIComponentConfig;
  value: string | number;
  theme: 'dark' | 'light';
}

export const Instrument: React.FC<InstrumentProps> = ({ config, value, theme }) => {
  if (!config.visible) return null;

  const isDark = theme === 'dark';
  const meta = COMPONENT_METADATA[config.id as ComponentId];

  // 计算实际尺寸（考虑 scale）
  const scale = config.scale || 1;
  const baseWidth = 300; // 与 layoutEngine.ts 中的 BASE_COMPONENT_WIDTH 保持一致
  const baseHeight = 210; // 与 layoutEngine.ts 中的 BASE_COMPONENT_HEIGHT 保持一致
  const actualWidth = baseWidth * scale;
  const actualHeight = baseHeight * scale;

  // Dynamic styles based on config
  const style: React.CSSProperties = {
    color: config.color || (isDark ? '#e2e8f0' : '#1e293b'),
    backgroundColor: config.bgColor || (isDark ? '#1e293b' : '#f1f5f9'),
    width: `${actualWidth}px`,
    height: `${actualHeight}px`,
    borderColor: config.isCore ? (isDark ? '#38bdf8' : '#0284c7') : 'transparent',
  };

  const numValue = typeof value === 'number' ? value : 0;
  const max = meta?.max || 100;
  const min = meta?.min || 0;
  const percentage = Math.min(100, Math.max(0, ((numValue - min) / (max - min)) * 100));

  const renderVisuals = () => {
    switch (config.visualizationType) {
      case 'bar':
        return (
          <div className="w-full mt-2 h-4 bg-gray-500/20 rounded-full overflow-hidden relative">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${percentage}%`,
                backgroundColor: config.color || (isDark ? '#38bdf8' : '#0284c7')
              }}
            />
          </div>
        );
      case 'ring':
        // 扇形仪表盘 - 使用 SVG 创建完整的圆形仪表盘
        const ringSize = Math.min(actualWidth * 0.7, actualHeight * 0.7); // 仪表盘大小，适配组件尺寸
        const ringRadius = ringSize / 2 - 8; // 留出边距
        const centerX = actualWidth / 2;
        const centerY = actualHeight / 2;
        const strokeWidth = Math.max(8, ringSize * 0.08); // 线条宽度，根据尺寸自适应

        // 计算扇形角度（从 -135° 到 135°，共 270°）
        const startAngle = -135; // 起始角度（左上）
        const endAngle = 135; // 结束角度（右上）
        const totalAngle = endAngle - startAngle; // 270度
        const currentAngle = startAngle + (percentage / 100) * totalAngle;

        // 将角度转换为弧度
        const toRadians = (deg: number) => (deg * Math.PI) / 180;

        // 计算圆弧路径
        const getArcPath = (start: number, end: number) => {
          const startRad = toRadians(start);
          const endRad = toRadians(end);
          const x1 = centerX + ringRadius * Math.cos(startRad);
          const y1 = centerY + ringRadius * Math.sin(startRad);
          const x2 = centerX + ringRadius * Math.cos(endRad);
          const y2 = centerY + ringRadius * Math.sin(endRad);
          const largeArcFlag = end - start > 180 ? 1 : 0;

          return `M ${x1} ${y1} A ${ringRadius} ${ringRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
        };

        // 计算颜色（根据百分比渐变）
        const getRingColor = () => {
          if (percentage < 30) return isDark ? '#ef4444' : '#dc2626'; // 红色（低）
          if (percentage < 70) return isDark ? '#f59e0b' : '#d97706'; // 橙色（中）
          return config.color || (isDark ? '#38bdf8' : '#0284c7'); // 蓝色（高）或自定义颜色
        };

        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width={actualWidth}
              height={actualHeight}
              className="overflow-visible"
            >
              {/* 背景圆弧 */}
              <path
                d={getArcPath(startAngle, endAngle)}
                stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
              />

              {/* 进度圆弧 */}
              <path
                d={getArcPath(startAngle, currentAngle)}
                stroke={getRingColor()}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />

              {/* 中心数字 */}
              <text
                x={centerX}
                y={centerY + ringRadius * 0.3}
                textAnchor="middle"
                className="font-mono font-bold fill-current"
                style={{
                  fontSize: `${Math.max(16, ringSize * 0.15)}px`,
                  opacity: 0.9,
                }}
              >
                {typeof value === 'number' ? value.toLocaleString() : value}
              </text>

              {/* 单位（如果有） */}
              {meta?.unit && (
                <text
                  x={centerX}
                  y={centerY + ringRadius * 0.5}
                  textAnchor="middle"
                  className="font-mono fill-current"
                  style={{
                    fontSize: `${Math.max(10, ringSize * 0.08)}px`,
                    opacity: 0.6,
                  }}
                >
                  {meta.unit}
                </text>
              )}
            </svg>
          </div>
        );
      case 'text':
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        relative p-4 rounded-lg shadow-md border-l-4 transition-all duration-300 ease-in-out
        flex flex-col justify-between
        box-border
      `}
      style={style}
    >
      {/* 标签显示 */}
      {config.visualizationType === 'ring' ? (
        // ring 类型：标签显示在顶部
        <div className="absolute top-2 left-4 z-10">
          <div className="text-xs uppercase tracking-wider font-semibold" style={{ opacity: 0.7 }}>
            {config.label || meta?.label || config.id}
          </div>
        </div>
      ) : (
        // text 和 bar 类型：标签显示在正常位置
        <div
          className="text-xs uppercase tracking-wider font-semibold mb-1 z-10"
          style={{ opacity: 0.7 }}
        >
          {config.label || meta?.label || config.id}
        </div>
      )}

      {/* 只在 text 和 bar 类型时显示大数字 */}
      {config.visualizationType !== 'ring' && (
        <div className="flex items-end gap-1 z-10">
          <span className="text-3xl font-mono font-bold leading-none">
            {value}
          </span>
          {config.visualizationType === 'text' && meta?.unit && (
            <span className="text-sm font-mono opacity-60 mb-1">{meta.unit}</span>
          )}
        </div>
      )}

      {renderVisuals()}

      {config.isCore && (
        <div className="absolute top-2 right-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
        </div>
      )}
    </div>
  );
};
