
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogSummary {
  fileName: string;
  unitNumber: string;
  importantLines: string[];
  errorCount: number;
  rlxxxLines: string[];
}

interface DetailedLogSummaryProps {
  logSummaries: LogSummary[];
  unitNumbers: string[];
}

export const DetailedLogSummary = ({ logSummaries, unitNumbers }: DetailedLogSummaryProps) => {
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [showBatteryOnly, setShowBatteryOnly] = useState(false);
  
  const filteredLogs = logSummaries.filter(log => 
    selectedUnit === "all" || log.unitNumber === selectedUnit
  );
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Detailed Log Summary</span>
          <div className="flex items-center gap-4">
            <select
              className="rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
            >
              <option value="all">All Units</option>
              {unitNumbers.map(unit => (
                <option key={unit} value={unit}>Unit {unit}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="batteryFilter"
                checked={showBatteryOnly}
                onChange={e => setShowBatteryOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <label htmlFor="batteryFilter" className="text-sm">
                Battery Stats Only
              </label>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list">
          <TabsList className="mb-4">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list">
            {filteredLogs.map(log => (
              <div key={log.fileName} className="mb-6 border rounded-md pb-2">
                <div className="bg-muted p-3 rounded-t-md flex items-center justify-between">
                  <div>
                    <span className="font-medium">{log.fileName}</span>
                    <span className="text-sm text-muted-foreground ml-2">(Unit: {log.unitNumber})</span>
                  </div>
                  <span className={`text-sm ${log.errorCount > 0 ? 'text-destructive font-medium' : ''}`}>
                    {log.errorCount > 0 ? `Errors: ${log.errorCount}` : 'No Errors'}
                  </span>
                </div>
                <ScrollArea className="h-[200px] p-3">
                  <ul className="space-y-1">
                    {log.importantLines
                      .filter(line => !showBatteryOnly || line.toLowerCase().includes('battery'))
                      .map((line, idx) => {
                        let className = "px-3 py-2 rounded-sm";
                        if (line.toUpperCase().includes('RECEIVED ERROR CODE')) {
                          className += " bg-red-100 border-l-4 border-red-500";
                        } else if (/RL\d{3}/.test(line)) {
                          className += " bg-amber-100 border-l-4 border-amber-500";
                        } else if (line.includes('ManagerSystemImplDevice: Started program')) {
                          className += " bg-green-100 border-l-4 border-green-500";
                        } else if (line.toLowerCase().includes('battery')) {
                          className += " bg-blue-100 border-l-4 border-blue-500";
                        } else {
                          className += " bg-gray-50";
                        }
                        
                        return (
                          <li key={idx} className={className}>
                            <pre className="text-xs whitespace-pre-wrap">{line}</pre>
                          </li>
                        );
                      })}
                  </ul>
                </ScrollArea>
              </div>
            ))}
          </TabsContent>
          
          <TabsContent value="table">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.fileName}>
                      <TableCell>{log.fileName}</TableCell>
                      <TableCell>{log.unitNumber}</TableCell>
                      <TableCell className={log.errorCount > 0 ? 'text-destructive font-medium' : ''}>
                        {log.errorCount}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => {
                          // This would show a dialog or expand the view
                          alert(`Details for ${log.fileName} would be shown here`);
                        }}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
