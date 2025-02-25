
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { FileUploader } from '@/components/FileUploader';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { FileList } from '@/components/FileList';
import { LogAnalysisChat } from '@/components/LogAnalysisChat';
import { Card } from "@/components/ui/card";

interface AnalysisResult {
  file_name: string;
  wait_time: string;
  trigger_time: string;
  pressure_readings: number;
  duration_ms: number;
  max_pressure: string;
  raw_content: string; // Add raw content storage
  settings: Record<string, string>; // Store all settings
  battery_info: Record<string, string>; // Store battery information
  temperatures: string[]; // Store temperature readings
  system_events: string[]; // Store system events
}

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleFilesSelected = (newFiles: File[]) => {
    const logFiles = newFiles.filter(file => file.name.endsWith('.log'));
    if (logFiles.length !== newFiles.length) {
      toast({
        title: "Invalid file type",
        description: "Only .log files are supported",
        variant: "destructive",
      });
    }
    setFiles(prevFiles => [...prevFiles, ...logFiles]);
  };

  const handleRemoveFile = (fileName: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
  };

  const parseLogFile = (content: string): AnalysisResult => {
    const lines = content.split('\n');
    let wait_time = '';
    let trigger_time = '';
    let pressure_readings: number[] = [];
    let measuring = false;
    const settings: Record<string, string> = {};
    const battery_info: Record<string, string> = {};
    const temperatures: string[] = [];
    const system_events: string[] = [];

    for (const line of lines) {
      // Store settings
      if (line.includes("Setting")) {
        const settingMatch = line.match(/Setting "(\w+)" (?:value is|changed from .* to) (.*)/);
        if (settingMatch) {
          settings[settingMatch[1]] = settingMatch[2];
        }
      }

      // Store battery info
      if (line.includes("battery")) {
        const batteryMatch = line.match(/battery(\w+) = (.*)/);
        if (batteryMatch) {
          battery_info[batteryMatch[1]] = batteryMatch[2];
        }
      }

      // Store temperature readings
      if (line.includes("C")) {
        const tempMatch = line.match(/(\d+\.\d+)C/);
        if (tempMatch) {
          temperatures.push(tempMatch[1]);
        }
      }

      // Store system events
      if (line.includes("Manager")) {
        system_events.push(line.trim());
      }

      // Look for the start of pressure readings
      if (line.includes("Waiting to trigger with sample")) {
        measuring = true;
        const timeMatch = line.match(/\((.*?)_CST\)/);
        if (timeMatch) {
          wait_time = timeMatch[1].replace(/_/g, ' ');
        }
        continue;
      }

      // Look for trigger event
      if (measuring && (line.includes("Triggered!") || line.includes("TIME TO VENT"))) {
        const timeMatch = line.match(/\((.*?)_CST\)/);
        if (timeMatch) {
          trigger_time = timeMatch[1].replace(/_/g, ' ');
        }
        break;
      }

      // Collect pressure readings
      if (measuring) {
        const pressureMatch = line.match(/(\d+\.\d+)psi/);
        if (pressureMatch) {
          pressure_readings.push(parseFloat(pressureMatch[1]));
        }
      }
    }

    return {
      file_name: '',  // Will be set by the caller
      wait_time,
      trigger_time,
      pressure_readings: pressure_readings.length,
      duration_ms: pressure_readings.length * 50, // Each reading is 50ms
      max_pressure: pressure_readings.length > 0 ? Math.max(...pressure_readings).toFixed(3) : "0.000",
      raw_content: content,
      settings,
      battery_info,
      temperatures,
      system_events
    };
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    
    try {
      const results = await Promise.all(files.map(async (file) => {
        return new Promise<AnalysisResult>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            const result = parseLogFile(content);
            result.file_name = file.name;
            resolve(result);
          };
          reader.readAsText(file);
        });
      }));

      setResults(results);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${files.length} file(s)`,
      });
    } catch (error) {
      console.error('Error analyzing files:', error);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing the files",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Bubble Sensor Analysis</h1>
          <p className="text-muted-foreground">Upload your log files to analyze bubble sensor data</p>
        </div>

        <div className="grid gap-6">
          <Card className="p-6">
            <FileUploader onFilesSelected={handleFilesSelected} />
          </Card>

          {files.length > 0 && (
            <Card className="p-6 animate-file-drop">
              <FileList 
                files={files} 
                onRemove={handleRemoveFile} 
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            </Card>
          )}

          {results.length > 0 && (
            <>
              <Card className="p-6 animate-results-appear">
                <ResultsDisplay results={results} />
              </Card>
              <LogAnalysisChat results={results} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
