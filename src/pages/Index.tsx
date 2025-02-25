import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { FileUploader } from '@/components/FileUploader';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { FileList } from '@/components/FileList';
import { LogAnalysisChat } from '@/components/LogAnalysisChat';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getAllUnitSelections, UnitSelection } from '@/stores/unitSelections';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalysisResult {
  file_name: string;
  wait_time: string;
  trigger_time: string;
  pressure_readings: number;
  duration_ms: number;
  max_pressure: string;
  raw_content: string;
  settings: Record<string, string>;
  battery_info: Record<string, string>;
  temperatures: string[];
  system_events: string[];
}

const Index = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [unitSelections, setUnitSelections] = useState<UnitSelection[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const loadUnitSelections = async () => {
      try {
        const selections = await getAllUnitSelections();
        setUnitSelections(selections);
      } catch (error) {
        console.error('Error loading unit selections:', error);
        toast({
          title: "Error",
          description: "Failed to load unit selections",
          variant: "destructive",
        });
      }
    };
    loadUnitSelections();
  }, [toast]);

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

  const uniqueUnits = Array.from(new Set(unitSelections.map(selection => selection.unit))).sort();

  const filteredResults = selectedUnit
    ? results.filter(result => {
        const unitSelection = unitSelections.find(selection => selection.fileName === result.file_name);
        return unitSelection?.unit === selectedUnit;
      })
    : results;

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
          {uniqueUnits.length > 0 && (
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl">Filter by Unit</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select a unit to filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Units</SelectLabel>
                      <SelectItem value="">All Units</SelectItem>
                      {uniqueUnits.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          Unit {unit}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-sm text-muted-foreground">
                  {uniqueUnits.length} units found in database
                </p>
              </CardContent>
            </Card>
          )}

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

          {filteredResults.length > 0 && (
            <>
              <Card className="p-6 animate-results-appear">
                <ResultsDisplay results={filteredResults} />
              </Card>
              <LogAnalysisChat results={filteredResults} />
            </>
          )}
        </div>
      </div>
    </div>
  );
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
    if (line.includes("Setting")) {
      const settingMatch = line.match(/Setting "(\w+)" (?:value is|changed from .* to) (.*)/);
      if (settingMatch) {
        settings[settingMatch[1]] = settingMatch[2];
      }
    }

    if (line.includes("battery")) {
      const batteryMatch = line.match(/battery(\w+) = (.*)/);
      if (batteryMatch) {
        battery_info[batteryMatch[1]] = batteryMatch[2];
      }
    }

    if (line.includes("C")) {
      const tempMatch = line.match(/(\d+\.\d+)C/);
      if (tempMatch) {
        temperatures.push(tempMatch[1]);
      }
    }

    if (line.includes("Manager")) {
      system_events.push(line.trim());
    }

    if (line.includes("Waiting to trigger with sample")) {
      measuring = true;
      const timeMatch = line.match(/\((.*?)_CST\)/);
      if (timeMatch) {
        wait_time = timeMatch[1].replace(/_/g, ' ');
      }
      continue;
    }

    if (measuring && (line.includes("Triggered!") || line.includes("TIME TO VENT"))) {
      const timeMatch = line.match(/\((.*?)_CST\)/);
      if (timeMatch) {
        trigger_time = timeMatch[1].replace(/_/g, ' ');
      }
      break;
    }

    if (measuring) {
      const pressureMatch = line.match(/(\d+\.\d+)psi/);
      if (pressureMatch) {
        pressure_readings.push(parseFloat(pressureMatch[1]));
      }
    }
  }

  return {
    file_name: '',
    wait_time,
    trigger_time,
    pressure_readings: pressure_readings.length,
    duration_ms: pressure_readings.length * 50,
    max_pressure: pressure_readings.length > 0 ? Math.max(...pressure_readings).toFixed(3) : "0.000",
    raw_content: content,
    settings,
    battery_info,
    temperatures,
    system_events
  };
};

export default Index;
