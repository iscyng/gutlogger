
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map(unit => {
              const cycles = unitCycles[unit] || 0;
              const errors = unitErrors[unit] || 0;
              const errorRate = cycles > 0 ? ((errors / cycles) * 100).toFixed(1) : "0.0";
              
              return (
                <TableRow key={unit}>
                  <TableCell className="font-medium">Unit {unit}</TableCell>
                  <TableCell>{cycles}</TableCell>
                  <TableCell>{errors}</TableCell>
                  <TableCell>{errorRate}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
