import React, { useState } from 'react';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { Filter } from 'lucide-react';

const chart = {
  width: 960,
  height: 360,
  left: 62,
  right: 20,
  top: 24,
  baseline: 270,
  rowsPerLead: 3,
};

const splitLabel = (label = '') => {
  if (label.length <= 17) return [label];
  const words = label.split(' ');
  let bestSplit = 1;
  let smallestDifference = Infinity;
  for (let index = 1; index < words.length; index += 1) {
    const difference = Math.abs(words.slice(0, index).join(' ').length - words.slice(index).join(' ').length);
    if (difference < smallestDifference) {
      bestSplit = index;
      smallestDifference = difference;
    }
  }
  return [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
};

export const LeadFunnelChart = ({ funnel = [], isLoading }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const totalInFunnel = funnel.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const maxCount = Math.max(4, Math.ceil(Math.max(...funnel.map((item) => item.count || 0), 0) / 2) * 2);
  const plotHeight = chart.baseline - chart.top;
  const plotWidth = chart.width - chart.left - chart.right;
  const tileRows = maxCount * chart.rowsPerLead;
  const rowHeight = plotHeight / tileRows;
  const tileSize = Math.min(8, rowHeight * 0.76);
  const itemGap = funnel.length > 1 ? plotWidth / funnel.length : plotWidth;
  const activeItem = hoveredIndex === null ? null : funnel[hoveredIndex];

  return (
    <Card
      title="Lead Conversion Funnel"
      subtitle="Progression from initial enquiry to enrolled student"
      action={
        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/70">
          {totalInFunnel} Leads in Funnel
        </span>
      }
    >
      {isLoading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="w-full h-64 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : totalInFunnel === 0 ? (
        <EmptyState
          icon={Filter}
          title="No Funnel Data"
          description="There are currently no active leads in the intake pipeline."
        />
      ) : (
        <div className="overflow-x-auto">
          <div className="relative h-[360px] min-w-[680px] w-full rounded-lg bg-slate-50/70 px-2 py-2">
            <svg
              viewBox={`0 0 ${chart.width} ${chart.height}`}
              preserveAspectRatio="none"
              className="h-full w-full"
              role="img"
              aria-label="Lead counts by lifecycle stage, shown as columns of square tiles"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {Array.from({ length: Math.floor(maxCount / 2) + 1 }, (_, index) => index * 2).map((tick) => {
                const y = chart.baseline - (tick / maxCount) * plotHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={chart.left}
                      x2={chart.width - chart.right}
                      y1={y}
                      y2={y}
                      stroke="#DFEAF0"
                      strokeDasharray="2 6"
                    />
                    <text x={chart.left - 14} y={y + 4} textAnchor="end" fill="#6C8791" fontSize="11">
                      {tick}
                    </text>
                  </g>
                );
              })}

              {funnel.map((item, index) => {
                const count = Math.max(0, item.count || 0);
                const centerX = chart.left + itemGap * (index + 0.5);
                const columnStep = tileSize + 2;
                // Fill each stage band with closely spaced tile columns so
                // neighboring stages read as one continuous chart surface.
                const columns = Math.max(3, Math.floor((itemGap - 18) / columnStep));
                const columnWidth = columns * tileSize + (columns - 1) * 2;
                const firstX = centerX - columnWidth / 2;
                const filledRows = Math.min(tileRows, count * chart.rowsPerLead);
                const labelLines = splitLabel(item.stage_display);

                return (
                  <g
                    key={item.stage}
                    tabIndex="0"
                    role="img"
                    aria-label={`${item.stage_display}: ${count} leads`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    className="group cursor-pointer outline-none"
                  >
                    {Array.from({ length: tileRows }, (_, row) =>
                      Array.from({ length: columns }, (_, column) => {
                        const filled = row < filledRows;
                        const y = chart.baseline - (row + 1) * rowHeight + (rowHeight - tileSize) / 2;
                        const blueShades = ['#00638E', '#397F9C', '#004A6B'];
                        return (
                          <rect
                            key={`${row}-${column}`}
                            x={firstX + column * columnStep}
                            y={y}
                            width={tileSize}
                            height={tileSize}
                            rx="1.5"
                            fill={filled ? blueShades[row % blueShades.length] : '#E3EBEF'}
                            className={filled ? 'transition-opacity group-hover:opacity-80' : undefined}
                          />
                        );
                      })
                    )}
                    <rect
                      x={centerX - itemGap / 2 + 4}
                      y={chart.top}
                      width={itemGap - 8}
                      height={plotHeight + 56}
                      fill="transparent"
                      className="hover:fill-blue-900/[0.025] focus:fill-blue-900/[0.04]"
                    />
                    <text
                      x={centerX}
                      y={chart.baseline + 22}
                      textAnchor="middle"
                      fill="#52656D"
                      fontSize="11"
                      fontWeight="500"
                    >
                      {labelLines.map((line, lineIndex) => (
                        <tspan key={lineIndex} x={centerX} dy={lineIndex === 0 ? 0 : 13}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                    <text x={centerX} y={chart.baseline + 51} textAnchor="middle" fill="#00638E" fontSize="10" fontWeight="700">
                      {count} {count === 1 ? 'lead' : 'leads'}
                    </text>
                  </g>
                );
              })}
            </svg>

            {activeItem && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
                style={{
                  left: `${((chart.left + itemGap * (hoveredIndex + 0.5)) / chart.width) * 100}%`,
                  top: `${Math.max(2, ((chart.baseline - ((activeItem.count || 0) / maxCount) * plotHeight - 54) / chart.height) * 100)}%`,
                }}
              >
                <p className="font-semibold text-slate-900">{activeItem.stage_display}</p>
                <p className="mt-0.5 text-slate-500">Active leads: <span className="font-bold text-slate-800">{activeItem.count}</span></p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
