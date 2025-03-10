
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UnitErrorSummaryProps {
  unitCycles: Record<string, number>;
  unitErrors: Record<string, number>;
}

export const UnitErrorSummary = ({ unitCycles, unitErrors }: UnitErrorSummaryProps) => {
  const units = Object.keys(unitCycles).sort();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Rates by Unit</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit</TableHead>
              <TableHead>Total Cycles</TableHead>
              <TableHead>Errors</TableHead>
              <TableHead>Error Rate</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map(unit => {
              const cycles = unitCycles[unit] || 0;
              const errors = unitErrors[unit] || 0;
              const errorRate = cycles > 0 ? ((errors / cycles) * 100).toFixed(1) : "0.0";
              
              // Determine status based on error rate
              let status = "Good";
              let statusClass = "text-green-600";
              
              if (parseFloat(errorRate) > 5) {
                status = "Critical";
                statusClass = "text-red-600 font-bold";
              } else if (parseFloat(errorRate) > 1) {
                status = "Warning";
                statusClass = "text-amber-600 font-medium";
              }
              
              return (
                <TableRow key={unit}>
                  <TableCell className="font-medium">Unit {unit}</TableCell>
                  <TableCell>{cycles}</TableCell>
                  <TableCell>{errors}</TableCell>
                  <TableCell>{errorRate}%</TableCell>
                  <TableCell className={statusClass}>{status}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
