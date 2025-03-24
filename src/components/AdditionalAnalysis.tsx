
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BatteryStatsChart } from "./charts/BatteryStatsChart";
import { UnitErrorSummary } from "./UnitErrorSummary";
import { DetailedLogSummary } from "./DetailedLogSummary";
import * as ExcelJS from 'exceljs';

interface AnalysisResult {
  file_name: string;
  raw_content: string;
}

interface AdditionalAnalysisProps {
  results: AnalysisResult[];
  autoAnalyze?: boolean;
}

// Define the consistent BatteryStatEntry interface to fix type errors
interface BatteryStatEntry {
  timestamp: string;
  batteryPercent?: string;
  batteryTempMin?: string;
  batteryTempMax?: string;
  batteryCurrent?: string;
  batteryVoltage?: string;
  fileName: string;
  unitNumber: string;
  [key: string]: string | number | undefined;
}

interface ProgramStartEntry {
  fileName: string;
  unitNumber: string;
  programStart: string;
}

interface LogSummary {
  fileName: string;
  unitNumber: string;
  importantLines: string[];
  errorCount: number;
  rlxxxLines: string[];
}

interface AnalysisResponse {
  unitNumbers: string[];
  unitCycles: Record<string, number>;
  unitErrors: Record<string, number>;
  batteryStats: BatteryStatEntry[];
  programStarts: ProgramStartEntry[];
  logSummaries: LogSummary[];
}

export const AdditionalAnalysis = ({ results, autoAnalyze = false }: AdditionalAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (autoAnalyze && results.length > 0 && !analysisData && !isAnalyzing) {
      handleAnalyze();
    }
  }, [results, autoAnalyze, analysisData]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-additional-logs', {
        body: { 
          logData: results.map(result => ({
            file_name: result.file_name,
            raw_content: result.raw_content
          }))
        },
      });

      if (error) throw error;
      
      setAnalysisData(data);
      toast({
        title: "Additional Analysis Complete",
        description: "Additional log analysis has been completed successfully",
      });
    } catch (error) {
      console.error('Error in additional analysis:', error);
      toast({
        title: "Additional Analysis Failed",
        description: "Failed to complete the additional log analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportBatteryStats = () => {
    if (!analysisData || !analysisData.batteryStats.length) {
      toast({
        title: "Nothing to Export",
        description: "No battery statistics available to export",
        variant: "destructive",
      });
      return;
    }
    
    const wb = ExcelJS.utils.book_new();
    
    // Create data worksheet
    const batteryData = analysisData.batteryStats.map(stat => ({
      'Unit': stat.unitNumber,
      'Timestamp': stat.timestamp,
      'Battery %': stat.batteryPercent || '',
      'Min Temp': stat.batteryTempMin || '',
      'Max Temp': stat.batteryTempMax || '',
      'Current': stat.batteryCurrent || '',
      'Voltage': stat.batteryVoltage || '',
      'File': stat.fileName
    }));
    
    const ws = ExcelJS.utils.json_to_sheet(batteryData);
    ExcelJS.utils.book_append_sheet(wb, ws, 'Battery Stats');
    
    // Export workbook
    ExcelJS.writeFile(wb, 'battery_statistics.xlsx');
  };

  const handleExportProgramStarts = () => {
    if (!analysisData || !analysisData.programStarts.length) {
      toast({
        title: "Nothing to Export",
        description: "No program starts available to export",
        variant: "destructive",
      });
      return;
    }
    
    const wb = ExcelJS.utils.book_new();
    
    // Create data worksheet
    const programData = analysisData.programStarts.map(prog => ({
      'Unit': prog.unitNumber,
      'File': prog.fileName,
      'Program Start': prog.programStart
    }));
    
    const ws = ExcelJS.utils.json_to_sheet(programData);
    ExcelJS.utils.book_append_sheet(wb, ws, 'Program Starts');
    
    // Export workbook
    ExcelJS.writeFile(wb, 'program_starts.xlsx');
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Additional Log Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {!analysisData ? (
          <div className="text-center">
            <p className="mb-4">
              {isAnalyzing ? 
                "Running additional analysis to extract battery statistics, program starts, and error details..." :
                "Waiting for analysis to complete..."
              }
            </p>
            {!autoAnalyze && (
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || results.length === 0}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Run Additional Analysis"
                )}
              </Button>
            )}
            {isAnalyzing && (
              <div className="flex justify-center mt-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between">
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={handleExportBatteryStats}
                  disabled={!analysisData.batteryStats.length}
                >
                  Export Battery Stats
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportProgramStarts}
                  disabled={!analysisData.programStarts.length}
                >
                  Export Program Starts
                </Button>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setAnalysisData(null)}
              >
                Reset Analysis
              </Button>
            </div>
            
            <Tabs defaultValue="battery">
              <TabsList>
                <TabsTrigger value="battery">Battery Statistics</TabsTrigger>
                <TabsTrigger value="errors">Error Summary</TabsTrigger>
                <TabsTrigger value="logs">Detailed Logs</TabsTrigger>
              </TabsList>
              
              <TabsContent value="battery" className="pt-4">
                <BatteryStatsChart 
                  batteryStats={analysisData.batteryStats}
                  unitNumbers={analysisData.unitNumbers}
                />
              </TabsContent>
              
              <TabsContent value="errors" className="pt-4">
                <UnitErrorSummary 
                  unitCycles={analysisData.unitCycles}
                  unitErrors={analysisData.unitErrors}
                />
              </TabsContent>
              
              <TabsContent value="logs" className="pt-4">
                <DetailedLogSummary 
                  logSummaries={analysisData.logSummaries}
                  unitNumbers={analysisData.unitNumbers}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
