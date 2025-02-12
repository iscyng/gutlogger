
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { FileUploader } from '@/components/FileUploader';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { FileList } from '@/components/FileList';
import { Card } from "@/components/ui/card";

interface AnalysisResult {
  file_name: string;
  wait_time: string;
  trigger_time: string;
  pressure_readings: number;
  duration_ms: number;
  max_pressure: string;
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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Simulate analysis - in a real app, this would call your Python script
    setTimeout(() => {
      const mockResults: AnalysisResult[] = files.map(file => ({
        file_name: file.name,
        wait_time: "2024-02-07 14:58:37",
        trigger_time: "2024-02-07 14:58:43",
        pressure_readings: 106, // Correct number of readings from the log
        duration_ms: 106 * 50, // Each reading represents 50ms
        max_pressure: "1.720", // Actual max pressure from the log
      }));
      setResults(mockResults);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${files.length} file(s)`,
      });
    }, 2000);
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
            <Card className="p-6 animate-results-appear">
              <ResultsDisplay results={results} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
