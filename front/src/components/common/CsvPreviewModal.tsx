import { useEffect, useState } from 'react';
import Sheet from '@/components/common/Sheet';
import '@/styles/components/common/csv-preview-modal.css';

interface CsvPreviewModalProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}

interface CsvData {
  headers: string[];
  rows: string[][];
}

export default function CsvPreviewModal({ open, onClose, fileUrl, fileName }: CsvPreviewModalProps) {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !fileUrl) {
      setCsvData(null);
      setError(null);
      return;
    }

    const loadCsvData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error('파일을 불러올 수 없습니다.');
        }

        const text = await response.text();
        const parsed = parseCsv(text);
        setCsvData(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : '파일을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCsvData();
  }, [open, fileUrl]);

  const parseCsv = (text: string): CsvData => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    // CSV 파싱 (쉼표로 구분, 따옴표 처리)
    const parseRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // 연속된 따옴표는 하나의 따옴표로 처리
            current += '"';
            i++;
          } else {
            // 따옴표 토글
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // 쉼표이고 따옴표 밖이면 필드 구분
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(parseRow);

    return { headers, rows };
  };

  const handleDownload = () => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Sheet open={open} onClose={onClose} variant="modal" ariaLabel="CSV 미리보기">
      <div className="csv-preview-modal">
        <div className="csv-preview-modal__header">
          <h2 className="csv-preview-modal__title">{fileName}</h2>
          <div className="csv-preview-modal__actions">
            <button className="csv-preview-modal__download-btn" onClick={handleDownload}>
              다운로드
            </button>
            <button className="csv-preview-modal__close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="csv-preview-modal__body">
          {isLoading && <div className="csv-preview-modal__loading">불러오는 중...</div>}

          {error && <div className="csv-preview-modal__error">{error}</div>}

          {csvData && !isLoading && !error && (
            <div className="csv-preview-modal__table-wrapper">
              <table className="csv-preview-modal__table">
                <thead>
                  <tr>
                    {csvData.headers.map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvData.rows.length === 0 && (
                <div className="csv-preview-modal__empty">데이터가 없습니다.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
