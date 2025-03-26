
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisResult } from '@/utils/chartUtils';

interface UnitComparisonAnalysisProps {
  results: AnalysisResult[];
  unitSelections: Record<string, string>;
}

export const UnitComparisonAnalysis = ({ results, unitSelections }: UnitComparisonAnalysisProps) => {
  const { toast } = useToast();
  const [comparisonMetric, setComparisonMetric] = useState<"max_pressure" | "duration_ms" | "pressure_readings">("max_pressure");

  // Group results by unit
  const unitData = useMemo(() => {
    const unitMap: Record<string, AnalysisResult[]> = {};
    
    results.forEach(result => {
      const unit = unitSelections[result.file_name];
      if (unit) {
        if (!unitMap[unit]) {
          unitMap[unit] = [];
        }
        unitMap[unit].push(result);
      }
    });
    
    return unitMap;
  }, [results, unitSelections]);

  // Create comparison data for charts
  const comparisonData = useMemo(() => {
    // Calculate averages for each unit
    const unitAverages = Object.entries(unitData).map(([unit, unitResults]) => {
      const avgMaxPressure = unitResults.reduce((sum, result) => sum + parseFloat(result.max_pressure), 0) / unitResults.length;
      const avgDuration = unitResults.reduce((sum, result) => sum + result.duration_ms, 0) / unitResults.length;
      const avgReadings = unitResults.reduce((sum, result) => sum + result.pressure_readings, 0) / unitResults.length;
      
      return {
        unit,
        avgMaxPressure: parseFloat(avgMaxPressure.toFixed(3)),
        avgDuration: parseFloat(avgDuration.toFixed(1)),
        avgReadings: parseFloat(avgReadings.toFixed(1)),
        cycleCount: unitResults.length,
      };
    });

    // Create cycle-by-cycle comparison
    const cycleComparison = Object.entries(unitData).flatMap(([unit, unitResults]) => {
      return unitResults.map((result, index) => ({
        unit,
        cycle: index + 1,
        maxPressure: parseFloat(result.max_pressure),
        duration: result.duration_ms,
        readings: result.pressure_readings,
        fileName: result.file_name,
      }));
    });

    return {
      unitAverages,
      cycleComparison,
    };
  }, [unitData]);

  // Generate statistical analysis 
  const statistics = useMemo(() => {
    const stats: Record<string, any> = {};
    
    Object.entries(unitData).forEach(([unit, unitResults]) => {
      const maxPressures = unitResults.map(r => parseFloat(r.max_pressure));
      const durations = unitResults.map(r => r.duration_ms);
      const readings = unitResults.map(r => r.pressure_readings);
      
      stats[unit] = {
        maxPressure: {
          min: Math.min(...maxPressures).toFixed(3),
          max: Math.max(...maxPressures).toFixed(3),
          avg: (maxPressures.reduce((a, b) => a + b, 0) / maxPressures.length).toFixed(3),
          stdDev: calculateStdDev(maxPressures).toFixed(3),
        },
        duration: {
          min: Math.min(...durations),
          max: Math.max(...durations),
          avg: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1),
          stdDev: calculateStdDev(durations).toFixed(1),
        },
        readings: {
          min: Math.min(...readings),
          max: Math.max(...readings),
          avg: (readings.reduce((a, b) => a + b, 0) / readings.length).toFixed(1),
          stdDev: calculateStdDev(readings).toFixed(1),
        },
        cycleCount: unitResults.length,
      };
    });
    
    return stats;
  }, [unitData]);

  // Helper function to calculate standard deviation
  const calculateStdDev = (values: number[]) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  };

  // Export comparison data
  const handleExportComparison = () => {
    const wb = XLSX.utils.book_new();
    
    // Create summary sheet with averages
    const summaryData = comparisonData.unitAverages.map(unitAvg => ({
      'Unit': unitAvg.unit,
      'Avg Max Pressure (psi)': unitAvg.avgMaxPressure,
      'Avg Duration (ms)': unitAvg.avgDuration, 
      'Avg Readings': unitAvg.avgReadings,
      'Cycle Count': unitAvg.cycleCount,
    }));
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Unit Summary');
    
    // Create detailed comparison sheet
    const detailedData = comparisonData.cycleComparison.map(cycle => ({
      'Unit': cycle.unit,
      'Cycle': cycle.cycle,
      'Max Pressure (psi)': cycle.maxPressure,
      'Duration (ms)': cycle.duration,
      'Readings': cycle.readings,
      'File': cycle.fileName,
    }));
    
    const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, detailedSheet, 'Cycle Details');
    
    // Create statistics sheet
    const statsData = Object.entries(statistics).flatMap(([unit, stats]) => {
      return [
        {
          'Unit': unit,
          'Metric': 'Max Pressure (psi)',
          'Min': stats.maxPressure.min,
          'Max': stats.maxPressure.max,
          'Average': stats.maxPressure.avg,
          'Std Dev': stats.maxPressure.stdDev,
        },
        {
          'Unit': unit,
          'Metric': 'Duration (ms)',
          'Min': stats.duration.min,
          'Max': stats.duration.max,
          'Average': stats.duration.avg,
          'Std Dev': stats.duration.stdDev,
        },
        {
          'Unit': unit,
          'Metric': 'Pressure Readings',
          'Min': stats.readings.min,
          'Max': stats.readings.max,
          'Average': stats.readings.avg,
          'Std Dev': stats.readings.stdDev,
        },
      ];
    });
    
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsSheet, 'Statistics');
    
    // Save workbook
    XLSX.writeFile(wb, 'unit_comparison_analysis.xlsx');
    
    toast({
      title: "Export Complete",
      description: "Unit comparison data has been exported to Excel",
    });
  };

  // Only show component if we have at least 2 units with data
  const hasMultipleUnits = Object.keys(unitData).length >= 2;
  if (!hasMultipleUnits) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Unit Comparison Analysis</CardTitle>
        <Button onClick={handleExportComparison} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Comparison
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="averages">
          <TabsList>
            <TabsTrigger value="averages">Average Metrics</TabsTrigger>
            <TabsTrigger value="cycles">Cycle Comparison</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="averages" className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Button 
                variant={comparisonMetric === "max_pressure" ? "default" : "outline"}
                onClick={() => setComparisonMetric("max_pressure")}
              >
                Max Pressure
              </Button>
              <Button 
                variant={comparisonMetric === "duration_ms" ? "default" : "outline"}
                onClick={() => setComparisonMetric("duration_ms")}
              >
                Duration
              </Button>
              <Button 
                variant={comparisonMetric === "pressure_readings" ? "default" : "outline"}
                onClick={() => setComparisonMetric("pressure_readings")}
              >
                Readings
              </Button>
            </div>
            
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonData.unitAverages}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="unit" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {comparisonMetric === "max_pressure" && (
                    <Bar 
                      name="Avg Max Pressure (psi)" 
                      dataKey="avgMaxPressure" 
                      fill="#2563eb" 
                    />
                  )}
                  {comparisonMetric === "duration_ms" && (
                    <Bar 
                      name="Avg Duration (ms)" 
                      dataKey="avgDuration" 
                      fill="#16a34a" 
                    />
                  )}
                  {comparisonMetric === "pressure_readings" && (
                    <Bar 
                      name="Avg Readings" 
                      dataKey="avgReadings" 
                      fill="#ca8a04" 
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="cycles" className="space-y-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={comparisonData.cycleComparison}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cycle" label={{ value: 'Cycle', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Max Pressure (psi)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      if (name === "maxPressure") return [`${value} psi`, "Max Pressure"];
                      return [value, name];
                    }}
                    labelFormatter={(value) => `Cycle ${value}`}
                  />
                  <Legend />
                  {Object.keys(unitData).map((unit, index) => (
                    <Line
                      key={unit}
                      type="monotone"
                      dataKey="maxPressure"
                      data={comparisonData.cycleComparison.filter(item => item.unit === unit)}
                      name={unit}
                      stroke={["#2563eb", "#dc2626", "#16a34a", "#ca8a04"][index % 4]}
                      activeDot={{ r: 8 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="statistics" className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Unit</th>
                    <th className="text-left p-2">Metric</th>
                    <th className="text-left p-2">Min</th>
                    <th className="text-left p-2">Max</th>
                    <th className="text-left p-2">Average</th>
                    <th className="text-left p-2">Std Dev</th>
                    <th className="text-left p-2">Cycles</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statistics).flatMap(([unit, stats]) => [
                    <tr key={`${unit}-pressure`} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{unit}</td>
                      <td className="p-2">Max Pressure (psi)</td>
                      <td className="p-2">{stats.maxPressure.min}</td>
                      <td className="p-2">{stats.maxPressure.max}</td>
                      <td className="p-2">{stats.maxPressure.avg}</td>
                      <td className="p-2">{stats.maxPressure.stdDev}</td>
                      <td className="p-2">{stats.cycleCount}</td>
                    </tr>,
                    <tr key={`${unit}-duration`} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{unit}</td>
                      <td className="p-2">Duration (ms)</td>
                      <td className="p-2">{stats.duration.min}</td>
                      <td className="p-2">{stats.duration.max}</td>
                      <td className="p-2">{stats.duration.avg}</td>
                      <td className="p-2">{stats.duration.stdDev}</td>
                      <td className="p-2">{stats.cycleCount}</td>
                    </tr>,
                    <tr key={`${unit}-readings`} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{unit}</td>
                      <td className="p-2">Pressure Readings</td>
                      <td className="p-2">{stats.readings.min}</td>
                      <td className="p-2">{stats.readings.max}</td>
                      <td className="p-2">{stats.readings.avg}</td>
                      <td className="p-2">{stats.readings.stdDev}</td>
                      <td className="p-2">{stats.cycleCount}</td>
                    </tr>
                  ])}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
