'use client';

import React, { useState } from 'react';
import { Copy, Check, Download, FileCode } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language: 'typescript' | 'diff';
  title?: string;
  fileName?: string;
  maxHeight?: string;
  showDownload?: boolean;
}

export function CodeViewer({
  code,
  language,
  title,
  fileName,
  maxHeight = 'max-h-[420px]',
  showDownload = true,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownload = () => {
    const defaultName = language === 'diff' ? 'patch.diff' : 'repro.spec.ts';
    const name = fileName || defaultName;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lines = code.split('\n');

  // Syntax highlighter for TypeScript/JavaScript
  const renderTsLine = (line: string) => {
    // Basic regex tokenization for clean highlighting
    const commentIdx = line.indexOf('//');
    if (commentIdx !== -1) {
      const before = line.slice(0, commentIdx);
      const comment = line.slice(commentIdx);
      return (
        <>
          {renderTsTokens(before)}
          <span className="text-slate-500 italic">{comment}</span>
        </>
      );
    }
    return renderTsTokens(line);
  };

  const renderTsTokens = (text: string) => {
    // Tokenize strings, keywords, numbers, methods
    const tokens = text.split(/(".*?"|'.*?'|`.*?`|\b(?:import|export|from|as|test|expect|describe|async|await|const|let|var|function|return|if|else|try|catch|throw|new|null|undefined|true|false|void|for|while|of|in)\b|\b\d+\b)/g);

    return tokens.map((token, i) => {
      if (!token) return null;
      if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
        return <span key={i} className="text-emerald-300">{token}</span>;
      }
      if (/^(import|export|from|as|test|expect|describe|async|await|const|let|var|function|return|if|else|try|catch|throw|new|null|undefined|true|false|void|for|while|of|in)$/.test(token)) {
        return <span key={i} className="text-indigo-300 font-semibold">{token}</span>;
      }
      if (/^\d+$/.test(token)) {
        return <span key={i} className="text-amber-300">{token}</span>;
      }
      return <span key={i} className="text-slate-200">{token}</span>;
    });
  };

  // Diff line renderer
  const renderDiffLine = (line: string, index: number) => {
    let lineClass = 'text-slate-300 hover:bg-slate-900/60';
    let prefix = ' ';
    let gutterBg = 'text-slate-600 bg-slate-950/80';

    if (line.startsWith('+') && !line.startsWith('+++')) {
      lineClass = 'text-emerald-300 bg-emerald-950/30 border-l-2 border-emerald-500 font-medium';
      gutterBg = 'text-emerald-400 bg-emerald-950/50';
      prefix = '+';
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      lineClass = 'text-rose-300 bg-rose-950/30 border-l-2 border-rose-500 font-medium';
      gutterBg = 'text-rose-400 bg-rose-950/50';
      prefix = '-';
    } else if (line.startsWith('@@')) {
      lineClass = 'text-sky-400 bg-sky-950/30 font-semibold';
      gutterBg = 'text-sky-400 bg-sky-950/50';
      prefix = '@';
    } else if (line.startsWith('---') || line.startsWith('+++')) {
      lineClass = 'text-slate-400 font-bold bg-slate-900/40';
      prefix = '#';
    }

    return (
      <div key={index} className={`flex text-xs leading-5 font-mono group ${lineClass}`}>
        <span className={`w-10 flex-shrink-0 select-none text-right pr-2.5 py-0.5 border-r border-slate-800/80 font-mono text-[11px] ${gutterBg}`}>
          {index + 1}
        </span>
        <span className="w-5 flex-shrink-0 select-none text-center py-0.5 font-bold opacity-60">
          {prefix !== ' ' ? prefix : ''}
        </span>
        <span className="flex-1 py-0.5 pr-4 whitespace-pre overflow-x-auto">
          {line.startsWith('+') || line.startsWith('-') ? line.substring(1) : line}
        </span>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b0f19] overflow-hidden shadow-xl shadow-black/40">
      {/* Header bar */}
      <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-slate-300 font-mono">
            {fileName || (language === 'diff' ? 'git-patch.diff' : 'reproduction.spec.ts')}
          </span>
          {title && (
            <span className="text-[10px] text-slate-500 hidden sm:inline-block">
              • {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {showDownload && (
            <button
              onClick={handleDownload}
              className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition flex items-center gap-1"
              title="Download file"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>Download</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`px-2.5 py-1 text-[11px] rounded border transition flex items-center gap-1 ${
              copied
                ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className={`overflow-auto font-mono text-xs ${maxHeight} custom-scrollbar bg-[#080c16]`}>
        {language === 'diff' ? (
          <div className="divide-y divide-transparent">
            {lines.map((line, idx) => renderDiffLine(line, idx))}
          </div>
        ) : (
          <div className="p-3">
            {lines.map((line, idx) => (
              <div key={idx} className="flex text-xs leading-5 hover:bg-slate-900/40 rounded px-1">
                <span className="w-9 flex-shrink-0 select-none text-right pr-3 text-slate-600 font-mono text-[11px]">
                  {idx + 1}
                </span>
                <span className="flex-1 whitespace-pre overflow-x-auto">
                  {renderTsLine(line)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
