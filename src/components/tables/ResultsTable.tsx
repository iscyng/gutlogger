
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalysisResult } from '@/utils/chartUtils';

interface ResultsTableProps {
  results: AnalysisResult[];
  selectedFiles: Set<string>;
  unitSelections: Record<string, string>;
  isLoading: boolean;
  onUnitChange: (fileName: string, unit: string) => void;
  onToggleFileSelection: (fileName: string) => void;
}

const UNIT_OPTIONS = Array.from({ length: 17 }, (_, i) => `Unit ${i + 1}`);

export const ResultsTable = ({ 
  results, 
  selectedFiles, 
  unitSelections, 
  isLoading, 
  onUnitChange,
  onToggleFileSelection 
}: ResultsTableProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Pressure Readings</TableHead>
            <TableHead>Duration (ms)</TableHead>
            <TableHead>Max Pressure</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow 
              key={result.file_name}
              className={selectedFiles.has(result.file_name) ? "bg-muted/50" : ""}
            >
              <TableCell>{result.file_name}</TableCell>
              <TableCell>
                <Select
                  value={unitSelections[result.file_name] || ''}
                  onValueChange={(value) => onUnitChange(result.file_name, value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{result.pressure_readings}</TableCell>
              <TableCell>{result.duration_ms}</TableCell>
              <TableCell>{result.max_pressure}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFileSelection(result.file_name)}
                >
                  {selectedFiles.has(result.file_name) ? "Hide Graph" : "Show Graph"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
