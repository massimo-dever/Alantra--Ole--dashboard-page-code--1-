import { PivotTable } from "@/types/dashboard";

interface PivotPopoverProps {
  pivot: PivotTable;
  title: string;
}

export default function PivotPopover({ pivot, title }: PivotPopoverProps) {
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 50,
        top: "100%",
        left: 0,
        background: "white",
        border: "1px solid #ccc",
        padding: "12px",
        minWidth: "400px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <h4>{title}</h4>
      <table>
        <thead>
          <tr>
            {pivot.headers.map((h) => (
              <th key={h} style={{ padding: "4px 8px", textAlign: "right" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pivot.rows.map((row) => (
            <tr key={row.label}>
              <td style={{ padding: "4px 8px" }}>{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} style={{ padding: "4px 8px", textAlign: "right" }}>
                  {v.toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
