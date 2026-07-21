"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { uploadEvidenceAction } from "@/lib/actions";
import { FileUp, Loader2 } from "lucide-react";
import type { ControlStatusRow } from "@/lib/types";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [".pdf", ".png", ".jpg", ".jpeg", ".docx"];

interface UploadEvidenceProps {
  control: ControlStatusRow;
  onSuccess: () => void;
}

export function UploadEvidence({ control, onSuccess }: UploadEvidenceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_SIZE) {
      setError("File too large. Max 10MB.");
      return;
    }

    const ext = "." + selected.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      setError("Unsupported file type. Use PDF, PNG, JPG, or DOCX.");
      return;
    }

    setError(null);
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("control_id", control.control_id);

      const result = await uploadEvidenceAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-neutral-50 p-4">
        <p className="text-sm text-neutral-600">{control.title}</p>
        <p className="mt-1 text-xs text-neutral-400">{control.code} · {control.category}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700">
          Evidence File
        </label>
        <div
          className="mt-1 cursor-pointer rounded-lg border-2 border-dashed border-neutral-300 p-8 text-center hover:border-neutral-400"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div className="flex flex-col items-center gap-1">
              <FileUp className="h-8 w-8 text-green-600" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-neutral-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <FileUp className="h-8 w-8 text-neutral-400" />
              <span className="text-sm text-neutral-500">
                Click to select a file
              </span>
              <span className="text-xs text-neutral-400">
                PDF, PNG, JPG, DOCX · Max 10MB
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </>
          ) : (
            "Upload Evidence"
          )}
        </Button>
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
      </div>

      <p className="text-xs text-neutral-400">
        After upload, Claude will analyze the file and propose which SOC2 controls
        it satisfies. An admin must review and accept before the control turns green.
      </p>
    </div>
  );
}