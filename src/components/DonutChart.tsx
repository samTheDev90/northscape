import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props {
  value: number;
  total: number;
  label: string;
  amount: string;
  color: string;
  trackColor?: string;
  size?: number;
}

/**
 * Compact donut chart with a centered label and amount.
 * When total is 0, shows an empty ring.
 */
export default function DonutChart({
  value,
  total,
  label,
  amount,
  color,
  trackColor = "#292344",
  size = 140,
}: Props) {
  const safeTotal = Math.max(0, total);
  const safeValue = Math.max(0, Math.min(value, safeTotal));
  const remaining = Math.max(0, safeTotal - safeValue);

  const data =
    safeTotal === 0
      ? [{ name: "empty", value: 1 }]
      : [
          { name: "value", value: safeValue },
          { name: "remaining", value: remaining },
        ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="68%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive
              animationDuration={700}
            >
              {safeTotal === 0 ? (
                <Cell fill={trackColor} />
              ) : (
                <>
                  <Cell fill={color} />
                  <Cell fill={trackColor} />
                </>
              )}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[10px] text-textSecondary uppercase tracking-wider">
            {label}
          </div>
          <div className="text-base md:text-lg font-semibold text-textPrimary mt-0.5">
            {amount}
          </div>
        </div>
      </div>
    </div>
  );
}
