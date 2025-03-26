
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { lineColors } from '@/utils/chartUtils';
import type { AnalysisResult } from '@/utils/chartUtils';

interface UnitComparisonAnalysisProps {
  results: AnalysisResult[];
  unitSelections: Record<string, string>;
}

interface UnitStats {
  avgMaxPressure: number;
  minMaxPressure: number;
  maxMaxPressure: number;
  stdDevMaxPressure: number;
  avgDuration: number;
  avgReadings: number;
  files: AnalysisResult[];
}

export const UnitComparisonAnalysis = ({ results, unitSelections }: UnitComparisonAnalysisProps) => {
  const [activeTab, setActiveTab] = useState<string>("summary");
  const { toast } = useToast();

  // Group results by unit and calculate statistics
  const unitStats = useMemo(() => {
    const unitGroups: Record<string, AnalysisResult[]> = {};
    
    // Group files by unit
    results.forEach(result => {
      const unit = unitSelections[result.file_name];
      if (unit) {
        if (!unitGroups[unit]) {
          unitGroups[unit] = [];
        }
        unitGroups[unit].push(result);
      }
    });
    
    // Calculate statistics for each unit
    const stats: Record<string, UnitStats> = {};
    Object.entries(unitGroups).forEach(([unit, unitResults]) => {
      const maxPressures = unitResults.map(r => parseFloat(r.max_pressure));
      const avgMaxPressure = maxPressures.reduce((sum, val) => sum + val, 0) / maxPressures.length;
      const minMaxPressure = Math.min(...maxPressures);
      const maxMaxPressure = Math.max(...maxPressures);
      
      // Calculate standard deviation
      const variance = maxPressures.reduce((sum, val) => sum + Math.pow(val - avgMaxPressure, 2), 0) / maxPressures.length;
      const stdDevMaxPressure = Math.sqrt(variance);
      
      const avgDuration = unitResults.reduce((sum, r) => sum + r.duration_ms, 0) / unitResults.length;
      const avgReadings = unitResults.reduce((sum, r) => sum + r.pressure_readings, 0) / unitResults.length;
      
      stats[unit] = {
        avgMaxPressure,
        minMaxPressure,
        maxMaxPressure,
        stdDevMaxPressure,
        avgDuration,
        avgReadings,
        files: unitResults
      };
    });
    
    return stats;
  }, [results, unitSelections]);

  // Check if we have at least two units to compare
  const hasMultipleUnits = Object.keys(unitStats).length >= 2;
  
  if (!hasMultipleUnits) {
    return null; // Don't render if there aren't multiple units to compare
  }

  // Prepare data for charts
  const summaryChartData = Object.entries(unitStats).map(([unit, stats]) => ({
    unit,
    avgPressure: parseFloat(stats.avgMaxPressure.toFixed(3)),
    minPressure: parseFloat(stats.minMaxPressure.toFixed(3)),
    maxPressure: parseFloat(stats.maxMaxPressure.toFixed(3)),
    stdDev: parseFloat(stats.stdDevMaxPressure.toFixed(3))
  }));

  // Function to export data to Excel
  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    
    // Create Summary sheet
    const summaryData = Object.entries(unitStats).map(([unit, stats]) => ({
      'Unit': unit,
      'Avg Max Pressure (psi)': stats.avgMaxPressure.toFixed(3),
      'Min Max Pressure (psi)': stats.minMaxPressure.toFixed(3),
      'Max Max Pressure (psi)': stats.maxMaxPressure.toFixed(3),
      'StdDev Max Pressure': stats.stdDevMaxPressure.toFixed(3),
      'Avg Duration (ms)': stats.avgDuration.toFixed(0),
      'Avg Readings': stats.avgReadings.toFixed(0),
      'Number of Files': stats.files.length
    }));
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Unit Comparison');
    
    // Add sheet for each unit with its test data
    Object.entries(unitStats).forEach(([unit, stats]) => {
      const unitData = stats.files.map(file => ({
        'File Name': file.file_name,
        'Max Pressure (psi)': file.max_pressure,
        'Duration (ms)': file.duration_ms,
        'Pressure Readings': file.pressure_readings
      }));
      
      const unitSheet = XLSX.utils.json_to_sheet(unitData);
      XLSX.utils.book_append_sheet(wb, unitSheet, `Unit ${unit} Data`);
    });

    // Save workbook
    XLSX.writeFile(wb, 'unit_comparison_analysis.xlsx');
    
    toast({
      title: "Export Complete",
      description: "Unit comparison data has been exported to Excel",
    });
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-semibold">Unit Comparison Analysis</CardTitle>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="bars">Bar Charts</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="mt-0">
            <h3 className="text-sm font-medium mb-2">Average Max Pressure by Unit</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="unit" />
                  <YAxis />
                  <Tooltip formatter={(value) => [parseFloat(value as string).toFixed(3), 'Pressure (psi)']} />
                  <Legend />
                  <Bar dataKey="avgPressure" fill={lineColors[0]} name="Avg Max Pressure" />
                  <Bar dataKey="stdDev" fill={lineColors[1]} name="Standard Deviation" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="bars" className="mt-0">
            <h3 className="text-sm font-medium mb-2">Min/Max Pressure Comparison</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="unit" />
                  <YAxis />
                  <Tooltip formatter={(value) => [parseFloat(value as string).toFixed(3), 'Pressure (psi)']} />
                  <Legend />
                  <Bar dataKey="minPressure" fill={lineColors[2]} name="Min Pressure" />
                  <Bar dataKey="avgPressure" fill={lineColors[0]} name="Avg Pressure" />
                  <Bar dataKey="maxPressure" fill={lineColors[3]} name="Max Pressure" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="stats" className="mt-0">
            <h3 className="text-sm font-medium mb-2">Statistical Comparison</h3>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Avg Max Pressure</TableHead>
                    <TableHead>Min Max Pressure</TableHead>
                    <TableHead>Max Max Pressure</TableHead>
                    <TableHead>StdDev</TableHead>
                    <TableHead>Avg Duration</TableHead>
                    <TableHead>Tests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(unitStats).map(([unit, stats]) => (
                    <TableRow key={unit}>
                      <TableCell className="font-medium">{unit}</TableCell>
                      <TableCell>{stats.avgMaxPressure.toFixed(3)}</TableCell>
                      <TableCell>{stats.minMaxPressure.toFixed(3)}</TableCell>
                      <TableCell>{stats.maxMaxPressure.toFixed(3)}</TableCell>
                      <TableCell>{stats.stdDevMaxPressure.toFixed(3)}</TableCell>
                      <TableCell>{stats.avgDuration.toFixed(0)} ms</TableCell>
                      <TableCell>{stats.files.length}</TableCell>
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
