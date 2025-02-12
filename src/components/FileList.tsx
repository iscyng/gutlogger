
import { File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileListProps {
  files: File[];
  onRemove: (fileName: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export const FileList = ({ files, onRemove, onAnalyze, isAnalyzing }: FileListProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Selected Files</h2>
        <Button
          onClick={onAnalyze}
          disabled={files.length === 0 || isAnalyzing}
          className="ml-auto"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Files"}
        </Button>
      </div>
      
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.name}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-md group hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <File className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{file.name}</span>
            </div>
            <button
              onClick={() => onRemove(file.name)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-5 w-5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
